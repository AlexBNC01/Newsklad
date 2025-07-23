# 🏭 Skladreact API Server

REST API сервер для системы управления складом запчастей на Timeweb Cloud.

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- PostgreSQL 15+
- Redis (опционально)

### Установка

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/your-company/skladreact-api.git
cd skladreact-api
```

2. **Установите зависимости**
```bash
npm install
```

3. **Настройте переменные окружения**
```bash
cp .env.example .env
# Отредактируйте .env файл с вашими настройками
```

4. **Настройте базу данных**
```bash
# Создайте базу данных
createdb skladreact

# Запустите миграции
npm run migrate
```

5. **Запустите сервер**
```bash
# Разработка
npm run dev

# Продакшен
npm start
```

## 📡 API Endpoints

### Авторизация
- `POST /api/auth/register` - Регистрация компании
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `POST /api/auth/logout` - Выход

### Пользователи
- `GET /api/users/profile` - Профиль пользователя
- `PATCH /api/users/profile` - Обновление профиля
- `GET /api/users/company` - Пользователи компании
- `POST /api/users/invite` - Приглашение пользователя

### Запчасти
- `GET /api/parts` - Список запчастей
- `POST /api/parts` - Создание запчасти
- `GET /api/parts/:id` - Получение запчасти
- `PATCH /api/parts/:id` - Обновление запчасти
- `DELETE /api/parts/:id` - Удаление запчасти

### Техника
- `GET /api/equipment` - Список техники
- `POST /api/equipment` - Создание техники
- `GET /api/equipment/:id` - Получение техники
- `PATCH /api/equipment/:id` - Обновление техники
- `DELETE /api/equipment/:id` - Удаление техники

### Транзакции
- `GET /api/transactions` - История операций
- `POST /api/transactions` - Создание операции
- `POST /api/transactions/batch` - Массовые операции

### Ремонты
- `GET /api/repairs` - Список ремонтов
- `POST /api/repairs` - Создание ремонта
- `GET /api/repairs/:id` - Получение ремонта
- `PATCH /api/repairs/:id` - Обновление ремонта
- `POST /api/repairs/:id/parts` - Добавление запчасти к ремонту
- `POST /api/repairs/:id/staff` - Назначение персонала
- `POST /api/repairs/:id/complete` - Завершение ремонта

### Персонал
- `GET /api/staff` - Список персонала
- `POST /api/staff` - Добавление сотрудника
- `PATCH /api/staff/:id` - Обновление сотрудника
- `GET /api/staff/:id/workload` - Загруженность сотрудника

### Контейнеры
- `GET /api/containers` - Список контейнеров
- `POST /api/containers` - Создание контейнера
- `PATCH /api/containers/:id` - Обновление контейнера
- `POST /api/containers/:id/move-parts` - Перемещение запчастей

### Отчеты
- `POST /api/reports/generate` - Генерация отчета
- `GET /api/reports/history` - История отчетов
- `GET /api/reports/:id` - Получение отчета

### Файлы
- `POST /api/upload/signed-url` - Получение подписанного URL
- `POST /api/upload/direct` - Прямая загрузка
- `GET /api/upload` - Список файлов
- `DELETE /api/upload/:id` - Удаление файла

## 🔐 Авторизация

API использует JWT токены:
- **Access Token**: 15 минут жизни
- **Refresh Token**: 7 дней жизни

Все защищенные эндпоинты требуют заголовок:
```
Authorization: Bearer <access_token>
```

## 🗄️ База данных

### Основные таблицы
- `companies` - Компании
- `users` - Пользователи
- `parts` - Запчасти
- `equipment` - Техника
- `transactions` - Операции со складом
- `repairs` - Ремонты
- `staff` - Персонал
- `containers` - Контейнеры

### Миграции
```bash
# Применить миграции
npm run migrate

# Откат последней миграции
npm run rollback

# Создать новую миграцию
npx knex migrate:make migration_name
```

## 📁 Файловое хранилище

Используется S3-совместимое хранилище Timeweb Cloud:
- Автоматическое изменение размера изображений
- Генерация превью
- Подписанные URL для безопасной загрузки
- Автоматическая очистка неиспользуемых файлов

## 🏗️ Развертывание

### На Timeweb Cloud

1. **Создайте VPS сервер**
```bash
# Ubuntu 22.04, минимум 2GB RAM
```

2. **Установите зависимости**
```bash
# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# PostgreSQL 15
sudo apt install postgresql postgresql-contrib

# PM2
sudo npm install -g pm2
```

3. **Настройте базу данных**
```bash
sudo -u postgres createdb skladreact
sudo -u postgres createuser skladreact_user
```

4. **Разверните приложение**
```bash
git clone https://github.com/your-company/skladreact-api.git
cd skladreact-api
npm install
npm run migrate
```

5. **Настройте PM2**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

6. **Настройте Nginx**
```nginx
server {
    listen 80;
    server_name your-domain.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Мониторинг

```bash
# Статус приложения
pm2 status

# Логи
pm2 logs

# Перезапуск
pm2 restart skladreact-api

# Мониторинг ресурсов
pm2 monit
```

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тесты с наблюдением
npm run test:watch

# Покрытие кода
npm run test:coverage
```

## 📊 API Документация

После запуска сервера документация доступна по адресу:
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs.json`

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `NODE_ENV` | Окружение | development |
| `PORT` | Порт сервера | 3000 |
| `DB_HOST` | Хост БД | localhost |
| `DB_PORT` | Порт БД | 5432 |
| `JWT_SECRET` | Секрет для JWT | - |
| `S3_ENDPOINT` | S3 endpoint | - |

Полный список см. в `.env.example`.

### Rate Limiting

- **Общие запросы**: 100 req/15min
- **Авторизация**: 5 req/15min
- **Загрузка файлов**: 10 req/min

## 🚨 Troubleshooting

### Частые проблемы

**Ошибка подключения к БД**
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Проверить настройки подключения
psql -h localhost -p 5432 -U skladreact_user -d skladreact
```

**Проблемы с миграциями**
```bash
# Проверить статус миграций
npx knex migrate:status

# Откат и повторное применение
npm run rollback && npm run migrate
```

**Высокое потребление памяти**
```bash
# Перезапуск с ограничением памяти
pm2 delete skladreact-api
pm2 start ecosystem.config.js --env production
```

### Логирование

Логи доступны в:
- `./logs/combined.log` - все логи
- `./logs/error.log` - только ошибки
- `./logs/out.log` - stdout

## 📝 Changelog

### v1.0.0 (2025-01-21)
- Первый релиз
- Полная поддержка управления складом
- Интеграция с Timeweb Cloud
- JWT авторизация
- Система ролей и разрешений
- Файловое хранилище S3
- Отчетность

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл.

## 🤝 Поддержка

- Email: support@your-company.com
- Telegram: @your_support_bot
- Issues: GitHub Issues

---

Made with ❤️ for Timeweb Cloud 🇷🇺