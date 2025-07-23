require('dotenv').config();

// Поддержка DATABASE_URL для Timeweb Cloud Apps
const connectionConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const commonConfig = {
  client: 'postgresql',
  connection: connectionConfig,
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
};

module.exports = {
  development: {
    ...commonConfig,
    connection: {
      ...commonConfig.connection,
      database: process.env.DB_NAME || 'skladreact_dev',
    },
    debug: process.env.NODE_ENV === 'development',
  },

  testing: {
    ...commonConfig,
    connection: {
      ...commonConfig.connection,
      database: process.env.DB_NAME_TEST || 'skladreact_test',
    },
  },

  production: {
    ...commonConfig,
    pool: {
      ...commonConfig.pool,
      min: 5,
      max: 20,
    },
    acquireConnectionTimeout: 60000,
  },
};