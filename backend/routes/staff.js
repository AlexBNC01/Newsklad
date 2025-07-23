const express = require('express');
const { body, validationResult } = require('express-validator');
const { requirePermission } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Получение списка персонала с фильтрацией
router.get('/', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      position = 'all',
      active = 'all',
      sort_by = 'name',
      sort_order = 'asc',
    } = req.query;

    const offset = (page - 1) * limit;

    let query = db('staff')
      .select('*')
      .where('company_id', req.user.company_id);

    // Поиск по имени
    if (search) {
      query = query.whereRaw('name ILIKE ?', [`%${search}%`]);
    }

    // Фильтр по должности
    if (position !== 'all') {
      query = query.where('position', position);
    }

    // Фильтр по активности
    if (active !== 'all') {
      query = query.where('is_active', active === 'true');
    }

    // Получаем общее количество
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('id as count');
    const total = parseInt(count);

    // Сортировка
    const allowedSortFields = ['name', 'position', 'hourly_rate', 'phone', 'hire_date', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'name';
    const sortDirection = ['asc', 'desc'].includes(sort_order) ? sort_order : 'asc';

    // Получаем персонал с пагинацией
    const staff = await query
      .orderBy(sortField, sortDirection)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        staff,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          search,
          position,
          active,
          sort_by: sortField,
          sort_order: sortDirection,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение конкретного сотрудника
router.get('/:id', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const staff = await db('staff')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Сотрудник не найден'
      });
    }

    // Получаем статистику работы сотрудника
    const workStats = await db('repair_staff')
      .join('repairs', 'repair_staff.repair_id', 'repairs.id')
      .where('repair_staff.staff_id', id)
      .select(
        db.raw('COUNT(DISTINCT repair_staff.repair_id) as total_repairs'),
        db.raw('COUNT(DISTINCT repair_staff.repair_id) FILTER (WHERE repairs.status = \'Завершен\') as completed_repairs'),
        db.raw('SUM(repair_staff.hours_worked) as total_hours_worked'),
        db.raw('AVG(repair_staff.hours_worked) FILTER (WHERE repairs.status = \'Завершен\') as avg_hours_per_repair')
      )
      .first();

    // Получаем активные ремонты
    const activeRepairs = await db('repair_staff')
      .join('repairs', 'repair_staff.repair_id', 'repairs.id')
      .join('equipment', 'repairs.equipment_id', 'equipment.id')
      .where('repair_staff.staff_id', id)
      .where('repairs.status', '!=', 'Завершен')
      .select(
        'repairs.id as repair_id',
        'repairs.description',
        'repairs.status',
        'repairs.start_date',
        'equipment.type as equipment_type',
        'equipment.model as equipment_model'
      );

    res.json({
      success: true,
      data: {
        ...staff,
        stats: workStats,
        active_repairs: activeRepairs
      }
    });

  } catch (error) {
    next(error);
  }
});

// Создание нового сотрудника
router.post('/', requirePermission('can_manage_users'), [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Имя должно содержать минимум 2 символа'),
  body('position')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Должность обязательна'),
  body('phone')
    .optional()
    .isMobilePhone('ru-RU')
    .withMessage('Введите корректный номер телефона'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Введите корректный email'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Почасовая ставка должна быть неотрицательным числом'),
  body('hire_date')
    .optional()
    .isISO8601()
    .withMessage('Некорректная дата приема на работу'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const {
      name,
      position,
      phone,
      email,
      hourly_rate,
      hire_date,
      notes,
      skills = []
    } = req.body;

    // Проверяем уникальность email в рамках компании
    if (email) {
      const existingStaff = await db('staff')
        .where('email', email)
        .where('company_id', req.user.company_id)
        .first();

      if (existingStaff) {
        return res.status(409).json({
          success: false,
          error: 'Сотрудник с таким email уже существует'
        });
      }
    }

    // Создаем сотрудника
    const [staff] = await db('staff')
      .insert({
        company_id: req.user.company_id,
        name,
        position,
        phone,
        email,
        hourly_rate: parseFloat(hourly_rate) || null,
        hire_date: hire_date || null,
        notes,
        skills: JSON.stringify(skills),
        is_active: true,
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: 'Сотрудник успешно создан',
      data: staff
    });

  } catch (error) {
    next(error);
  }
});

// Обновление сотрудника
router.patch('/:id', requirePermission('can_manage_users'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Имя должно содержать минимум 2 символа'),
  body('position')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Должность не может быть пустой'),
  body('phone')
    .optional()
    .custom(value => value === null || value === '' || /^[+]?[\d\s\-\(\)]+$/.test(value))
    .withMessage('Введите корректный номер телефона'),
  body('email')
    .optional()
    .custom(value => value === null || value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    .withMessage('Введите корректный email'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Почасовая ставка должна быть неотрицательным числом'),
  body('hire_date')
    .optional()
    .custom(value => value === null || !isNaN(Date.parse(value)))
    .withMessage('Некорректная дата приема на работу'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Статус активности должен быть true или false'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Навыки должны быть массивом'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const { id } = req.params;

    // Проверяем существование сотрудника
    const existingStaff = await db('staff')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        error: 'Сотрудник не найден'
      });
    }

    const updateData = {};
    const allowedFields = [
      'name', 'position', 'phone', 'email', 'hourly_rate', 
      'hire_date', 'notes', 'skills', 'is_active'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'skills') {
          updateData[field] = JSON.stringify(req.body[field]);
        } else if (field === 'hourly_rate') {
          updateData[field] = req.body[field] !== null ? parseFloat(req.body[field]) : null;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет данных для обновления'
      });
    }

    // Проверяем уникальность email (если он изменился)
    if (updateData.email && updateData.email !== existingStaff.email) {
      const duplicateStaff = await db('staff')
        .where('email', updateData.email)
        .where('company_id', req.user.company_id)
        .where('id', '!=', id)
        .first();

      if (duplicateStaff) {
        return res.status(409).json({
          success: false,
          error: 'Сотрудник с таким email уже существует'
        });
      }
    }

    updateData.updated_at = db.fn.now();

    // Обновляем сотрудника
    await db('staff')
      .where('id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Данные сотрудника успешно обновлены'
    });

  } catch (error) {
    next(error);
  }
});

// Деактивация сотрудника
router.patch('/:id/deactivate', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем существование сотрудника
    const staff = await db('staff')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Сотрудник не найден'
      });
    }

    // Проверяем, есть ли активные ремонты
    const activeRepairs = await db('repair_staff')
      .join('repairs', 'repair_staff.repair_id', 'repairs.id')
      .where('repair_staff.staff_id', id)
      .where('repairs.status', '!=', 'Завершен')
      .count('* as count')
      .first();

    if (parseInt(activeRepairs.count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Нельзя деактивировать сотрудника с активными ремонтами'
      });
    }

    // Деактивируем сотрудника
    await db('staff')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: db.fn.now(),
      });

    res.json({
      success: true,
      message: 'Сотрудник успешно деактивирован'
    });

  } catch (error) {
    next(error);
  }
});

// Активация сотрудника
router.patch('/:id/activate', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем существование сотрудника
    const staff = await db('staff')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Сотрудник не найден'
      });
    }

    // Активируем сотрудника
    await db('staff')
      .where('id', id)
      .update({
        is_active: true,
        updated_at: db.fn.now(),
      });

    res.json({
      success: true,
      message: 'Сотрудник успешно активирован'
    });

  } catch (error) {
    next(error);
  }
});

// Удаление сотрудника
router.delete('/:id', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем существование сотрудника
    const staff = await db('staff')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Сотрудник не найден'
      });
    }

    // Проверяем, есть ли связанные ремонты
    const repairsCount = await db('repair_staff')
      .where('staff_id', id)
      .count('* as count')
      .first();

    if (parseInt(repairsCount.count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Нельзя удалить сотрудника, который участвовал в ремонтах'
      });
    }

    // Удаляем сотрудника
    await db('staff')
      .where('id', id)
      .del();

    res.json({
      success: true,
      message: 'Сотрудник успешно удален'
    });

  } catch (error) {
    next(error);
  }
});

// Получение статистики персонала
router.get('/stats/overview', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const stats = await db.raw(`
      SELECT 
        COUNT(*) as total_staff,
        COUNT(*) FILTER (WHERE is_active = true) as active_staff,
        COUNT(DISTINCT position) as unique_positions,
        AVG(hourly_rate) FILTER (WHERE hourly_rate IS NOT NULL) as avg_hourly_rate,
        COUNT(*) FILTER (WHERE hire_date IS NOT NULL AND hire_date >= NOW() - INTERVAL '30 days') as new_hires_last_month
      FROM staff 
      WHERE company_id = ?
    `, [req.user.company_id]);

    // Статистика по должностям
    const positionStats = await db('staff')
      .select(
        'position',
        db.raw('COUNT(*) as count'),
        db.raw('COUNT(*) FILTER (WHERE is_active = true) as active_count'),
        db.raw('AVG(hourly_rate) as avg_rate')
      )
      .where('company_id', req.user.company_id)
      .groupBy('position')
      .orderBy('count', 'desc');

    // Самые загруженные сотрудники (по количеству активных ремонтов)
    const busiestStaff = await db('staff')
      .select(
        'staff.name',
        'staff.position',
        db.raw('COUNT(repair_staff.repair_id) as active_repairs')
      )
      .leftJoin('repair_staff', 'staff.id', 'repair_staff.staff_id')
      .leftJoin('repairs', function() {
        this.on('repair_staff.repair_id', 'repairs.id')
          .andOn(db.raw("repairs.status != 'Завершен'"));
      })
      .where('staff.company_id', req.user.company_id)
      .where('staff.is_active', true)
      .groupBy('staff.id', 'staff.name', 'staff.position')
      .orderBy('active_repairs', 'desc')
      .limit(5);

    res.json({
      success: true,
      data: {
        overview: stats.rows[0],
        position_stats: positionStats,
        busiest_staff: busiestStaff
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение рабочей нагрузки сотрудника
router.get('/:id/workload', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    // Проверяем существование сотрудника
    const staff = await db('staff')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Сотрудник не найден'
      });
    }

    // Определяем период
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = "repairs.created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateFilter = "repairs.created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        dateFilter = "repairs.created_at >= NOW() - INTERVAL '90 days'";
        break;
      default:
        dateFilter = "repairs.created_at >= NOW() - INTERVAL '30 days'";
    }

    // Получаем детальную статистику
    const workload = await db.raw(`
      SELECT 
        COUNT(DISTINCT repair_staff.repair_id) as total_repairs,
        COUNT(DISTINCT repair_staff.repair_id) FILTER (WHERE repairs.status = 'Завершен') as completed_repairs,
        COUNT(DISTINCT repair_staff.repair_id) FILTER (WHERE repairs.status != 'Завершен') as active_repairs,
        SUM(repair_staff.hours_worked) as total_hours,
        AVG(repair_staff.hours_worked) FILTER (WHERE repairs.status = 'Завершен') as avg_hours_per_repair,
        AVG(CASE WHEN repairs.status = 'Завершен' AND repairs.end_date IS NOT NULL AND repairs.start_date IS NOT NULL 
             THEN EXTRACT(DAY FROM (repairs.end_date - repairs.start_date)) END) as avg_days_per_repair
      FROM repair_staff
      LEFT JOIN repairs ON repair_staff.repair_id = repairs.id
      WHERE repair_staff.staff_id = ? AND ${dateFilter}
    `, [id]);

    // Получаем историю ремонтов за период
    const repairHistory = await db('repair_staff')
      .select(
        'repairs.id',
        'repairs.description',
        'repairs.status',
        'repairs.start_date',
        'repairs.end_date',
        'repair_staff.hours_worked',
        'equipment.type as equipment_type',
        'equipment.model as equipment_model'
      )
      .join('repairs', 'repair_staff.repair_id', 'repairs.id')
      .join('equipment', 'repairs.equipment_id', 'equipment.id')
      .where('repair_staff.staff_id', id)
      .whereRaw(dateFilter)
      .orderBy('repairs.start_date', 'desc');

    res.json({
      success: true,
      data: {
        period,
        staff: {
          name: staff.name,
          position: staff.position
        },
        workload: workload.rows[0],
        repair_history: repairHistory
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;