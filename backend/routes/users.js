const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { requirePermission, requireRole } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Получение профиля текущего пользователя
router.get('/profile', async (req, res, next) => {
  try {
    const user = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.full_name',
        'users.role',
        'users.permissions',
        'users.avatar_url',
        'users.phone',
        'users.last_active_at',
        'users.created_at',
        'companies.name as company_name',
        'companies.settings as company_settings',
        'companies.subscription as company_subscription'
      )
      .leftJoin('companies', 'users.company_id', 'companies.id')
      .where('users.id', req.user.id)
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    next(error);
  }
});

// Обновление профиля пользователя
router.patch('/profile', [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Полное имя должно содержать минимум 2 символа'),
  body('phone')
    .optional()
    .isMobilePhone('ru-RU')
    .withMessage('Введите корректный номер телефона'),
  body('avatar_url')
    .optional()
    .isURL()
    .withMessage('Введите корректный URL аватара'),
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

    const { full_name, phone, avatar_url } = req.body;
    const updateData = {};

    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет данных для обновления'
      });
    }

    updateData.updated_at = db.fn.now();

    await db('users')
      .where('id', req.user.id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Профиль успешно обновлен'
    });

  } catch (error) {
    next(error);
  }
});

// Смена пароля
router.patch('/password', [
  body('current_password')
    .notEmpty()
    .withMessage('Текущий пароль обязателен'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('Новый пароль должен содержать минимум 6 символов'),
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

    const { current_password, new_password } = req.body;

    // Получаем текущий хэш пароля
    const user = await db('users')
      .select('password_hash')
      .where('id', req.user.id)
      .first();

    // Проверяем текущий пароль
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный текущий пароль'
      });
    }

    // Хешируем новый пароль
    const newPasswordHash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Обновляем пароль
    await db('users')
      .where('id', req.user.id)
      .update({
        password_hash: newPasswordHash,
        updated_at: db.fn.now(),
      });

    // Удаляем все refresh токены пользователя (принудительный логаут с других устройств)
    await db('refresh_tokens')
      .where('user_id', req.user.id)
      .del();

    res.json({
      success: true,
      message: 'Пароль успешно изменен. Необходимо войти заново.'
    });

  } catch (error) {
    next(error);
  }
});

// Получение списка пользователей компании (только для админов и менеджеров)
router.get('/company', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role = 'all', active = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = db('users')
      .select(
        'id',
        'email',
        'full_name',
        'role',
        'permissions',
        'is_active',
        'last_active_at',
        'created_at',
        'avatar_url',
        'phone'
      )
      .where('company_id', req.user.company_id);

    // Фильтр по роли
    if (role !== 'all') {
      query = query.where('role', role);
    }

    // Фильтр по статусу активности
    if (active !== 'all') {
      query = query.where('is_active', active === 'true');
    }

    // Получаем общее количество
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('id as count');
    const total = parseInt(count);

    // Получаем пользователей с пагинацией
    const users = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Приглашение нового пользователя (только для админов)
router.post('/invite', requireRole('admin'), [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Введите корректный email'),
  body('role')
    .isIn(['admin', 'manager', 'worker'])
    .withMessage('Недопустимая роль'),
  body('full_name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Полное имя должно содержать минимум 2 символа'),
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

    const { email, role, full_name } = req.body;

    // Проверяем лимит пользователей
    const company = await db('companies')
      .select('subscription')
      .where('id', req.user.company_id)
      .first();

    const userCount = await db('users')
      .count('id as count')
      .where('company_id', req.user.company_id)
      .where('is_active', true)
      .first();

    const currentUsers = parseInt(userCount.count);
    const usersLimit = company.subscription?.users_limit || 5;

    if (currentUsers >= usersLimit) {
      return res.status(403).json({
        success: false,
        error: `Достигнут лимит пользователей для вашего тарифа (${usersLimit})`
      });
    }

    // Проверяем, что пользователь с таким email еще не существует
    const existingUser = await db('users')
      .where('email', email)
      .first();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
    }

    // Генерируем временный пароль
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Устанавливаем разрешения по умолчанию в зависимости от роли
    let permissions = {};
    switch (role) {
      case 'admin':
        permissions = {
          can_manage_users: true,
          can_manage_equipment: true,
          can_manage_inventory: true,
          can_view_reports: true,
          can_export_data: true,
        };
        break;
      case 'manager':
        permissions = {
          can_manage_users: false,
          can_manage_equipment: true,
          can_manage_inventory: true,
          can_view_reports: true,
          can_export_data: true,
        };
        break;
      case 'worker':
        permissions = {
          can_manage_users: false,
          can_manage_equipment: false,
          can_manage_inventory: true,
          can_view_reports: false,
          can_export_data: false,
        };
        break;
    }

    // Создаем пользователя
    const [newUser] = await db('users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name,
        company_id: req.user.company_id,
        role,
        permissions,
        is_active: true,
      })
      .returning(['id', 'email', 'full_name', 'role', 'created_at']);

    // TODO: Отправить email с временным паролем
    console.log(`Временный пароль для ${email}: ${tempPassword}`);

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно приглашен',
      data: {
        user: newUser,
        temp_password: tempPassword, // В продакшене убрать!
      }
    });

  } catch (error) {
    next(error);
  }
});

// Обновление роли и разрешений пользователя (только для админов)
router.patch('/:userId/permissions', requireRole('admin'), [
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'worker'])
    .withMessage('Недопустимая роль'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Разрешения должны быть объектом'),
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

    const { userId } = req.params;
    const { role, permissions } = req.body;

    // Проверяем, что пользователь принадлежит той же компании
    const user = await db('users')
      .where('id', userId)
      .where('company_id', req.user.company_id)
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Нельзя изменять свои собственные права
    if (userId === req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Нельзя изменять собственные права доступа'
      });
    }

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет данных для обновления'
      });
    }

    updateData.updated_at = db.fn.now();

    await db('users')
      .where('id', userId)
      .update(updateData);

    res.json({
      success: true,
      message: 'Права пользователя успешно обновлены'
    });

  } catch (error) {
    next(error);
  }
});

// Деактивация пользователя (только для админов)
router.patch('/:userId/deactivate', requireRole('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Проверяем, что пользователь принадлежит той же компании
    const user = await db('users')
      .where('id', userId)
      .where('company_id', req.user.company_id)
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Нельзя деактивировать самого себя
    if (userId === req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Нельзя деактивировать собственный аккаунт'
      });
    }

    // Деактивируем пользователя
    await db('users')
      .where('id', userId)
      .update({
        is_active: false,
        updated_at: db.fn.now(),
      });

    // Удаляем все refresh токены пользователя
    await db('refresh_tokens')
      .where('user_id', userId)
      .del();

    res.json({
      success: true,
      message: 'Пользователь успешно деактивирован'
    });

  } catch (error) {
    next(error);
  }
});

// Активация пользователя (только для админов)
router.patch('/:userId/activate', requireRole('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Проверяем, что пользователь принадлежит той же компании
    const user = await db('users')
      .where('id', userId)
      .where('company_id', req.user.company_id)
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Активируем пользователя
    await db('users')
      .where('id', userId)
      .update({
        is_active: true,
        updated_at: db.fn.now(),
      });

    res.json({
      success: true,
      message: 'Пользователь успешно активирован'
    });

  } catch (error) {
    next(error);
  }
});

// Получение статистики пользователей (только для админов)
router.get('/stats', requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const stats = await db.raw(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
        COUNT(*) FILTER (WHERE role = 'manager') as manager_count,
        COUNT(*) FILTER (WHERE role = 'worker') as worker_count,
        COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '7 days') as active_last_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_month
      FROM users 
      WHERE company_id = ?
    `, [req.user.company_id]);

    res.json({
      success: true,
      data: stats.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;