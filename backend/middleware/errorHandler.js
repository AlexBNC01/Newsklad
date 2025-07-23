const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Ошибка:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Ресурс не найден';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Дублирующиеся данные';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // PostgreSQL ошибки
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error = { 
          message: 'Данные уже существуют', 
          statusCode: 409,
          code: 'DUPLICATE_DATA'
        };
        break;
      case '23503': // Foreign key violation
        error = { 
          message: 'Связанные данные не найдены', 
          statusCode: 400,
          code: 'FOREIGN_KEY_ERROR'
        };
        break;
      case '23502': // Not null violation
        error = { 
          message: 'Обязательное поле не заполнено', 
          statusCode: 400,
          code: 'REQUIRED_FIELD_MISSING'
        };
        break;
      case '23514': // Check violation
        error = { 
          message: 'Данные не соответствуют требованиям', 
          statusCode: 400,
          code: 'DATA_VALIDATION_ERROR'
        };
        break;
      case '42P01': // Undefined table
        error = { 
          message: 'Внутренняя ошибка сервера', 
          statusCode: 500,
          code: 'DATABASE_ERROR'
        };
        break;
      default:
        if (err.code.startsWith('23')) {
          error = { 
            message: 'Ошибка ограничения базы данных', 
            statusCode: 400,
            code: 'DATABASE_CONSTRAINT_ERROR'
          };
        }
    }
  }

  // JWT ошибки
  if (err.name === 'JsonWebTokenError') {
    error = { 
      message: 'Недействительный токен', 
      statusCode: 401,
      code: 'INVALID_TOKEN'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = { 
      message: 'Токен истек', 
      statusCode: 401,
      code: 'TOKEN_EXPIRED'
    };
  }

  // Multer ошибки (загрузка файлов)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = { 
      message: 'Файл слишком большой', 
      statusCode: 400,
      code: 'FILE_TOO_LARGE'
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = { 
      message: 'Слишком много файлов', 
      statusCode: 400,
      code: 'TOO_MANY_FILES'
    };
  }

  // Ошибки валидации Joi
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ');
    error = { 
      message: message.replace(/"/g, ''), 
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: err.details
    };
  }

  // Rate limit ошибки
  if (err.statusCode === 429) {
    error = { 
      message: 'Слишком много запросов', 
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Внутренняя ошибка сервера';

  const errorResponse = {
    success: false,
    error: message,
    code: error.code || 'SERVER_ERROR',
  };

  // В development режиме добавляем stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = error.details;
  }

  // Логируем серьезные ошибки
  if (statusCode >= 500) {
    console.error('Серьезная ошибка сервера:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      companyId: req.user?.company_id,
    });
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;