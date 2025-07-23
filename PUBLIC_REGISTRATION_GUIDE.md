# 🌐 Публичная регистрация пользователей

## 🎯 Ваша система УЖЕ поддерживает публичную регистрацию!

Любой человек может скачать приложение из App Store и зарегистрироваться самостоятельно.

---

## 📋 Текущий процесс регистрации

### API Endpoint (уже работает):
```
POST /api/auth/register
Content-Type: application/json

{
  "company_name": "ИП Сидоров",
  "full_name": "Сидоров Петр Иванович", 
  "email": "sidorov@gmail.com",
  "password": "mypassword123"
}
```

### Что происходит при регистрации:

1. **Создается компания** с настройками по умолчанию
2. **Создается администратор** с полными правами
3. **Выдается trial подписка** на 30 дней:
   - До 5 пользователей
   - 1 ГБ файлового хранилища
   - Полный функционал

### Текущие настройки trial:
```javascript
subscription: {
  plan: 'trial',
  users_limit: 5,              // До 5 сотрудников
  storage_limit_gb: 1,         // 1 ГБ для фотографий
  expires_at: '+30 days'       // 30 дней бесплатно
}
```

---

## 🚀 Улучшения для лучшего UX

### 1. Подтверждение email (рекомендуется для App Store)

**Зачем нужно:**
- Apple требует подтверждение email для приложений
- Защита от фейковых регистраций
- Возможность восстановления пароля

**Как реализовать:**

#### Обновленный API регистрации:
```javascript
// В /backend/routes/auth.js
router.post('/register', [...], async (req, res, next) => {
  try {
    // ... существующая валидация ...

    // Начинаем транзакцию
    const result = await db.transaction(async (trx) => {
      // Создаем компанию
      const [company] = await trx('companies').insert({
        name: company_name,
        settings: { /* ... */ },
        subscription: { /* ... */ }
      }).returning('*');

      // Создаем пользователя (НЕ активного до подтверждения email)
      const [user] = await trx('users').insert({
        email,
        password_hash: hashedPassword,
        full_name,
        company_id: company.id,
        role: 'admin',
        permissions: { /* все права */ },
        is_active: false,           // ❗ НЕ активен до подтверждения
        email_verified: false      // ❗ Email не подтвержден
      }).returning('*');

      // Генерируем код подтверждения
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Сохраняем код в таблицу email_verifications
      await trx('email_verifications').insert({
        user_id: user.id,
        code: verificationCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 минут
      });

      // Отправляем email с кодом
      await sendVerificationEmail(email, verificationCode, full_name);

      return { user, company };
    });

    res.status(201).json({
      success: true,
      message: 'Регистрация почти завершена! Проверьте почту и введите код подтверждения.',
      data: {
        user_id: result.user.id,
        email: result.user.email,
        verification_required: true
      }
    });

  } catch (error) {
    next(error);
  }
});

// Новый endpoint для подтверждения email
router.post('/verify-email', [
  body('user_id').isUUID().withMessage('Некорректный ID пользователя'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Код должен содержать 6 символов'),
], async (req, res, next) => {
  try {
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

    // Активируем пользователя
    await db.transaction(async (trx) => {
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
    });

    // Генерируем токены для входа
    const { accessToken, refreshToken } = generateTokens(user_id);
    
    // Сохраняем refresh token
    await db('refresh_tokens').insert({
      user_id: user_id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Получаем полную информацию о пользователе
    const user = await db('users')
      .select('users.*', 'companies.name as company_name')
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
            name: user.company_name
          }
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 900
        }
      }
    });

  } catch (error) {
    next(error);
  }
});
```

#### Миграция для email верификации:
```javascript
// migrations/015_create_email_verifications.js
exports.up = function(knex) {
  return knex.schema.createTable('email_verifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('code', 6).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);

    table.index(['user_id', 'code']);
    table.index('expires_at');
  });
};
```

#### Email отправка:
```javascript
// config/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (email, code, fullName) => {
  const mailOptions = {
    from: `"Skladreact App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 Подтверждение регистрации в Skladreact',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Добро пожаловать в Skladreact! 🎉</h2>
        
        <p>Привет, <strong>${fullName}</strong>!</p>
        
        <p>Спасибо за регистрацию в нашем приложении для управления складом. 
        Для завершения регистрации введите код подтверждения:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #2196F3; 
                       background: #f5f5f5; padding: 15px 25px; border-radius: 8px;">
            ${code}
          </span>
        </div>
        
        <p style="color: #666;">Код действителен в течение 15 минут.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <h3>🎁 Ваш trial период:</h3>
        <ul>
          <li>✅ 30 дней полного доступа</li>
          <li>✅ До 5 пользователей</li>
          <li>✅ 1 ГБ файлового хранилища</li>
          <li>✅ Все функции без ограничений</li>
        </ul>
        
        <p style="color: #666; font-size: 12px;">
          Если вы не регистрировались в Skladreact, просто проигнорируйте это письмо.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };
```

### 2. Улучшенный UI регистрации

```javascript
// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 - регистрация, 2 - подтверждение email
  const [formData, setFormData] = useState({
    company_name: '',
    full_name: '',
    email: '',
    password: '',
  });
  const [verificationData, setVerificationData] = useState({
    user_id: '',
    code: ''
  });
  const [loading, setLoading] = useState(false);
  const { register, verifyEmail } = useAuth();

  const handleRegister = async () => {
    setLoading(true);
    const result = await register(formData);
    setLoading(false);

    if (result.success) {
      if (result.data.verification_required) {
        // Нужно подтверждение email
        setVerificationData({ user_id: result.data.user_id, code: '' });
        setStep(2);
        Alert.alert(
          'Проверьте почту! 📧', 
          `Мы отправили код подтверждения на ${result.data.email}`
        );
      } else {
        // Сразу вход (если подтверждение email отключено)
        navigation.replace('Main');
      }
    } else {
      Alert.alert('Ошибка регистрации', result.error);
    }
  };

  const handleVerifyEmail = async () => {
    setLoading(true);
    const result = await verifyEmail(verificationData);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Добро пожаловать! 🎉', 
        'Email подтвержден! У вас 30 дней бесплатного доступа.',
        [{ text: 'Начать работу', onPress: () => navigation.replace('Main') }]
      );
    } else {
      Alert.alert('Ошибка', result.error);
    }
  };

  if (step === 2) {
    // Шаг 2: Подтверждение email
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Подтверждение email 📧</Text>
        
        <Text style={styles.subtitle}>
          Мы отправили код подтверждения на вашу почту
        </Text>
        
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="Введите код (6 цифр)"
          value={verificationData.code}
          onChangeText={(text) => setVerificationData({...verificationData, code: text})}
          keyboardType="number-pad"
          maxLength={6}
          autoCapitalize="characters"
        />
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyEmail}
          disabled={loading || verificationData.code.length !== 6}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Проверяем...' : 'Подтвердить email'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setStep(1)}>
          <Text style={styles.linkText}>← Назад к регистрации</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Шаг 1: Регистрация
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Создайте свою компанию 🏢</Text>
      <Text style={styles.subtitle}>
        30 дней бесплатно • До 5 пользователей • Все функции
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Название компании *"
        value={formData.company_name}
        onChangeText={(text) => setFormData({...formData, company_name: text})}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Ваше ФИО *"
        value={formData.full_name}
        onChangeText={(text) => setFormData({...formData, full_name: text})}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email *"
        value={formData.email}
        onChangeText={(text) => setFormData({...formData, email: text})}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Пароль (минимум 6 символов) *"
        value={formData.password}
        onChangeText={(text) => setFormData({...formData, password: text})}
        secureTextEntry
      />
      
      <Text style={styles.agreementText}>
        Регистрируясь, вы соглашаетесь с{' '}
        <Text style={styles.linkText}>условиями использования</Text>
      </Text>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Создаем компанию...' : 'Создать компанию бесплатно'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Уже есть аккаунт? Войти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#2196F3',
    textAlign: 'center',
    fontSize: 16,
  },
  agreementText: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontSize: 14,
  },
});
```

### 3. Onboarding для новых пользователей

```javascript
// src/screens/OnboardingScreen.js
export default function OnboardingScreen({ navigation }) {
  const slides = [
    {
      title: '📦 Управление складом',
      description: 'Учет запчастей, контейнеры, штрих-коды, фотографии',
      image: require('../assets/onboarding1.png')
    },
    {
      title: '🔧 Ремонты и техника',
      description: 'Ведите историю ремонтов, назначайте персонал, считайте затраты',
      image: require('../assets/onboarding2.png')
    },
    {
      title: '📊 Отчеты и аналитика',
      description: 'Формируйте красивые PDF отчеты, экспортируйте данные',
      image: require('../assets/onboarding3.png')
    }
  ];

  return (
    <View style={styles.container}>
      {/* Карусель слайдов */}
      
      <TouchableOpacity 
        style={styles.startButton}
        onPress={() => navigation.replace('Main')}
      >
        <Text style={styles.startButtonText}>Начать работу 🚀</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 📊 Итоговая схема публичной регистрации

```
📱 App Store → Скачивание приложения
                    ↓
🏠 Welcome Screen → "Создать компанию бесплатно"
                    ↓
📝 Registration Form:
   • Название компании
   • ФИО администратора  
   • Email
   • Пароль
                    ↓
📧 Email Verification (опционально):
   • Отправка кода на почту
   • Ввод 6-значного кода
                    ↓
🎉 Success → Onboarding → Main App
             ↓
🎁 Trial период 30 дней:
   • 5 пользователей
   • 1 ГБ файлов
   • Все функции
```

## 🎯 Рекомендации для App Store:

1. **✅ Подтверждение email** - Apple это любит
2. **✅ Onboarding** - покажите возможности приложения
3. **✅ Trial период** - дайте попробовать бесплатно
4. **✅ Условия использования** - обязательны для App Store
5. **✅ Политика конфиденциальности** - обязательна

**Ваша система УЖЕ готова для публичной регистрации!** 🚀 Нужно только добавить подтверждение email и улучшить UX.