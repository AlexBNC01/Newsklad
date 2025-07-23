const knex = require('knex');
const knexfile = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexfile[environment];

if (!config) {
  throw new Error(`Конфигурация базы данных для окружения "${environment}" не найдена`);
}

const db = knex(config);

// Проверка подключения к БД
const checkConnection = async () => {
  try {
    await db.raw('SELECT NOW()');
    console.log('✅ Подключение к PostgreSQL установлено');
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
    process.exit(1);
  }
};

// Проверяем подключение при старте
checkConnection();

module.exports = db;