const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/email');
const router = express.Router();

// Генерация JWT токенов
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE_TIME || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE_TIME || '7d' }
  );

  return { accessToken, refreshToken };
};

// Регистрация компании и администратора
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов'),
  body('full_name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Полное имя должно содержать минимум 2 символа'),
  body('company_name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Название компании должно содержать минимум 2 символа'),
], async (req, res, next) => {
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const { email, password, full_name, company_name } = req.body;

    // Проверка существования пользователя
    const existingUser = await db('users').where('email', email).first();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Пользователь с таким email уже существует',
        code: 'EMAIL_EXISTS'
      });
    }

    // Начинаем транзакцию
    const result = await db.transaction(async (trx) => {
      // Создаем компанию
      const [company] = await trx('companies')
        .insert({
          name: company_name,
          settings: {
            currency: 'RUB',
            timezone: 'Europe/Moscow',
            inventory_alerts: true,
            maintenance_alerts: true,
          },
          subscription: {
            plan: 'free',
            users_limit: null, // Неограниченно
            storage_limit_gb: null, // Неограниченно
            expires_at: null, // Бессрочно
          },
        })
        .returning('*');

      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

      // Создаем администратора компании
      const [user] = await trx('users')
        .insert({
          email,
          password_hash: hashedPassword,
          full_name,
          company_id: company.id,
          role: 'admin',
          permissions: {
            can_manage_users: true,
            can_manage_equipment: true,
            can_manage_inventory: true,
            can_view_reports: true,
            can_export_data: true,
          },
          is_active: false, // Не активен до подтверждения email
          email_verified: false,
        })
        .returning('*');

      // Генерируем код подтверждения
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Сохраняем код в таблицу email_verifications
      await trx('email_verifications').insert({
        user_id: user.id,
        code: verificationCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 минут
      });

      // Отправляем email с кодом
      try {
        await sendVerificationEmail(email, verificationCode, full_name);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Продолжаем выполнение - пользователь сможет запросить код повторно
      }

      return { user, company };
    });

    res.status(201).json({
      success: true,
      message: 'Регистрация почти завершена! Проверьте почту и введите код подтверждения.',
      data: {
        user_id: result.user.id,
        email: result.user.email,
        verification_required: true,
        company: {
          id: result.company.id,
          name: result.company.name,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Вход в систему
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Находим пользователя с компанией
    const user = await db('users')
      .select('users.*', 'companies.name as company_name', 'companies.settings as company_settings')
      .leftJoin('companies', 'users.company_id', 'companies.id')
      .where('users.email', email)
      .first();

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Аккаунт деактивирован. Обратитесь к администратору.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Генерируем токены
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Сохраняем refresh token в БД
    await db('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
    });

    // Обновляем время последней активности
    await db('users')
      .where('id', user.id)
      .update({ last_active_at: db.fn.now() });

    res.json({
      success: true,
      message: 'Авторизация успешна',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          permissions: user.permissions,
          company_id: user.company_id,
          company_name: user.company_name,
          company_settings: user.company_settings,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Обновление access token через refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token отсутствует',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Проверяем refresh token
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Недействительный refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Проверяем существование токена в БД
    const tokenRecord = await db('refresh_tokens')
      .where('user_id', decoded.userId)
      .where('token', refresh_token)
      .where('expires_at', '>', new Date())
      .first();

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token не найден или истек',
        code: 'REFRESH_TOKEN_NOT_FOUND'
      });
    }

    // Проверяем пользователя
    const user = await db('users')
      .where('id', decoded.userId)
      .where('is_active', true)
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден или деактивирован',
        code: 'USER_NOT_FOUND'
      });
    }

    // Генерируем новые токены
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    // Удаляем старый refresh token и добавляем новый
    await db.transaction(async (trx) => {
      await trx('refresh_tokens')
        .where('user_id', user.id)
        .where('token', refresh_token)
        .del();

      await trx('refresh_tokens').insert({
        user_id: user.id,
        token: newRefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    });

    res.json({
      success: true,
      data: {
        tokens: {
          access_token: accessToken,
          refresh_token: newRefreshToken,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Выход из системы
router.post('/logout', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      // Удаляем refresh token из БД
      await db('refresh_tokens')
        .where('token', refresh_token)
        .del();
    }

    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });

  } catch (error) {
    next(error);
  }
});

// Сброс пароля (отправка email)
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const { email } = req.body;

    const user = await db('users')
      .where('email', email)
      .where('is_active', true)
      .first();

    // Всегда возвращаем успех для безопасности (не раскрываем существование email)
    res.json({
      success: true,
      message: 'Если email существует, инструкции отправлены на почту'
    });

    if (user) {
      // TODO: Реализовать отправку email со ссылкой для сброса пароля
      console.log(`Запрос сброса пароля для пользователя: ${email}`);
    }

  } catch (error) {
    next(error);
  }
});

// Подтверждение email
router.post('/verify-email', [
  body('user_id')
    .isUUID()
    .withMessage('Некорректный ID пользователя'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Код должен содержать 6 символов'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const { user_id, code } = req.body;

    // Найдем код подтверждения
    const verification = await db('email_verifications')
      .where('user_id', user_id)
      .where('code', code)
      .where('expires_at', '>', new Date())
      .first();

    if (!verification) {
      return res.status(400).json({
        success: false,
        error: 'Неверный или истекший код подтверждения'
      });
    }

    // Активируем пользователя и генерируем токены
    const result = await db.transaction(async (trx) => {
      await trx('users')
        .where('id', user_id)
        .update({
          is_active: true,
          email_verified: true,
          updated_at: trx.fn.now()
        });

      // Удаляем использованный код
      await trx('email_verifications')
        .where('id', verification.id)
        .del();

      // Генерируем токены для входа
      const { accessToken, refreshToken } = generateTokens(user_id);
      
      // Сохраняем refresh token
      await trx('refresh_tokens').insert({
        user_id: user_id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return { accessToken, refreshToken };
    });

    // Получаем полную информацию о пользователе
    const user = await db('users')
      .select('users.*', 'companies.name as company_name', 'companies.settings as company_settings')
      .join('companies', 'users.company_id', 'companies.id')
      .where('users.id', user_id)
      .first();

    res.json({
      success: true,
      message: 'Email успешно подтвержден! Добро пожаловать!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          permissions: user.permissions,
          company: {
            id: user.company_id,
            name: user.company_name,
            settings: user.company_settings
          }
        },
        tokens: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_in: 900
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Повторная отправка кода подтверждения
router.post('/resend-verification', [
  body('user_id')
    .isUUID()
    .withMessage('Некорректный ID пользователя'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const { user_id } = req.body;

    // Найдем пользователя
    const user = await db('users')
      .where('id', user_id)
      .where('is_active', false)
      .where('email_verified', false)
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден или уже подтвержден'
      });
    }

    await db.transaction(async (trx) => {
      // Удаляем старые коды
      await trx('email_verifications')
        .where('user_id', user_id)
        .del();

      // Генерируем новый код
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Сохраняем новый код
      await trx('email_verifications').insert({
        user_id: user_id,
        code: verificationCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 минут
      });

      // Отправляем email с новым кодом
      try {
        await sendVerificationEmail(user.email, verificationCode, user.full_name);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        throw new Error('Не удалось отправить email. Попробуйте позже.');
      }
    });

    res.json({
      success: true,
      message: 'Новый код подтверждения отправлен на почту'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;