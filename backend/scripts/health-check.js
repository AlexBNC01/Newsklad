#!/usr/bin/env node

/**
 * Health check script для Timeweb Cloud Apps
 * Проверяет подключение к БД и основные компоненты
 */

require('dotenv').config();
const db = require('../config/database');

async function healthCheck() {
  console.log('🏥 Проверка здоровья приложения...');
  
  try {
    // Проверка подключения к базе данных
    console.log('📊 Проверка подключения к PostgreSQL...');
    await db.raw('SELECT 1');
    console.log('✅ PostgreSQL подключена');
    
    // Проверка таблиц
    console.log('📋 Проверка структуры базы данных...');
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const expectedTables = [
      'companies', 'users', 'refresh_tokens', 'email_verifications',
      'containers', 'equipment', 'parts', 'transactions',
      'staff', 'repairs', 'repair_parts', 'repair_staff',
      'files', 'report_history'
    ];
    
    const existingTables = tables.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('⚠️  Отсутствующие таблицы:', missingTables.join(', '));
      console.log('💡 Запустите: npm run migrate');
    } else {
      console.log('✅ Все необходимые таблицы существуют');
    }
    
    // Проверка переменных окружения
    console.log('🔧 Проверка переменных окружения...');
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      console.log('❌ Отсутствующие переменные окружения:', missingEnvVars.join(', '));
      process.exit(1);
    } else {
      console.log('✅ Все необходимые переменные окружения установлены');
    }
    
    // Проверка S3 (опционально)
    if (process.env.S3_ENDPOINT) {
      console.log('☁️  S3 настроено:', process.env.S3_ENDPOINT);
    }
    
    // Проверка SMTP (опционально)
    if (process.env.SMTP_HOST) {
      console.log('📧 SMTP настроен:', process.env.SMTP_HOST);
    }
    
    console.log('🎉 Приложение готово к работе!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Ошибка проверки здоровья:', error.message);
    process.exit(1);
  }
}

// Запуск проверки
if (require.main === module) {
  healthCheck();
}

module.exports = healthCheck;