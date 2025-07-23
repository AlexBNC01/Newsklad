# 🚀 Полное руководство по развертыванию на Timeweb Cloud

## 📋 Оглавление

1. [Подготовка сервера](#1-подготовка-сервера)
2. [Настройка PostgreSQL](#2-настройка-postgresql)
3. [Настройка S3 хранилища](#3-настройка-s3-хранилища)
4. [Развертывание API](#4-развертывание-api)
5. [Настройка Nginx](#5-настройка-nginx)
6. [SSL сертификаты](#6-ssl-сертификаты)
7. [Мониторинг и логи](#7-мониторинг-и-логи)
8. [Автодеплой через Git](#8-автодеплой-через-git)
9. [Backup и восстановление](#9-backup-и-восстановление)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Подготовка сервера

### 1.1 Создание VPS на Timeweb Cloud

1. **Войдите в панель Timeweb Cloud**
   - Перейдите на https://timeweb.cloud/
   - Войдите в личный кабинет

2. **Создайте VPS сервер**
   ```
   Конфигурация:
   - OS: Ubuntu 22.04 LTS
   - CPU: 2 ядра (минимум)
   - RAM: 4GB (рекомендуется 8GB)
   - SSD: 50GB (минимум)
   - Регион: Россия
   ```

3. **Получите данные для подключения**
   - IP адрес сервера
   - Пароль root пользователя

### 1.2 Первоначальная настройка сервера

```bash
# Подключаемся к серверу
ssh root@your-server-ip

# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем необходимые пакеты
apt install -y curl wget git unzip build-essential software-properties-common

# Создаем пользователя для приложения
useradd -m -s /bin/bash skladreact
usermod -aG sudo skladreact

# Настраиваем SSH ключи (рекомендуется)
mkdir -p /home/skladreact/.ssh
# Скопируйте ваш публичный ключ в /home/skladreact/.ssh/authorized_keys
chown -R skladreact:skladreact /home/skladreact/.ssh
chmod 700 /home/skladreact/.ssh
chmod 600 /home/skladreact/.ssh/authorized_keys

# Переходим на пользователя skladreact
su - skladreact
```

### 1.3 Установка Node.js 18+

```bash
# Добавляем репозиторий NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Устанавливаем Node.js
sudo apt install -y nodejs

# Проверяем версии
node --version  # должно быть v18+
npm --version

# Устанавливаем PM2 глобально
sudo npm install -g pm2
```

---

## 2. Настройка PostgreSQL

### 2.1 Установка PostgreSQL 15

```bash
# Добавляем официальный репозиторий PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Устанавливаем PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15

# Запускаем и добавляем в автозагрузку
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.2 Настройка базы данных

```bash
# Переходим на пользователя postgres
sudo -u postgres psql

-- В PostgreSQL консоли создаем базу и пользователя:
CREATE DATABASE skladreact;
CREATE USER skladreact_user WITH PASSWORD 'ваш_надежный_пароль_здесь';
GRANT ALL PRIVILEGES ON DATABASE skladreact TO skladreact_user;
ALTER USER skladreact_user CREATEDB;

-- Выходим из PostgreSQL
\q
```

### 2.3 Настройка подключений

```bash
# Редактируем postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# Находим и изменяем:
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB

# Редактируем pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Добавляем строку для локального подключения:
local   skladreact    skladreact_user                     md5

# Перезапускаем PostgreSQL
sudo systemctl restart postgresql
```

---

## 3. Настройка S3 хранилища

### 3.1 Создание S3 bucket в Timeweb Cloud

1. **В панели Timeweb Cloud**
   - Перейдите в раздел "Объектное хранилище S3"
   - Нажмите "Создать bucket"
   
2. **Настройки bucket:**
   ```
   Имя: skladreact-files-production
   Регион: ru-1
   Права доступа: Приватный
   ```

3. **Создание ключей доступа**
   - Перейдите в "Управление доступом"
   - Создайте новый ключ доступа
   - Сохраните Access Key ID и Secret Access Key

### 3.2 Проверка S3 подключения

```bash
# Устанавливаем AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Настраиваем подключение к Timeweb S3
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set region ru-1

# Тестируем подключение
aws s3 ls --endpoint-url=https://s3.timeweb.cloud
```

---

## 4. Развертывание API

### 4.1 Клонирование репозитория

```bash
# Переходим в домашнюю директорию
cd /home/skladreact

# Клонируем репозиторий (замените на ваш URL)
git clone https://github.com/your-company/skladreact-api.git
cd skladreact-api/backend

# Устанавливаем зависимости
npm install --production
```

### 4.2 Настройка environment переменных

```bash
# Копируем пример конфигурации
cp .env.example .env

# Редактируем конфигурацию
nano .env
```

**Содержимое .env файла:**

```bash
# Базовые настройки
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.ru

# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skladreact
DB_USER=skladreact_user
DB_PASSWORD=ваш_надежный_пароль_здесь
DB_SSL=false

# JWT токены (ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ!)
JWT_SECRET=ваш_очень_длинный_и_случайный_секретный_ключ_для_jwt_токенов_минимум_64_символа
JWT_REFRESH_SECRET=ваш_очень_длинный_и_случайный_секретный_ключ_для_refresh_токенов_минимум_64_символа
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# bcrypt настройки
BCRYPT_ROUNDS=12

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# S3-совместимое хранилище Timeweb Cloud
S3_ENDPOINT=https://s3.timeweb.cloud
S3_REGION=ru-1
S3_ACCESS_KEY_ID=ваш_access_key_от_timeweb
S3_SECRET_ACCESS_KEY=ваш_secret_key_от_timeweb
S3_BUCKET_NAME=skladreact-files-production

# Безопасность
ALLOWED_ORIGINS=https://your-domain.ru,https://www.your-domain.ru

# Файлы
MAX_FILE_SIZE=50mb
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf

# Компания по умолчанию (для первой установки)
DEFAULT_COMPANY_NAME=Ваша Компания
DEFAULT_ADMIN_EMAIL=admin@your-domain.ru
DEFAULT_ADMIN_PASSWORD=temporary_admin_password_2025
```

### 4.3 Запуск миграций

```bash
# Применяем миграции базы данных
npm run migrate

# Проверяем что все миграции применились
npx knex migrate:status
```

### 4.4 Создание логов и запуск с PM2

```bash
# Создаем директорию для логов
mkdir -p logs

# Запускаем приложение через PM2
pm2 start ecosystem.config.js --env production

# Сохраняем конфигурацию PM2
pm2 save

# Настраиваем автозапуск PM2 при перезагрузке системы
pm2 startup
# Выполните команду которую покажет PM2

# Проверяем статус
pm2 status
pm2 logs
```

---

## 5. Настройка Nginx

### 5.1 Установка Nginx

```bash
# Устанавливаем Nginx
sudo apt install -y nginx

# Запускаем и добавляем в автозагрузку
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5.2 Настройка виртуального хоста

```bash
# Создаем конфигурацию сайта
sudo nano /etc/nginx/sites-available/skladreact
```

**Содержимое конфигурации:**

```nginx
# Ограничение скорости загрузки файлов
limit_req_zone $binary_remote_addr zone=upload:10m rate=10r/m;

# Основная конфигурация сервера
server {
    listen 80;
    server_name your-domain.ru www.your-domain.ru;

    # Размер загружаемых файлов
    client_max_body_size 50M;

    # Основное проксирование на Node.js API
    location / {
        # Ограничение скорости для загрузки файлов
        location /api/upload {
            limit_req zone=upload burst=5 nodelay;
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Увеличиваем таймауты для загрузки файлов
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Остальные API запросы
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket поддержка (для будущей real-time синхронизации)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Таймауты
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Статические файлы (если понадобятся)
    location /static {
        alias /home/skladreact/skladreact-api/public;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Логирование
    access_log /var/log/nginx/skladreact_access.log;
    error_log /var/log/nginx/skladreact_error.log;
}
```

### 5.3 Активация конфигурации

```bash
# Создаем символическую ссылку
sudo ln -s /etc/nginx/sites-available/skladreact /etc/nginx/sites-enabled/

# Удаляем default конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx
```

---

## 6. SSL сертификаты

### 6.1 Установка Certbot

```bash
# Устанавливаем Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Получение SSL сертификата

```bash
# ВАЖНО: Сначала настройте A-запись в DNS!
# your-domain.ru -> IP_вашего_сервера
# www.your-domain.ru -> IP_вашего_сервера

# Получаем сертификат
sudo certbot --nginx -d your-domain.ru -d www.your-domain.ru

# Настраиваем автообновление
sudo crontab -e

# Добавляем строку для автообновления (2 раза в день):
0 12,22 * * * /usr/bin/certbot renew --quiet
```

### 6.3 Проверка SSL

```bash
# Проверяем статус сертификата
sudo certbot certificates

# Тестируем обновление
sudo certbot renew --dry-run
```

---

## 7. Мониторинг и логи

### 7.1 Настройка логирования

```bash
# Создаем директорию для логов приложения
sudo mkdir -p /var/log/skladreact
sudo chown skladreact:skladreact /var/log/skladreact

# Настраиваем ротацию логов
sudo nano /etc/logrotate.d/skladreact
```

**Конфигурация logrotate:**

```bash
/home/skladreact/skladreact-api/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/skladreact_*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        systemctl reload nginx
    endscript
}
```

### 7.2 Мониторинг с PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов в реальном времени
pm2 logs skladreact-api

# Мониторинг ресурсов
pm2 monit

# Перезапуск приложения
pm2 restart skladreact-api

# Перезагрузка конфигурации
pm2 reload skladreact-api
```

### 7.3 Системный мониторинг

```bash
# Установка htop для мониторинга ресурсов
sudo apt install -y htop

# Мониторинг дискового пространства
df -h

# Мониторинг памяти
free -h

# Мониторинг PostgreSQL
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

---

## 8. Автодеплой через Git

### 8.1 Создание deploy скрипта

```bash
# Создаем скрипт для автодеплоя
nano /home/skladreact/deploy.sh
```

**Содержимое deploy.sh:**

```bash
#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Начинаем развертывание Skladreact API...${NC}"

# Переходим в директорию проекта
cd /home/skladreact/skladreact-api/backend

# Создаем backup базы данных
echo -e "${YELLOW}📦 Создаем backup базы данных...${NC}"
sudo -u postgres pg_dump skladreact > /home/skladreact/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Получаем изменения из Git
echo -e "${YELLOW}📥 Получаем изменения из Git...${NC}"
git pull origin main

# Устанавливаем/обновляем зависимости
echo -e "${YELLOW}📦 Обновляем зависимости...${NC}"
npm install --production

# Применяем миграции базы данных
echo -e "${YELLOW}🗄️  Применяем миграции базы данных...${NC}"
npm run migrate

# Перезапускаем приложение через PM2
echo -e "${YELLOW}🔄 Перезапускаем приложение...${NC}"
pm2 reload ecosystem.config.js --env production

# Ждем пока приложение запустится
sleep 5

# Проверяем что приложение работает
echo -e "${YELLOW}🏥 Проверяем health check...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ Развертывание успешно завершено!${NC}"
    echo -e "${GREEN}🌐 Приложение доступно по адресу: https://your-domain.ru${NC}"
else
    echo -e "${RED}❌ Ошибка! Приложение не отвечает на health check${NC}"
    echo -e "${YELLOW}📋 Логи PM2:${NC}"
    pm2 logs skladreact-api --lines 10
    exit 1
fi

# Очищаем старые backups (оставляем только последние 7)
echo -e "${YELLOW}🧹 Очищаем старые backups...${NC}"
find /home/skladreact/backups -name "db_backup_*.sql" -mtime +7 -delete

echo -e "${GREEN}🎉 Развертывание завершено успешно!${NC}"
```

### 8.2 Настройка автодеплоя

```bash
# Делаем скрипт исполняемым
chmod +x /home/skladreact/deploy.sh

# Создаем директорию для backups
mkdir -p /home/skladreact/backups

# Создаем Git hook для автодеплоя (опционально)
# В вашем Git репозитории можно настроить webhook на https://your-domain.ru/api/deploy
```

### 8.3 Ручной деплой

```bash
# Запуск деплоя вручную
./home/skladreact/deploy.sh
```

---

## 9. Backup и восстановление

### 9.1 Настройка автоматических backup

```bash
# Создаем скрипт backup
nano /home/skladreact/backup.sh
```

**Содержимое backup.sh:**

```bash
#!/bin/bash

BACKUP_DIR="/home/skladreact/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Создаем backup базы данных
echo "Creating database backup..."
sudo -u postgres pg_dump skladreact | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Создаем backup файлов конфигурации
echo "Creating config backup..."
tar -czf "$BACKUP_DIR/config_backup_$DATE.tar.gz" \
    /home/skladreact/skladreact-api/backend/.env \
    /etc/nginx/sites-available/skladreact \
    /home/skladreact/skladreact-api/backend/ecosystem.config.js

# Синхронизируем с S3 (если настроено)
# aws s3 sync $BACKUP_DIR s3://skladreact-backups/ --endpoint-url=https://s3.timeweb.cloud

# Удаляем backup старше 30 дней
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 9.2 Настройка cron для backup

```bash
# Делаем скрипт исполняемым
chmod +x /home/skladreact/backup.sh

# Добавляем в crontab
crontab -e

# Добавляем строку для backup каждый день в 3:00
0 3 * * * /home/skladreact/backup.sh >> /var/log/skladreact/backup.log 2>&1
```

### 9.3 Восстановление из backup

```bash
# Восстановление базы данных
gunzip -c /home/skladreact/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql skladreact

# Восстановление конфигурации
tar -xzf /home/skladreact/backups/config_backup_YYYYMMDD_HHMMSS.tar.gz -C /

# Перезапуск сервисов
sudo systemctl restart nginx
pm2 restart skladreact-api
```

---

## 10. Real-time синхронизация (WebSockets)

### 10.1 Добавление Socket.io к проекту

```bash
# В директории backend
cd /home/skladreact/skladreact-api/backend
npm install socket.io socket.io-client
```

### 10.2 Обновление server.js

```bash
nano server.js
```

**Добавьте в server.js после создания app:**

```javascript
// После создания app, добавляем Socket.io
const { createServer } = require('http');
const { Server } = require('socket.io');

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:19006'],
    credentials: true,
  },
});

// Middleware для аутентификации WebSocket соединений
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db('users')
      .where('id', decoded.userId)
      .where('is_active', true)
      .first();

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user.id;
    socket.companyId = user.company_id;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// WebSocket события
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected from company ${socket.companyId}`);
  
  // Присоединяем к комнате компании
  socket.join(`company_${socket.companyId}`);
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Экспортируем io для использования в роутах
app.set('socketio', io);

// Изменяем запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
```

### 10.3 Добавление real-time уведомлений в роуты

**Пример для routes/transactions.js:**

```javascript
// После создания транзакции, добавляем:
const io = req.app.get('socketio');
if (io) {
  io.to(`company_${req.user.company_id}`).emit('transaction_created', {
    type: 'transaction',
    action: 'created',
    data: result
  });
}
```

### 10.4 Обновление мобильного приложения

**В src/config/socket.js:**

```javascript
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  async connect() {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) return;

    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('transaction_created', (data) => {
      this.notifyListeners('transaction_created', data);
    });

    // Добавьте другие события...
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
}

export default new SocketManager();
```

---

## 11. Troubleshooting

### 11.1 Частые проблемы и решения

**Проблема: Приложение не запускается**

```bash
# Проверяем логи PM2
pm2 logs skladreact-api

# Проверяем статус
pm2 status

# Проверяем подключение к БД
sudo -u postgres psql skladreact -c "SELECT 1;"

# Проверяем переменные окружения
cat /home/skladreact/skladreact-api/backend/.env
```

**Проблема: 502 Bad Gateway в Nginx**

```bash
# Проверяем что Node.js приложение работает
curl http://localhost:3000/health

# Проверяем логи Nginx
sudo tail -f /var/log/nginx/skladreact_error.log

# Проверяем конфигурацию Nginx
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx
```

**Проблема: SSL сертификат не работает**

```bash
# Проверяем статус сертификата
sudo certbot certificates

# Обновляем сертификат принудительно
sudo certbot renew --force-renewal

# Проверяем права доступа
sudo ls -la /etc/letsencrypt/live/your-domain.ru/
```

**Проблема: Высокая нагрузка на сервер**

```bash
# Мониторим ресурсы
htop

# Проверяем процессы Node.js
pm2 monit

# Масштабируем приложение
pm2 scale skladreact-api +2

# Проверяем медленные запросы к БД
sudo -u postgres psql skladreact -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

### 11.2 Полезные команды для диагностики

```bash
# Проверка всех сервисов
sudo systemctl status nginx postgresql pm2

# Проверка портов
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :5432

# Проверка дискового пространства
df -h
du -sh /home/skladreact/

# Проверка памяти
free -h
sudo ps aux --sort=-%mem | head -10

# Проверка CPU
top -bn1 | grep load
sudo ps aux --sort=-%cpu | head -10
```

---

## 12. Финальная проверка

### 12.1 Чеклист развертывания

- [ ] ✅ Сервер создан и настроен
- [ ] ✅ PostgreSQL установлен и настроен
- [ ] ✅ S3 хранилище настроено
- [ ] ✅ Node.js приложение развернуто
- [ ] ✅ PM2 настроен и работает
- [ ] ✅ Nginx настроен
- [ ] ✅ SSL сертификат получен
- [ ] ✅ Домен настроен и работает
- [ ] ✅ Backup настроены
- [ ] ✅ Мониторинг настроен
- [ ] ✅ Логирование работает

### 12.2 Тестирование API

```bash
# Тест health check
curl https://your-domain.ru/health

# Тест регистрации (замените данными)
curl -X POST https://your-domain.ru/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Тестовая компания",
    "admin_email": "admin@test.ru",
    "admin_password": "password123",
    "admin_name": "Администратор"
  }'

# Тест авторизации
curl -X POST https://your-domain.ru/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.ru",
    "password": "password123"
  }'
```

### 12.3 Контакты для поддержки

- **Timeweb Cloud поддержка**: https://timeweb.cloud/help
- **PostgreSQL документация**: https://www.postgresql.org/docs/
- **PM2 документация**: https://pm2.keymetrics.io/docs/
- **Nginx документация**: http://nginx.org/ru/docs/

---

## 🎉 Поздравляем!

Ваше приложение Skladreact успешно развернуто на Timeweb Cloud и готово к использованию!

**Доступные URL:**
- API: `https://your-domain.ru/api`
- Health check: `https://your-domain.ru/health`
- Мобильное приложение подключается к: `https://your-domain.ru`

**Следующие шаги:**
1. Настройте доменное имя в мобильном приложении
2. Проведите полное тестирование функциональности
3. Настройте мониторинг и алерты
4. Создайте документацию для пользователей

**Real-time синхронизация:** Реализована через WebSockets - данные синхронизируются мгновенно между всеми устройствами компании! 🚀