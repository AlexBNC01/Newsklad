const express = require('express');
const { body, validationResult } = require('express-validator');
const { requirePermission } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Получение списка ремонтов с фильтрацией
router.get('/', requirePermission('can_manage_equipment'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      equipment_id,
      start_date,
      end_date,
      priority = 'all',
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;

    const offset = (page - 1) * limit;

    let query = db('repairs')
      .select(
        'repairs.*',
        'equipment.type as equipment_type',
        'equipment.model as equipment_model',
        'equipment.serial_number as equipment_serial'
      )
      .leftJoin('equipment', 'repairs.equipment_id', 'equipment.id')
      .where('repairs.company_id', req.user.company_id);

    // Фильтр по статусу
    if (status !== 'all') {
      query = query.where('repairs.status', status);
    }

    // Фильтр по технике
    if (equipment_id) {
      query = query.where('repairs.equipment_id', equipment_id);
    }

    // Фильтр по приоритету
    if (priority !== 'all') {
      query = query.where('repairs.priority', priority);
    }

    // Фильтр по датам
    if (start_date) {
      query = query.where('repairs.start_date', '>=', start_date);
    }
    if (end_date) {
      query = query.where('repairs.start_date', '<=', end_date);
    }

    // Получаем общее количество
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('repairs.id as count');
    const total = parseInt(count);

    // Сортировка
    const allowedSortFields = ['created_at', 'start_date', 'end_date', 'status', 'priority', 'total_cost'];
    const sortField = allowedSortFields.includes(sort_by) ? `repairs.${sort_by}` : 'repairs.created_at';
    const sortDirection = ['asc', 'desc'].includes(sort_order) ? sort_order : 'desc';

    // Получаем ремонты с пагинацией
    const repairs = await query
      .orderBy(sortField, sortDirection)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        repairs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          status,
          equipment_id,
          start_date,
          end_date,
          priority,
          sort_by,
          sort_order,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение конкретного ремонта
router.get('/:id', requirePermission('can_manage_equipment'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const repair = await db('repairs')
      .select(
        'repairs.*',
        'equipment.type as equipment_type',
        'equipment.model as equipment_model',
        'equipment.serial_number as equipment_serial',
        'equipment.status as equipment_status'
      )
      .leftJoin('equipment', 'repairs.equipment_id', 'equipment.id')
      .where('repairs.id', id)
      .where('repairs.company_id', req.user.company_id)
      .first();

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Ремонт не найден'
      });
    }

    // Получаем использованные запчасти
    const parts = await db('repair_parts')
      .select(
        'repair_parts.*',
        'parts.name as part_name',
        'parts.article as part_article',
        'parts.price as part_price'
      )
      .leftJoin('parts', 'repair_parts.part_id', 'parts.id')
      .where('repair_parts.repair_id', id);

    // Получаем назначенный персонал
    const staff = await db('repair_staff')
      .select(
        'repair_staff.*',
        'staff.name as staff_name',
        'staff.position as staff_position',
        'staff.hourly_rate as staff_hourly_rate'
      )
      .leftJoin('staff', 'repair_staff.staff_id', 'staff.id')
      .where('repair_staff.repair_id', id);

    res.json({
      success: true,
      data: {
        ...repair,
        parts,
        staff
      }
    });

  } catch (error) {
    next(error);
  }
});

// Создание нового ремонта
router.post('/', requirePermission('can_manage_equipment'), [
  body('equipment_id')
    .isUUID()
    .withMessage('Некорректный ID техники'),
  body('description')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Описание ремонта обязательно'),
  body('priority')
    .optional()
    .isIn(['Низкий', 'Средний', 'Высокий', 'Критический'])
    .withMessage('Недопустимый приоритет'),
  body('planned_start_date')
    .optional()
    .isISO8601()
    .withMessage('Некорректная дата планируемого начала'),
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Оценочные часы должны быть неотрицательным числом'),
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
      equipment_id,
      description,
      priority = 'Средний',
      planned_start_date,
      estimated_hours,
      notes
    } = req.body;

    // Проверяем существование техники
    const equipment = await db('equipment')
      .where('id', equipment_id)
      .where('company_id', req.user.company_id)
      .first();

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Техника не найдена'
      });
    }

    // Создаем ремонт в транзакции
    const result = await db.transaction(async (trx) => {
      // Создаем ремонт
      const [repair] = await trx('repairs')
        .insert({
          company_id: req.user.company_id,
          equipment_id,
          description,
          priority,
          status: 'Запланирован',
          planned_start_date: planned_start_date || null,
          estimated_hours: parseFloat(estimated_hours) || null,
          notes,
          created_by: req.user.id,
        })
        .returning('*');

      // Обновляем статус техники на "В ремонте"
      await trx('equipment')
        .where('id', equipment_id)
        .update({
          status: 'В ремонте',
          updated_at: trx.fn.now(),
        });

      return repair;
    });

    res.status(201).json({
      success: true,
      message: 'Ремонт успешно создан',
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// Обновление ремонта
router.patch('/:id', requirePermission('can_manage_equipment'), [
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Описание ремонта не может быть пустым'),
  body('priority')
    .optional()
    .isIn(['Низкий', 'Средний', 'Высокий', 'Критический'])
    .withMessage('Недопустимый приоритет'),
  body('status')
    .optional()
    .isIn(['Запланирован', 'В процессе', 'Приостановлен', 'Завершен', 'Отменен'])
    .withMessage('Недопустимый статус'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Некорректная дата начала'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Некорректная дата окончания'),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Стоимость работ должна быть неотрицательным числом'),
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

    // Проверяем существование ремонта
    const existingRepair = await db('repairs')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!existingRepair) {
      return res.status(404).json({
        success: false,
        error: 'Ремонт не найден'
      });
    }

    const updateData = {};
    const allowedFields = [
      'description', 'priority', 'status', 'start_date', 'end_date',
      'planned_start_date', 'estimated_hours', 'actual_hours', 'labor_cost', 'notes'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'estimated_hours' || field === 'actual_hours' || field === 'labor_cost') {
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

    updateData.updated_at = db.fn.now();

    // Если ремонт завершается, автоматически рассчитываем общую стоимость
    if (updateData.status === 'Завершен') {
      // Получаем стоимость запчастей
      const partsCoast = await db('repair_parts')
        .join('parts', 'repair_parts.part_id', 'parts.id')
        .where('repair_parts.repair_id', id)
        .sum(db.raw('repair_parts.quantity_used * COALESCE(parts.price, 0) as total'))
        .first();

      updateData.parts_cost = parseFloat(partsCoast.total) || 0;
      updateData.total_cost = (updateData.parts_cost || 0) + (updateData.labor_cost || existingRepair.labor_cost || 0);
      updateData.end_date = updateData.end_date || new Date().toISOString();

      // Обновляем статус техники обратно на "Рабочее"
      await db('equipment')
        .where('id', existingRepair.equipment_id)
        .update({
          status: 'Рабочее',
          updated_at: db.fn.now(),
        });
    }

    // Обновляем ремонт
    await db('repairs')
      .where('id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Ремонт успешно обновлен'
    });

  } catch (error) {
    next(error);
  }
});

// Добавление запчасти к ремонту
router.post('/:id/parts', requirePermission('can_manage_equipment'), [
  body('part_id')
    .isUUID()
    .withMessage('Некорректный ID запчасти'),
  body('quantity_used')
    .isInt({ min: 1 })
    .withMessage('Количество должно быть положительным числом'),
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
    const { part_id, quantity_used } = req.body;

    // Проверяем существование ремонта
    const repair = await db('repairs')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Ремонт не найден'
      });
    }

    // Проверяем, что ремонт не завершен
    if (repair.status === 'Завершен') {
      return res.status(400).json({
        success: false,
        error: 'Нельзя добавлять запчасти к завершенному ремонту'
      });
    }

    // Проверяем существование запчасти
    const part = await db('parts')
      .where('id', part_id)
      .where('company_id', req.user.company_id)
      .first();

    if (!part) {
      return res.status(404).json({
        success: false,
        error: 'Запчасть не найдена'
      });
    }

    // Проверяем доступность запчасти
    if (part.quantity < quantity_used) {
      return res.status(400).json({
        success: false,
        error: `Недостаточно запчастей на складе. Доступно: ${part.quantity}`
      });
    }

    // Выполняем операцию в транзакции
    const result = await db.transaction(async (trx) => {
      // Добавляем запчасть к ремонту
      const [repairPart] = await trx('repair_parts')
        .insert({
          repair_id: id,
          part_id,
          quantity_used: parseInt(quantity_used),
          added_by: req.user.id,
        })
        .returning('*');

      // Создаем транзакцию расхода
      await trx('transactions').insert({
        company_id: req.user.company_id,
        type: 'expense',
        part_id,
        part_name: part.name,
        quantity: parseInt(quantity_used),
        description: `Использовано в ремонте: ${repair.description}`,
        equipment_id: repair.equipment_id,
        repair_id: id,
        user_id: req.user.id,
      });

      // Обновляем количество запчасти
      await trx('parts')
        .where('id', part_id)
        .update({
          quantity: part.quantity - parseInt(quantity_used),
          updated_at: trx.fn.now(),
        });

      return repairPart;
    });

    res.status(201).json({
      success: true,
      message: 'Запчасть успешно добавлена к ремонту',
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// Добавление персонала к ремонту
router.post('/:id/staff', requirePermission('can_manage_equipment'), [
  body('staff_id')
    .isUUID()
    .withMessage('Некорректный ID сотрудника'),
  body('hours_worked')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Отработанные часы должны быть неотрицательным числом'),
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
    const { staff_id, hours_worked, notes } = req.body;

    // Проверяем существование ремонта
    const repair = await db('repairs')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Ремонт не найден'
      });
    }

    // Проверяем существование сотрудника
    const staff = await db('staff')
      .where('id', staff_id)
      .where('company_id', req.user.company_id)
      .first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Сотрудник не найден'
      });
    }

    // Проверяем, что сотрудник еще не назначен на этот ремонт
    const existingAssignment = await db('repair_staff')
      .where('repair_id', id)
      .where('staff_id', staff_id)
      .first();

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        error: 'Сотрудник уже назначен на этот ремонт'
      });
    }

    // Добавляем сотрудника к ремонту
    const [repairStaff] = await db('repair_staff')
      .insert({
        repair_id: id,
        staff_id,
        hours_worked: parseFloat(hours_worked) || 0,
        notes,
        assigned_by: req.user.id,
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: 'Сотрудник успешно назначен на ремонт',
      data: repairStaff
    });

  } catch (error) {
    next(error);
  }
});

// Завершение ремонта
router.post('/:id/complete', requirePermission('can_manage_equipment'), [
  body('actual_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Фактические часы должны быть неотрицательным числом'),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Стоимость работ должна быть неотрицательным числом'),
  body('notes')
    .optional()
    .trim(),
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
    const { actual_hours, labor_cost, notes } = req.body;

    // Проверяем существование ремонта
    const repair = await db('repairs')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Ремонт не найден'
      });
    }

    if (repair.status === 'Завершен') {
      return res.status(400).json({
        success: false,
        error: 'Ремонт уже завершен'
      });
    }

    // Завершаем ремонт в транзакции
    await db.transaction(async (trx) => {
      // Рассчитываем общую стоимость
      const partsCoast = await trx('repair_parts')
        .join('parts', 'repair_parts.part_id', 'parts.id')
        .where('repair_parts.repair_id', id)
        .sum(trx.raw('repair_parts.quantity_used * COALESCE(parts.price, 0) as total'))
        .first();

      const totalPartsCoast = parseFloat(partsCoast.total) || 0;
      const totalLaborCost = parseFloat(labor_cost) || 0;
      const totalCost = totalPartsCoast + totalLaborCost;

      // Обновляем ремонт
      await trx('repairs')
        .where('id', id)
        .update({
          status: 'Завершен',
          end_date: trx.fn.now(),
          actual_hours: parseFloat(actual_hours) || null,
          labor_cost: totalLaborCost,
          parts_cost: totalPartsCoast,
          total_cost: totalCost,
          completion_notes: notes,
          completed_by: req.user.id,
          updated_at: trx.fn.now(),
        });

      // Обновляем статус техники
      await trx('equipment')
        .where('id', repair.equipment_id)
        .update({
          status: 'Рабочее',
          updated_at: trx.fn.now(),
        });
    });

    res.json({
      success: true,
      message: 'Ремонт успешно завершен'
    });

  } catch (error) {
    next(error);
  }
});

// Получение статистики ремонтов
router.get('/stats/overview', requirePermission('can_manage_equipment'), async (req, res, next) => {
  try {
    const stats = await db.raw(`
      SELECT 
        COUNT(*) as total_repairs,
        COUNT(*) FILTER (WHERE status = 'Запланирован') as planned,
        COUNT(*) FILTER (WHERE status = 'В процессе') as in_progress,
        COUNT(*) FILTER (WHERE status = 'Завершен') as completed,
        COUNT(*) FILTER (WHERE status = 'Отменен') as cancelled,
        AVG(CASE WHEN status = 'Завершен' THEN total_cost END) as avg_repair_cost,
        SUM(CASE WHEN status = 'Завершен' THEN total_cost ELSE 0 END) as total_repair_costs,
        AVG(CASE WHEN status = 'Завершен' AND end_date IS NOT NULL AND start_date IS NOT NULL 
             THEN EXTRACT(DAY FROM (end_date - start_date)) END) as avg_repair_days
      FROM repairs 
      WHERE company_id = ?
    `, [req.user.company_id]);

    // Ремонты по месяцам (последние 12 месяцев)
    const monthlyStats = await db.raw(`
      SELECT 
        DATE_TRUNC('month', start_date) as month,
        COUNT(*) as total_repairs,
        COUNT(*) FILTER (WHERE status = 'Завершен') as completed_repairs,
        SUM(CASE WHEN status = 'Завершен' THEN total_cost ELSE 0 END) as total_cost
      FROM repairs 
      WHERE company_id = ? AND start_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', start_date)
      ORDER BY month DESC
    `, [req.user.company_id]);

    res.json({
      success: true,
      data: {
        overview: stats.rows[0],
        monthly_stats: monthlyStats.rows
      }
    });

  } catch (error) {
    next(error);
  }
});

// Удаление ремонта (только если не начат)
router.delete('/:id', requirePermission('can_manage_equipment'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем существование ремонта
    const repair = await db('repairs')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Ремонт не найден'
      });
    }

    // Проверяем, что ремонт можно удалить (только если статус "Запланирован")
    if (repair.status !== 'Запланирован') {
      return res.status(400).json({
        success: false,
        error: 'Можно удалять только запланированные ремонты'
      });
    }

    // Удаляем ремонт в транзакции
    await db.transaction(async (trx) => {
      // Удаляем связанные данные
      await trx('repair_parts').where('repair_id', id).del();
      await trx('repair_staff').where('repair_id', id).del();

      // Удаляем ремонт
      await trx('repairs').where('id', id).del();

      // Обновляем статус техники обратно на "Рабочее"
      await trx('equipment')
        .where('id', repair.equipment_id)
        .update({
          status: 'Рабочее',
          updated_at: trx.fn.now(),
        });
    });

    res.json({
      success: true,
      message: 'Ремонт успешно удален'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;