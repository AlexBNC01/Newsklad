# 🏗️ Архитектура системы на Timeweb Cloud

## 📊 Общий обзор

Система склада запчастей развернута на российских серверах Timeweb Cloud с полной поддержкой многопользовательской работы, авторизации и синхронизации в реальном времени.

## 🔧 Технологический стек

### Backend (API сервер)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **База данных**: PostgreSQL 15
- **ORM**: Knex.js (Query Builder)
- **Авторизация**: JWT токены + Refresh tokens
- **Файловое хранилище**: S3-совместимое (Timeweb Cloud)
- **Обработка изображений**: Sharp
- **Кэширование**: Redis (опционально)
- **Процесс-менеджер**: PM2

### Frontend (Mobile App)
- **Framework**: React Native (Expo)
- **Навигация**: React Navigation
- **Состояние**: React Context + Hooks
- **HTTP клиент**: Fetch API с автоматическим обновлением токенов
- **Локальное хранилище**: AsyncStorage
- **UI компоненты**: Кастомные компоненты с поддержкой темной темы

### Инфраструктура
- **Сервер**: VPS на Timeweb Cloud (Ubuntu 22.04)
- **Прокси**: Nginx с SSL сертификатами Let's Encrypt
- **DNS**: Домен .ru или .рф
- **Мониторинг**: PM2 + системные логи

## 🗄️ Структура базы данных

### Основные таблицы

```sql
-- Компании
companies
├── id (uuid)
├── name (string)
├── settings (jsonb)
├── subscription (jsonb)
└── timestamps

-- Пользователи
users
├── id (uuid)
├── email (unique)
├── password_hash
├── full_name
├── company_id (fk)
├── role (admin/manager/worker)
├── permissions (jsonb)
└── timestamps

-- Запчасти
parts
├── id (uuid)
├── company_id (fk)
├── name, article, type
├── quantity, price
├── container_id (fk)
├── photos (jsonb)
└── timestamps

-- Техника
equipment
├── id (uuid)
├── company_id (fk)
├── type, model, serial_number
├── status, engine_hours, mileage
├── photos (jsonb)
└── timestamps

-- Транзакции (операции)
transactions
├── id (uuid)
├── company_id (fk)
├── type (arrival/expense)
├── part_id (fk)
├── quantity
├── user_id (fk)
└── timestamps

-- Ремонты
repairs
├── id (uuid)
├── company_id (fk)
├── equipment_id (fk)
├── status, start_date, end_date
├── total_cost, labor_cost
└── timestamps

-- Файлы
files
├── id (uuid)
├── company_id (fk)
├── s3_key, public_url
├── file_type, file_size
├── thumbnail_url
└── timestamps
```

## 🔐 Система безопасности

### Авторизация и аутентификация
- **JWT Access Token**: 15 минут жизни
- **Refresh Token**: 7 дней жизни, хранится в БД
- **Автоматическое обновление**: токены обновляются прозрачно
- **Хэширование паролей**: bcryptjs с 12 раундами

### Роли и разрешения
```javascript
// Роли
admin     - полный доступ ко всем функциям
manager   - управление операциями, просмотр отчетов
worker    - базовые операции со складом

// Разрешения (permissions)
can_manage_users      - управление пользователями
can_manage_equipment  - управление техникой
can_manage_inventory  - управление складом
can_view_reports      - просмотр отчетов
can_export_data       - экспорт данных
```

### Безопасность данных
- **Изоляция данных**: каждая компания видит только свои данные
- **SQL инъекции**: защита через параметризованные запросы
- **Rate limiting**: ограничение количества запросов
- **CORS**: настроенные политики для российских доменов
- **Helmet.js**: заголовки безопасности

## 📡 API архитектура

### RESTful эндпоинты
```
/api/auth           - авторизация
├── POST /login     - вход
├── POST /register  - регистрация
├── POST /refresh   - обновление токена
└── POST /logout    - выход

/api/parts          - управление запчастями
├── GET /           - список запчастей
├── POST /          - создание запчасти
├── GET /:id        - получение запчасти
├── PATCH /:id      - обновление запчасти
└── DELETE /:id     - удаление запчасти

/api/equipment      - управление техникой
/api/transactions   - операции с запчастями
/api/repairs        - ремонтные работы
/api/containers     - контейнеры
/api/staff          - персонал
/api/upload         - загрузка файлов
/api/reports        - отчеты
```

### Формат ответов API
```javascript
// Успешный ответ
{
  "success": true,
  "data": { ... },
  "message": "Операция выполнена успешно"
}

// Ошибка
{
  "success": false,
  "error": "Описание ошибки",
  "code": "ERROR_CODE",
  "details": [ ... ]  // опционально
}
```

## 📱 Mobile App архитектура

### Структура проекта
```
src/
├── screens/        - экраны приложения
├── components/     - переиспользуемые компоненты
├── context/        - React Context (состояние)
├── config/         - конфигурации (API, константы)
├── navigation/     - навигация
└── styles/         - стили и темы
```

### Управление состоянием
```javascript
// AuthContext - авторизация
- user, company
- login, logout, register
- hasPermission, hasRole

// DataContext - данные
- parts, equipment, transactions
- CRUD операции
- локальное кэширование
- синхронизация с API
```

### Offline поддержка
- **AsyncStorage**: локальное хранение данных
- **Optimistic Updates**: мгновенный отклик UI
- **Sync Queue**: очередь синхронизации при восстановлении сети
- **Conflict Resolution**: разрешение конфликтов данных

## 🔄 Синхронизация данных

### Стратегия синхронизации
1. **Local-first**: приоритет локальных данных
2. **Background sync**: синхронизация в фоне
3. **Conflict resolution**: автоматическое разрешение конфликтов
4. **Real-time updates**: WebSocket уведомления (планируется)

### Кэширование
```javascript
// Уровни кэширования
Level 1: AsyncStorage (постоянное хранение)
Level 2: Memory cache (быстрый доступ)
Level 3: API cache (HTTP кэширование)

// Стратегии обновления
- Cache-first: сначала кэш, затем сеть
- Network-first: сначала сеть, затем кэш
- Stale-while-revalidate: показать кэш, обновить в фоне
```

## 🚀 Развертывание и масштабирование

### Этапы развертывания
1. **Создание инфраструктуры** на Timeweb Cloud
2. **Настройка сервера** (Ubuntu + Node.js + Nginx)
3. **Развертывание API** через PM2
4. **Настройка БД** PostgreSQL + миграции
5. **Настройка файлового хранилища** S3-совместимое
6. **SSL сертификаты** через Let's Encrypt
7. **Мониторинг** и логирование

### Горизонтальное масштабирование
```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Nginx Proxy   │
│    (Timeweb)    │    │                 │
└─────────────────┘    └─────────────────┘
                                │
                       ┌────────┴────────┐
                       │                 │
              ┌─────────────┐    ┌─────────────┐
              │  API Server │    │  API Server │
              │    (PM2)    │    │    (PM2)    │
              └─────────────┘    └─────────────┘
                       │                 │
                       └─────────────────┘
                                │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (Master/Slave)│
                    └─────────────────┘
```

## 📊 Мониторинг и аналитика

### Системный мониторинг
- **PM2 Monit**: состояние процессов Node.js
- **Nginx logs**: логи веб-сервера
- **PostgreSQL logs**: логи базы данных
- **System metrics**: CPU, RAM, Disk, Network

### Мониторинг приложения
```javascript
// Метрики производительности
- API response time
- Database query time
- File upload speed
- User session duration

// Метрики бизнеса
- Active users count
- Parts transactions per day
- Popular equipment types
- Most used features
```

### Логирование
```javascript
// Уровни логов
ERROR   - критические ошибки
WARN    - предупреждения
INFO    - информационные сообщения
DEBUG   - отладочная информация

// Структура логов
{
  timestamp: "2025-01-21T10:30:00Z",
  level: "INFO",
  message: "User login successful",
  userId: "uuid",
  companyId: "uuid",
  ip: "192.168.1.1",
  userAgent: "...",
  requestId: "uuid"
}
```

## 💰 Стоимость эксплуатации

### Минимальная конфигурация (≤10 пользователей)
```
VPS (2 CPU, 2GB RAM)           790₽/мес
PostgreSQL (1 CPU, 1GB RAM)   590₽/мес
S3 Storage (10GB)               50₽/мес
Домен .ru                      350₽/год
────────────────────────────────────
Итого:                       1430₽/мес
```

### Средняя конфигурация (≤50 пользователей)
```
VPS (4 CPU, 4GB RAM)          1590₽/мес
PostgreSQL (2 CPU, 2GB RAM)  1190₽/мес
S3 Storage (50GB)              250₽/мес
────────────────────────────────────
Итого:                       3030₽/мес
```

### Крупная конфигурация (≤200 пользователей)
```
VPS (8 CPU, 8GB RAM)          2990₽/мес
PostgreSQL (4 CPU, 4GB RAM)  2390₽/мес
S3 Storage (200GB)            1000₽/мес
Load Balancer                  590₽/мес
────────────────────────────────────
Итого:                       6970₽/мес
```

## 🔮 Планы развития

### Ближайшие обновления
- [ ] **WebSocket уведомления** - real-time синхронизация
- [ ] **Push уведомления** - мобильные уведомления
- [ ] **Telegram Bot** - уведомления в мессенджере
- [ ] **API версионирование** - поддержка версий API
- [ ] **GraphQL endpoint** - гибкие запросы данных

### Долгосрочные планы
- [ ] **Мобильное приложение v2** - переписать на React Native CLI
- [ ] **Web приложение** - React.js админка
- [ ] **Интеграции** - 1С, SAP, Excel импорт/экспорт
- [ ] **BI аналитика** - дашборды и аналитика
- [ ] **Микросервисная архитектура** - разделение на сервисы

## 🆘 Решение проблем

### Частые проблемы и решения

**Проблема**: Медленные запросы к API
```bash
# Проверить индексы в БД
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('parts', 'equipment', 'transactions');

# Оптимизировать запросы
EXPLAIN ANALYZE SELECT ...;
```

**Проблема**: Высокое потребление памяти
```bash
# Масштабировать PM2 процессы
pm2 scale skladreact-api +2

# Увеличить лимит памяти
pm2 delete all
pm2 start ecosystem.config.js
```

**Проблема**: Проблемы с файлами
```bash
# Проверить S3 подключение
aws s3 ls s3://skladreact-files --endpoint-url=https://s3.timeweb.cloud

# Очистить неиспользуемые файлы
node scripts/cleanup-files.js
```

## 📞 Техническая поддержка

- **Документация**: [docs.timeweb.com](https://docs.timeweb.com)
- **Поддержка Timeweb**: 8 (800) 700-06-08
- **Email**: support@timeweb.com
- **Техчат**: Telegram @timeweb_support

---

**Система готова к эксплуатации!** 🚀

Полнофункциональное решение для управления складом запчастей с многопользовательской работой на российских серверах Timeweb Cloud.