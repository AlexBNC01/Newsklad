# 🚀 Развертывание на Timeweb Cloud

## 📋 Подготовка к развертыванию

### 1. Создание аккаунта Timeweb Cloud
1. Перейдите на [timeweb.cloud](https://timeweb.cloud)
2. Зарегистрируйтесь или войдите в аккаунт
3. Пополните баланс для создания ресурсов

### 2. Создание облачного сервера (VPS)
1. В панели управления выберите **"Облачные серверы"**
2. Нажмите **"Создать сервер"**
3. Выберите конфигурацию:
   - **ОС**: Ubuntu 22.04 LTS
   - **CPU**: 2 vCPU (минимум)
   - **RAM**: 2 GB (минимум)
   - **SSD**: 20 GB (минимум)
   - **Локация**: Москва (или ближайшая к вам)
4. Создайте SSH ключ или используйте пароль
5. Запустите сервер

### 3. Создание базы данных PostgreSQL
1. В панели управления выберите **"Базы данных"**
2. Нажмите **"Создать базу данных"**
3. Выберите **PostgreSQL 15**
4. Конфигурация:
   - **Название**: `skladreact`
   - **CPU**: 1 vCPU
   - **RAM**: 1 GB
   - **SSD**: 10 GB
5. Сохраните данные подключения

### 4. Создание S3-совместимого хранилища
1. В панели выберите **"Облачное хранилище"**
2. Создайте новое хранилище:
   - **Название**: `skladreact-files`
   - **Локация**: та же, что и сервер
3. Создайте Access Key и Secret Key
4. Настройте CORS политики

## 🔧 Настройка сервера

### 1. Подключение к серверу
```bash
ssh root@your-server-ip
```

### 2. Обновление системы
```bash
apt update && apt upgrade -y
```

### 3. Установка Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
node --version  # Проверяем версию
npm --version
```

### 4. Установка PM2 (менеджер процессов)
```bash
npm install -g pm2
```

### 5. Установка Nginx
```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

### 6. Настройка firewall
```bash
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw enable
```

## 📦 Развертывание приложения

### 1. Клонирование кода
```bash
cd /var/www
git clone https://github.com/your-username/skladreact.git
cd skladreact/backend
```

### 2. Установка зависимостей
```bash
npm install --production
```

### 3. Настройка переменных окружения
```bash
cp .env.example .env
nano .env
```

Заполните `.env` файл:
```bash
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.ru

# PostgreSQL (из панели Timeweb)
DB_HOST=your-postgres-host.timeweb.cloud
DB_PORT=5432
DB_NAME=skladreact
DB_USER=your-username
DB_PASSWORD=your-password
DB_SSL=true

# JWT секреты (сгенерируйте сильные пароли)
JWT_SECRET=your-very-strong-jwt-secret
JWT_REFRESH_SECRET=your-very-strong-refresh-secret

# S3 Storage
S3_ENDPOINT=https://s3.timeweb.cloud
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET_NAME=skladreact-files
S3_REGION=ru-central1

# Email настройки
SMTP_HOST=smtp.timeweb.ru
SMTP_PORT=587
SMTP_USER=noreply@your-domain.ru
SMTP_PASSWORD=your-smtp-password
```

### 4. Миграция базы данных
```bash
npm run migrate
```

### 5. Настройка PM2
Создайте `ecosystem.config.js`:
```bash
nano ecosystem.config.js
```

Содержимое:
```javascript
module.exports = {
  apps: [{
    name: 'skladreact-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M'
  }]
};
```

Создайте папку для логов:
```bash
mkdir logs
```

### 6. Запуск приложения
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Настройка Nginx

### 1. Создание конфигурации
```bash
nano /etc/nginx/sites-available/skladreact
```

Содержимое:
```nginx
server {
    listen 80;
    server_name your-domain.ru www.your-domain.ru;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.ru www.your-domain.ru;
    
    # SSL настройки (после получения сертификата)
    ssl_certificate /etc/letsencrypt/live/your-domain.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.ru/privkey.pem;
    
    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip сжатие
    gzip on;
    gzip_types text/plain application/json application/javascript text/css application/xml text/xml;
    
    # Проксирование к Node.js
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Обслуживание статических файлов (если есть)
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### 2. Активация конфигурации
```bash
ln -s /etc/nginx/sites-available/skladreact /etc/nginx/sites-enabled/
nginx -t  # Проверка конфигурации
systemctl reload nginx
```

## 🔒 SSL сертификат (Let's Encrypt)

### 1. Установка Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

### 2. Получение сертификата
```bash
certbot --nginx -d your-domain.ru -d www.your-domain.ru
```

### 3. Автообновление сертификата
```bash
crontab -e
```

Добавьте строку:
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📱 Настройка мобильного приложения

### 1. Обновите конфигурацию API
В файле `src/config/api.js`:
```javascript
const API_BASE_URL = 'https://your-domain.ru/api';
```

### 2. Соберите новую версию приложения
```bash
cd ../  # Корень проекта
npx expo build:android  # Для Android
npx expo build:ios      # Для iOS
```

## 📊 Мониторинг и обслуживание

### 1. Мониторинг PM2
```bash
pm2 status
pm2 logs skladreact-api
pm2 monit
```

### 2. Просмотр логов Nginx
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### 3. Мониторинг ресурсов
```bash
htop
df -h  # Дисковое пространство
free -h  # Память
```

### 4. Резервное копирование БД
Создайте скрипт `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/skladreact"
mkdir -p $BACKUP_DIR

# Бэкап PostgreSQL
PGPASSWORD="$DB_PASSWORD" pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_DIR/skladreact_$DATE.sql

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

Автоматизация:
```bash
chmod +x backup.sh
crontab -e
# Добавить: 0 2 * * * /var/www/skladreact/backup.sh
```

## 💰 Ориентировочная стоимость

### Минимальная конфигурация (до 10 пользователей):
- **VPS**: 2 vCPU, 2 GB RAM - ~790₽/мес
- **PostgreSQL**: 1 vCPU, 1 GB RAM - ~590₽/мес  
- **S3 хранилище**: 10 GB - ~50₽/мес
- **Домен .ru**: ~350₽/год
- **Итого**: ~1430₽/мес + ~350₽/год

### Средняя конфигурация (до 50 пользователей):
- **VPS**: 4 vCPU, 4 GB RAM - ~1590₽/мес
- **PostgreSQL**: 2 vCPU, 2 GB RAM - ~1190₽/мес
- **S3 хранилище**: 50 GB - ~250₽/мес
- **Итого**: ~3030₽/мес

## 🆘 Решение проблем

### Проблема: Приложение не запускается
```bash
pm2 logs skladreact-api  # Смотрим логи
pm2 restart all          # Перезапускаем
```

### Проблема: База данных недоступна
```bash
# Проверяем подключение
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### Проблема: Высокая нагрузка
```bash
pm2 scale skladreact-api +2  # Добавляем 2 процесса
```

### Обновление приложения
```bash
cd /var/www/skladreact
git pull
cd backend
npm install
npm run migrate  # Если есть новые миграции
pm2 reload all
```

## 📞 Поддержка
- **Документация Timeweb**: [help.timeweb.com](https://help.timeweb.com)
- **Техподдержка**: support@timeweb.com
- **Телефон**: 8 (800) 700-06-08