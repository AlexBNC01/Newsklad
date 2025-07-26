# 🚀 Деплой на Timeweb Cloud Apps

## ⚡ Быстрый деплой

### 1. Создание приложения:
- **Тип:** Node.js Express
- **Git URL:** ваш репозиторий
- **Команда сборки:** `npm run deploy:build`
- **Команда запуска:** `npm run deploy:start`

### 2. Обязательные переменные окружения:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db  # из PostgreSQL сервиса
DB_SSL=true
JWT_SECRET=your-long-random-secret-32-chars-minimum
JWT_REFRESH_SECRET=your-long-random-refresh-secret-32-chars
```

### 3. Создание PostgreSQL:
- **Сервисы** → **+ PostgreSQL**
- Скопировать CONNECTION_STRING
- Вставить в DATABASE_URL

### 4. Автоматическая настройка БД:
При первом деплое автоматически:
- ✅ Создадутся все таблицы
- ✅ Добавятся демо-данные
- ✅ Создастся демо-пользователь

### 5. Демо-доступ:
```
Email: demo@skladreact.ru
Пароль: demo123
```

## 🔧 API Endpoints:

- `GET /health` - проверка работоспособности
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - авторизация
- `GET /api/companies` - данные компании
- `GET /api/equipment` - оборудование
- `GET /api/parts` - запчасти

## ✅ Готово! 
Приложение автоматически настроится при деплое.