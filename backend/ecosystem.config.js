module.exports = {
  apps: [{
    name: 'skladreact-api',
    script: 'server.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // Автоматический перезапуск
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Логирование
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // Кластер настройки
    instance_var: 'INSTANCE_ID',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Мониторинг
    monitoring: false,
    pmx: true
  }]
};