require('dotenv').config();

// Диагностика переменных окружения
console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_REFRESH_SECRET exists:', !!process.env.JWT_REFRESH_SECRET);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Импорт роутов
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const partsRoutes = require('./routes/parts');
const equipmentRoutes = require('./routes/equipment');
const transactionRoutes = require('./routes/transactions');
const repairRoutes = require('./routes/repairs');
const containerRoutes = require('./routes/containers');
const staffRoutes = require('./routes/staff');
const reportsRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/upload');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const { auth } = require('./middleware/auth');

const app = express();
// Timeweb требует использование переменной PORT
const PORT = process.env.PORT || 3000;

// Настройка CORS для российских доменов
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:19006', // Expo dev
      'http://localhost:19000', // Expo web
      process.env.APP_URL,
      /\.ru$/, // Все .ru домены
      /\.рф$/, // Все .рф домены
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Базовые middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 минут
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Слишком много запросов с вашего IP. Попробуйте позже.',
    retryAfter: '15 минут'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Строгий лимит для авторизации
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // 5 попыток входа
  message: {
    error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
  },
  skipSuccessfulRequests: true,
});

app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('./package.json').version,
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', auth, userRoutes);
app.use('/api/companies', auth, companyRoutes);
app.use('/api/parts', auth, partsRoutes);
app.use('/api/equipment', auth, equipmentRoutes);
app.use('/api/transactions', auth, transactionRoutes);
app.use('/api/repairs', auth, repairRoutes);
app.use('/api/containers', auth, containerRoutes);
app.use('/api/staff', auth, staffRoutes);
app.use('/api/reports', auth, reportsRoutes);
app.use('/api/upload', auth, uploadRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Эндпоинт не найден',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM получен, завершаем сервер...');
  server.close(() => {
    console.log('HTTP сервер закрыт.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT получен, завершаем сервер...');
  server.close(() => {
    console.log('HTTP сервер закрыт.');
    process.exit(0);
  });
});

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Сервер запущен!
📍 Адрес: http://0.0.0.0:${PORT}
🌍 Окружение: ${process.env.NODE_ENV || 'development'}
📝 API документация: http://0.0.0.0:${PORT}/api/docs
🏥 Health check: http://0.0.0.0:${PORT}/health
🔌 Listening on port: ${PORT}
🎯 Server ready for connections!
  `);
  
  // Дополнительные проверки для Timeweb
  console.log('✅ Server is listening on port:', server.address().port);
  console.log('✅ Server is listening on address:', server.address().address);
});

module.exports = app;