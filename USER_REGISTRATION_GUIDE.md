# 👤 Регистрация пользователей в системе

## 📋 Три способа регистрации пользователей

### 1. **Регистрация компании** - создание новой организации
### 2. **Приглашение администратором** - текущий способ
### 3. **Самостоятельная регистрация по коду** - новый способ

---

## 🔄 Текущий способ: Приглашение администратором

### Как это работает сейчас:

**Шаг 1: Администратор приглашает пользователя**
```
POST /api/users/invite
Authorization: Bearer <admin_token>

{
  "email": "worker@company.ru",
  "full_name": "Петров Иван",
  "role": "worker"
}
```

**Шаг 2: Система создает пользователя с временным паролем**
```javascript
// Генерируется случайный пароль
const tempPassword = Math.random().toString(36).slice(-8);
// Например: "k2x9m4p1"

// Создается пользователь с этим паролем
const [newUser] = await db('users').insert({
  email,
  password_hash: await bcrypt.hash(tempPassword, 12),
  full_name,
  company_id: req.user.company_id,  // Компания администратора
  role,
  permissions: getPermissionsByRole(role),
  is_active: true,
});

// В ответе возвращается временный пароль
return {
  user: newUser,
  temp_password: tempPassword  // "k2x9m4p1"
}
```

**Шаг 3: Администратор передает данные пользователю**
- Email: worker@company.ru  
- Временный пароль: k2x9m4p1

**Шаг 4: Пользователь входит и меняет пароль**
```
POST /api/auth/login
{
  "email": "worker@company.ru", 
  "password": "k2x9m4p1"
}

После входа:
PATCH /api/users/password  
{
  "current_password": "k2x9m4p1",
  "new_password": "myNewSecurePassword123"
}
```

### ❌ Проблемы текущего подхода:
- Администратор видит временный пароль пользователя
- Небезопасная передача пароля через WhatsApp/Telegram
- Пользователь может забыть сменить временный пароль

---

## ✅ Новый способ: Регистрация по коду приглашения

Добавим более безопасный способ регистрации!

### Архитектура решения:

**Новая таблица `invitation_codes`:**
```sql
CREATE TABLE invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  code VARCHAR(8) UNIQUE NOT NULL,        -- 8-символьный код
  email VARCHAR(255),                     -- Опционально - для конкретного email
  role VARCHAR(20) NOT NULL,              -- admin/manager/worker  
  max_uses INTEGER DEFAULT 1,             -- Сколько раз можно использовать
  used_count INTEGER DEFAULT 0,           -- Сколько раз использован
  expires_at TIMESTAMP,                   -- Срок действия
  created_by UUID REFERENCES users(id),   -- Кто создал
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Новые API endpoints:

#### 1. Создание кода приглашения (для админов/менеджеров)

```
POST /api/invitations/create
Authorization: Bearer <admin_token>

{
  "role": "worker",           // Роль для новых пользователей
  "email": "worker@mail.ru",  // Опционально - для конкретного email
  "expires_in_days": 7,       // Срок действия (по умолчанию 7 дней)  
  "max_uses": 1              // Сколько раз можно использовать
}

Ответ:
{
  "success": true,
  "data": {
    "code": "ABC123XY",       // 8-символьный код
    "expires_at": "2025-01-28T10:30:00Z",
    "role": "worker",
    "max_uses": 1,
    "share_link": "https://your-app.com/register?code=ABC123XY"
  }
}
```

#### 2. Проверка кода приглашения

```
GET /api/invitations/check/:code

Ответ:
{
  "success": true,
  "data": {
    "valid": true,
    "company_name": "ООО Ромашка",
    "role": "worker",  
    "email_required": "worker@mail.ru", // Если код для конкретного email
    "expires_at": "2025-01-28T10:30:00Z"
  }
}
```

#### 3. Регистрация по коду приглашения

```
POST /api/auth/register-by-code

{
  "invitation_code": "ABC123XY",
  "email": "worker@mail.ru",      
  "full_name": "Петров Иван Сергеевич",
  "password": "mySecurePassword123"
}

Ответ:
{
  "success": true,
  "message": "Пользователь успешно зарегистрирован",
  "data": {
    "user": {
      "id": "uuid",
      "email": "worker@mail.ru",
      "full_name": "Петров Иван Сергеевич", 
      "role": "worker",
      "company": {
        "id": "uuid",
        "name": "ООО Ромашка"
      }
    },
    "tokens": {
      "access_token": "...",
      "refresh_token": "..."
    }
  }
}
```

---

## 📝 Реализация новой системы приглашений

### Новый файл: `/backend/routes/invitations.js`

```javascript
const express = require('express');
const { body, validationResult } = require('express-validator');
const { requirePermission } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Генерация случайного 8-символьного кода
const generateInvitationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Создание кода приглашения
router.post('/create', requirePermission('can_manage_users'), [
  body('role')
    .isIn(['admin', 'manager', 'worker'])
    .withMessage('Недопустимая роль'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail(),
  body('expires_in_days')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Срок действия от 1 до 30 дней'),
  body('max_uses')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Максимум использований от 1 до 100'),
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

    const { role, email, expires_in_days = 7, max_uses = 1 } = req.body;

    // Проверяем лимит пользователей
    const company = await db('companies')
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
        error: `Достигнут лимит пользователей (${usersLimit})`
      });
    }

    // Если email указан - проверяем что он не занят
    if (email) {
      const existingUser = await db('users').where('email', email).first();
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Пользователь с таким email уже существует'
        });
      }
    }

    // Генерируем уникальный код
    let code;
    let attempts = 0;
    do {
      code = generateInvitationCode();
      const existing = await db('invitation_codes').where('code', code).first();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Не удалось сгенерировать уникальный код');
    }

    // Создаем код приглашения
    const expiresAt = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);
    
    const [invitation] = await db('invitation_codes')
      .insert({
        company_id: req.user.company_id,
        code,
        email,
        role,
        max_uses,
        expires_at: expiresAt,
        created_by: req.user.id,
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: 'Код приглашения создан',
      data: {
        code: invitation.code,
        expires_at: invitation.expires_at,
        role: invitation.role,
        email: invitation.email,
        max_uses: invitation.max_uses,
        share_link: `${process.env.APP_URL}/register?code=${invitation.code}`
      }
    });

  } catch (error) {
    next(error);
  }
});

// Проверка кода приглашения
router.get('/check/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const invitation = await db('invitation_codes')
      .select(
        'invitation_codes.*',
        'companies.name as company_name'
      )
      .join('companies', 'invitation_codes.company_id', 'companies.id')
      .where('invitation_codes.code', code)
      .where('invitation_codes.is_active', true)
      .where('invitation_codes.expires_at', '>', new Date())
      .where('invitation_codes.used_count', '<', db.raw('invitation_codes.max_uses'))
      .first();

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Код приглашения недействителен или истек'
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        company_name: invitation.company_name,
        role: invitation.role,
        email_required: invitation.email,
        expires_at: invitation.expires_at,
        uses_left: invitation.max_uses - invitation.used_count
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение всех кодов приглашения компании
router.get('/', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const invitations = await db('invitation_codes')
      .select(
        'invitation_codes.*',
        'users.full_name as created_by_name'
      )
      .leftJoin('users', 'invitation_codes.created_by', 'users.id')
      .where('invitation_codes.company_id', req.user.company_id)
      .orderBy('invitation_codes.created_at', 'desc');

    res.json({
      success: true,
      data: invitations
    });

  } catch (error) {
    next(error);
  }
});

// Деактивация кода приглашения
router.delete('/:code', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const { code } = req.params;

    const updated = await db('invitation_codes')
      .where('code', code)
      .where('company_id', req.user.company_id)
      .update({
        is_active: false,
        updated_at: db.fn.now()
      });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Код приглашения не найден'
      });
    }

    res.json({
      success: true,
      message: 'Код приглашения деактивирован'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Обновленный `/backend/routes/auth.js` - добавим регистрацию по коду

```javascript
// Добавим новый endpoint после существующего /register
router.post('/register-by-code', [
  body('invitation_code')
    .isLength({ min: 8, max: 8 })
    .withMessage('Некорректный код приглашения'),
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

    const { invitation_code, email, password, full_name } = req.body;

    // Найдем действующий код приглашения
    const invitation = await db('invitation_codes')
      .select('invitation_codes.*', 'companies.name as company_name')
      .join('companies', 'invitation_codes.company_id', 'companies.id')
      .where('invitation_codes.code', invitation_code)
      .where('invitation_codes.is_active', true)
      .where('invitation_codes.expires_at', '>', new Date())
      .where('invitation_codes.used_count', '<', db.raw('invitation_codes.max_uses'))
      .first();

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Код приглашения недействителен или истек'
      });
    }

    // Если код для конкретного email - проверяем совпадение
    if (invitation.email && invitation.email !== email) {
      return res.status(400).json({
        success: false,
        error: 'Этот код предназначен для другого email адреса'
      });
    }

    // Проверяем что email не занят
    const existingUser = await db('users').where('email', email).first();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
    }

    // Начинаем транзакцию
    const result = await db.transaction(async (trx) => {
      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

      // Устанавливаем разрешения по роли из приглашения
      let permissions = {};
      switch (invitation.role) {
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
      const [user] = await trx('users')
        .insert({
          email,
          password_hash: hashedPassword,
          full_name,
          company_id: invitation.company_id,
          role: invitation.role,
          permissions,
          is_active: true,
        })
        .returning('*');

      // Увеличиваем счетчик использований кода
      await trx('invitation_codes')
        .where('id', invitation.id)
        .update({
          used_count: invitation.used_count + 1,
          updated_at: trx.fn.now()
        });

      // Генерируем токены
      const { accessToken, refreshToken } = generateTokens(user.id);

      // Сохраняем refresh token
      await trx('refresh_tokens').insert({
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return { 
        user, 
        company_name: invitation.company_name,
        tokens: { accessToken, refreshToken }
      };
    });

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.full_name,
          role: result.user.role,
          permissions: result.user.permissions,
          company: {
            id: result.user.company_id,
            name: result.company_name
          }
        },
        tokens: {
          access_token: result.tokens.accessToken,
          refresh_token: result.tokens.refreshToken,
          expires_in: 900
        }
      }
    });

  } catch (error) {
    next(error);
  }
});
```

### Миграция для таблицы приглашений

```javascript
// /backend/migrations/014_create_invitation_codes.js
exports.up = function(knex) {
  return knex.schema.createTable('invitation_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('code', 8).unique().notNullable();
    table.string('email');
    table.string('role', 20).notNullable();
    table.integer('max_uses').defaultTo(1);
    table.integer('used_count').defaultTo(0);
    table.timestamp('expires_at');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index(['company_id', 'code']);
    table.index(['code', 'is_active', 'expires_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('invitation_codes');
};
```

---

## 📱 UI для новой системы регистрации

### Экран создания приглашений (для админов)

```javascript
// src/screens/InviteUserScreen.js
export default function InviteUserScreen() {
  const [method, setMethod] = useState('direct'); // 'direct' или 'code'
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'worker',
    expires_in_days: 7,
    max_uses: 1
  });

  const handleCreateInvitation = async () => {
    if (method === 'direct') {
      // Старый способ - прямое приглашение
      const result = await userAPI.inviteUser(formData);
    } else {
      // Новый способ - создание кода
      const result = await invitationAPI.createCode(formData);
      if (result.success) {
        // Показываем код и ссылку для отправки
        Alert.alert(
          'Код приглашения создан!',
          `Код: ${result.data.code}\n\nСсылка для отправки:\n${result.data.share_link}`,
          [
            { text: 'Скопировать код', onPress: () => Clipboard.setString(result.data.code) },
            { text: 'Поделиться ссылкой', onPress: () => Share.share({ url: result.data.share_link }) }
          ]
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Пригласить пользователя</Text>
      
      {/* Выбор способа приглашения */}
      <View style={styles.methodSelector}>
        <TouchableOpacity 
          style={[styles.methodButton, method === 'direct' && styles.methodButtonActive]}
          onPress={() => setMethod('direct')}
        >
          <Text>Прямое приглашение</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.methodButton, method === 'code' && styles.methodButtonActive]}
          onPress={() => setMethod('code')}
        >
          <Text>Код приглашения</Text>
        </TouchableOpacity>
      </View>

      {/* Форма */}
      {method === 'direct' ? (
        // Старая форма для прямого приглашения
        <>
          <TextInput
            placeholder="Email пользователя"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
          />
          <TextInput
            placeholder="ФИО пользователя"
            value={formData.full_name}
            onChangeText={(text) => setFormData({...formData, full_name: text})}
          />
        </>
      ) : (
        // Новая форма для кода приглашения
        <>
          <TextInput
            placeholder="Email (опционально - для конкретного пользователя)"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
          />
          <Text>Срок действия: {formData.expires_in_days} дней</Text>
          <Slider
            value={formData.expires_in_days}
            minimumValue={1}
            maximumValue={30}
            step={1}
            onValueChange={(value) => setFormData({...formData, expires_in_days: value})}
          />
        </>
      )}

      {/* Выбор роли */}
      <Picker
        selectedValue={formData.role}
        onValueChange={(value) => setFormData({...formData, role: value})}
      >
        <Picker.Item label="Работник" value="worker" />
        <Picker.Item label="Менеджер" value="manager" />
        <Picker.Item label="Администратор" value="admin" />
      </Picker>

      <Button
        title={method === 'direct' ? 'Пригласить напрямую' : 'Создать код приглашения'}
        onPress={handleCreateInvitation}
      />
    </View>
  );
}
```

### Экран регистрации по коду

```javascript
// src/screens/RegisterByCodeScreen.js
export default function RegisterByCodeScreen({ route, navigation }) {
  const [code, setCode] = useState(route.params?.code || '');
  const [invitation, setInvitation] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: ''
  });
  const { registerByCode } = useAuth();

  const checkInvitationCode = async (invitationCode) => {
    const result = await invitationAPI.checkCode(invitationCode);
    if (result.success && result.data.valid) {
      setInvitation(result.data);
      if (result.data.email_required) {
        setFormData(prev => ({ ...prev, email: result.data.email_required }));
      }
    } else {
      Alert.alert('Ошибка', 'Код приглашения недействителен или истек');
    }
  };

  const handleRegister = async () => {
    const result = await registerByCode({
      invitation_code: code,
      ...formData
    });

    if (result.success) {
      navigation.replace('Main');
    } else {
      Alert.alert('Ошибка', result.error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Регистрация по коду приглашения</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Код приглашения (8 символов)"
        value={code}
        onChangeText={setCode}
        onBlur={() => code && checkInvitationCode(code)}
        autoCapitalize="characters"
        maxLength={8}
      />

      {invitation && (
        <View style={styles.invitationInfo}>
          <Text>🏢 Компания: {invitation.company_name}</Text>
          <Text>👤 Роль: {invitation.role}</Text>
          <Text>⏰ Действителен до: {new Date(invitation.expires_at).toLocaleDateString()}</Text>
        </View>
      )}

      <TextInput
        placeholder="Ваш email"
        value={formData.email}
        onChangeText={(text) => setFormData({...formData, email: text})}
        editable={!invitation?.email_required}
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Ваше полное имя"
        value={formData.full_name}
        onChangeText={(text) => setFormData({...formData, full_name: text})}
      />

      <TextInput
        placeholder="Придумайте пароль (минимум 6 символов)"
        value={formData.password}
        onChangeText={(text) => setFormData({...formData, password: text})}
        secureTextEntry
      />

      <Button
        title="Зарегистрироваться"
        onPress={handleRegister}
        disabled={!invitation}
      />
    </View>
  );
}
```

---

## 🎯 Итоговая схема регистрации пользователей

```
┌─────────────────────────────────────────────────────────────────┐
│                    СПОСОБЫ РЕГИСТРАЦИИ                          │
└─────────────────────────────────────────────────────────────────┘

1️⃣ РЕГИСТРАЦИЯ КОМПАНИИ
   📱 App → POST /api/auth/register
   ✅ Создается: Компания + Первый администратор

2️⃣ ПРИГЛАШЕНИЕ АДМИНИСТРАТОРОМ (старый способ)
   👨‍💼 Админ → POST /api/users/invite → 🔑 Временный пароль
   📩 Админ передает данные пользователю
   👤 Пользователь → POST /api/auth/login → PATCH /api/users/password

3️⃣ КОД ПРИГЛАШЕНИЯ (новый способ)
   👨‍💼 Админ → POST /api/invitations/create → 📋 Код ABC123XY
   📱 Админ отправляет код/ссылку пользователю
   👤 Пользователь → POST /api/auth/register-by-code → ✅ Сразу вход

┌─────────────────────────────────────────────────────────────────┐
│                     ПРЕИМУЩЕСТВА НОВОГО ПОДХОДА                │
└─────────────────────────────────────────────────────────────────┘

✅ Безопасность: Админ не видит пароль пользователя
✅ Удобство: Пользователь сразу создает свой пароль  
✅ Гибкость: Код можно использовать несколько раз
✅ Контроль: Срок действия кода, деактивация
✅ UX: Ссылка вида your-app.com/register?code=ABC123XY
```

Теперь у вас есть **три способа** добавления пользователей в систему - выбирайте самый подходящий для вашего случая! 🚀