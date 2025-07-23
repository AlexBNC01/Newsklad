const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        error: 'Токен доступа отсутствует',
        code: 'NO_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Получаем пользователя из БД
      const user = await db('users')
        .select('users.*', 'companies.name as company_name', 'companies.settings as company_settings')
        .leftJoin('companies', 'users.company_id', 'companies.id')
        .where('users.id', decoded.userId)
        .first();

      if (!user) {
        return res.status(401).json({ 
          error: 'Пользователь не найден',
          code: 'USER_NOT_FOUND'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({ 
          error: 'Аккаунт деактивирован',
          code: 'ACCOUNT_DISABLED'
        });
      }

      // Проверяем, что компания активна
      if (!user.company_id) {
        return res.status(401).json({ 
          error: 'Пользователь не привязан к компании',
          code: 'NO_COMPANY'
        });
      }

      // Обновляем время последней активности
      await db('users')
        .where('id', user.id)
        .update({ last_active_at: db.fn.now() });

      // Добавляем информацию о пользователе в запрос
      req.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        permissions: user.permissions,
        company_id: user.company_id,
        company_name: user.company_name,
        company_settings: user.company_settings,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Токен истек',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Недействительный токен',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при аутентификации',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Middleware для проверки разрешений
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Пользователь не авторизован',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const permissions = req.user.permissions || {};
    
    if (!permissions[permission]) {
      return res.status(403).json({ 
        error: 'Недостаточно прав доступа',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_permission: permission
      });
    }

    next();
  };
};

// Middleware для проверки роли
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Пользователь не авторизован',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Недостаточно прав доступа',
        code: 'INSUFFICIENT_ROLE',
        required_roles: allowedRoles,
        user_role: req.user.role
      });
    }

    next();
  };
};

// Middleware для проверки принадлежности к компании
const requireCompany = (req, res, next) => {
  if (!req.user?.company_id) {
    return res.status(403).json({ 
      error: 'Пользователь не привязан к компании',
      code: 'NO_COMPANY_ACCESS'
    });
  }
  next();
};

// Middleware для проверки, что запрашиваемый ресурс принадлежит компании пользователя
const requireResourceAccess = (tableName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      
      const resource = await db(tableName)
        .where('id', resourceId)
        .first();

      if (!resource) {
        return res.status(404).json({ 
          error: 'Ресурс не найден',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (resource.company_id && resource.company_id !== req.user.company_id) {
        return res.status(403).json({ 
          error: 'Нет доступа к ресурсу',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ошибка проверки доступа к ресурсу:', error);
      res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        code: 'RESOURCE_ACCESS_ERROR'
      });
    }
  };
};

module.exports = {
  auth,
  requirePermission,
  requireRole,
  requireCompany,
  requireResourceAccess,
};