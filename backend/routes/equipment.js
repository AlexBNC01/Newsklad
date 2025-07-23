const express = require('express');
const { body, validationResult } = require('express-validator');
const { requirePermission } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Получение списка техники с фильтрацией и поиском
router.get('/', requirePermission('can_manage_equipment'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      type = 'all',
      status = 'all',
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;

    const offset = (page - 1) * limit;

    let query = db('equipment')
      .select('*')
      .where('company_id', req.user.company_id);

    // Поиск по модели, серийному номеру или типу
    if (search) {
      query = query.where(function() {
        this.whereRaw('model ILIKE ?', [`%${search}%`])
          .orWhereRaw('serial_number ILIKE ?', [`%${search}%`])
          .orWhereRaw('type ILIKE ?', [`%${search}%`]);
      });
    }

    // Фильтр по типу
    if (type !== 'all') {
      query = query.where('type', type);
    }

    // Фильтр по статусу
    if (status !== 'all') {
      query = query.where('status', status);
    }

    // Получаем общее количество
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('id as count');
    const total = parseInt(count);

    // Сортировка
    const allowedSortFields = ['model', 'type', 'status', 'engine_hours', 'mileage', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = ['asc', 'desc'].includes(sort_order) ? sort_order : 'desc';

    // Получаем технику с пагинацией
    const equipment = await query
      .orderBy(sortField, sortDirection)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        equipment,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          search,
          type,
          status,
          sort_by: sortField,
          sort_order: sortDirection,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение конкретной техники
router.get('/:id', requirePermission('can_manage_equipment'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const equipment = await db('equipment')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Техника не найдена'
      });
    }

    // Получаем активные ремонты
    const activeRepairs = await db('repairs')
      .select('id', 'description', 'status', 'start_date', 'total_cost')
      .where('equipment_id', id)
      .where('status', '!=', 'Завершен')
      .orderBy('created_at', 'desc');

    // Получаем историю ремонтов (последние 10)
    const repairHistory = await db('repairs')
      .select('id', 'description', 'status', 'start_date', 'end_date', 'total_cost')
      .where('equipment_id', id)
      .where('status', 'Завершен')
      .orderBy('end_date', 'desc')
      .limit(10);

    // Статистика техники
    const stats = await db('repairs')
      .where('equipment_id', id)
      .select(
        db.raw('COUNT(*) as total_repairs'),
        db.raw('COUNT(*) FILTER (WHERE status = \'Завершен\') as completed_repairs'),
        db.raw('SUM(CASE WHEN status = \'Завершен\' THEN total_cost ELSE 0 END) as total_repair_cost'),
        db.raw('AVG(CASE WHEN status = \'Завершен\' AND end_date IS NOT NULL THEN EXTRACT(DAY FROM (end_date - start_date)) END) as avg_repair_days')
      )
      .first();

    res.json({
      success: true,
      data: {
        ...equipment,
        active_repairs: activeRepairs,
        repair_history: repairHistory,
        stats
      }
    });

  } catch (error) {
    next(error);
  }
});

// Создание новой техники
router.post('/', requirePermission('can_manage_equipment'), [
  body('type')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Тип техники обязателен'),
  body('model')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Модель техники обязательна'),
  body('serial_number')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['Рабочее', 'В ремонте', 'Простой', 'Списано'])
    .withMessage('Недопустимый статус'),
  body('engine_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Моточасы должны быть неотрицательным числом'),
  body('mileage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Пробег должен быть неотрицательным числом'),
  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Недопустимый год выпуска'),
  body('photos')
    .optional()
    .isArray()
    .withMessage('Фотографии должны быть массивом'),
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
      type,
      model,
      serial_number,
      status = 'Рабочее',
      engine_hours,
      mileage,
      year,
      description,
      photos = []
    } = req.body;

    // Проверяем уникальность серийного номера в рамках компании
    if (serial_number) {
      const existingEquipment = await db('equipment')
        .where('serial_number', serial_number)
        .where('company_id', req.user.company_id)
        .first();

      if (existingEquipment) {
        return res.status(409).json({
          success: false,
          error: 'Техника с таким серийным номером уже существует'
        });
      }
    }

    // Создаем технику
    const [equipment] = await db('equipment')
      .insert({
        company_id: req.user.company_id,
        type,
        model,
        serial_number,
        status,
        engine_hours: parseFloat(engine_hours) || 0,
        mileage: parseFloat(mileage) || 0,
        year: parseInt(year) || null,
        description,
        photos: JSON.stringify(photos),
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: 'Техника успешно создана',
      data: equipment
    });

  } catch (error) {
    next(error);
  }
});

// Обновление техники
router.patch('/:id', requirePermission('can_manage_equipment'), [
  body('type')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Тип техники не может быть пустым'),
  body('model')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Модель техники не может быть пустой'),
  body('serial_number')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['Рабочее', 'В ремонте', 'Простой', 'Списано'])
    .withMessage('Недопустимый статус'),
  body('engine_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Моточасы должны быть неотрицательным числом'),
  body('mileage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Пробег должен быть неотрицательным числом'),
  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Недопустимый год выпуска'),
  body('photos')
    .optional()
    .isArray()
    .withMessage('Фотографии должны быть массивом'),
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

    // Проверяем существование техники
    const existingEquipment = await db('equipment')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!existingEquipment) {
      return res.status(404).json({
        success: false,
        error: 'Техника не найдена'
      });
    }

    const updateData = {};
    const allowedFields = [
      'type', 'model', 'serial_number', 'status', 'engine_hours', 
      'mileage', 'year', 'description', 'photos'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'photos') {
          updateData[field] = JSON.stringify(req.body[field]);
        } else if (field === 'engine_hours' || field === 'mileage') {
          updateData[field] = req.body[field] !== null ? parseFloat(req.body[field]) : null;
        } else if (field === 'year') {
          updateData[field] = req.body[field] !== null ? parseInt(req.body[field]) : null;
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

    // Проверяем уникальность серийного номера (если он изменился)
    if (updateData.serial_number && updateData.serial_number !== existingEquipment.serial_number) {
      const duplicateEquipment = await db('equipment')
        .where('serial_number', updateData.serial_number)
        .where('company_id', req.user.company_id)
        .where('id', '!=', id)
        .first();

      if (duplicateEquipment) {
        return res.status(409).json({
          success: false,
          error: 'Техника с таким серийным номером уже существует'
        });
      }
    }

    updateData.updated_at = db.fn.now();

    // Обновляем технику
    await db('equipment')
      .where('id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Техника успешно обновлена'
    });

  } catch (error) {
    next(error);
  }
});

// Удаление техники
router.delete('/:id', requirePermission('can_manage_equipment'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем существование техники
    const equipment = await db('equipment')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Техника не найдена'
      });
    }

    // Проверяем, есть ли активные ремонты
    const activeRepairs = await db('repairs')
      .where('equipment_id', id)
      .where('status', '!=', 'Завершен')
      .count('* as count')
      .first();

    if (parseInt(activeRepairs.count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Техника имеет активные ремонты и не может быть удалена'
      });
    }

    // Удаляем технику
    await db('equipment')
      .where('id', id)
      .del();

    res.json({
      success: true,
      message: 'Техника успешно удалена'
    });

  } catch (error) {
    next(error);
  }
});

// Получение статистики техники
router.get('/stats/overview', requirePermission('can_manage_equipment'), async (req, res, next) => {
  try {
    const stats = await db.raw(`
      SELECT 
        COUNT(*) as total_equipment,
        COUNT(*) FILTER (WHERE status = 'Рабочее') as working,
        COUNT(*) FILTER (WHERE status = 'В ремонте') as in_repair,
        COUNT(*) FILTER (WHERE status = 'Простой') as idle,
        COUNT(*) FILTER (WHERE status = 'Списано') as decommissioned,
        COUNT(DISTINCT type) as unique_types,
        AVG(engine_hours) as avg_engine_hours,
        AVG(mileage) as avg_mileage
      FROM equipment 
      WHERE company_id = ?
    `, [req.user.company_id]);

    // Топ-5 техники по количеству ремонтов
    const mostRepaired = await db('equipment')
      .select(
        'equipment.type',
        'equipment.model',
        'equipment.serial_number',
        db.raw('COUNT(repairs.id) as repair_count'),
        db.raw('SUM(repairs.total_cost) as total_repair_cost')
      )
      .leftJoin('repairs', 'equipment.id', 'repairs.equipment_id')
      .where('equipment.company_id', req.user.company_id)
      .groupBy('equipment.id', 'equipment.type', 'equipment.model', 'equipment.serial_number')
      .orderBy('repair_count', 'desc')
      .limit(5);

    res.json({
      success: true,
      data: {
        overview: stats.rows[0],
        most_repaired: mostRepaired
      }
    });

  } catch (error) {
    next(error);
  }
});

// Обновление моточасов или пробега
router.patch('/:id/meters', requirePermission('can_manage_equipment'), [
  body('engine_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Моточасы должны быть неотрицательным числом'),
  body('mileage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Пробег должен быть неотрицательным числом'),
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
    const { engine_hours, mileage } = req.body;

    // Проверяем существование техники
    const equipment = await db('equipment')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Техника не найдена'
      });
    }

    const updateData = {};
    if (engine_hours !== undefined) updateData.engine_hours = parseFloat(engine_hours);
    if (mileage !== undefined) updateData.mileage = parseFloat(mileage);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет данных для обновления'
      });
    }

    updateData.updated_at = db.fn.now();

    await db('equipment')
      .where('id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Показания успешно обновлены',
      data: {
        old_engine_hours: equipment.engine_hours,
        new_engine_hours: updateData.engine_hours,
        old_mileage: equipment.mileage,
        new_mileage: updateData.mileage
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;