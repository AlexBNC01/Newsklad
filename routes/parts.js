const express = require('express');
const { body, validationResult } = require('express-validator');
const { requirePermission } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Получение списка запчастей с фильтрацией и поиском
router.get('/', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      type = 'all',
      container_id = 'all',
      low_stock = 'false',
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;

    const offset = (page - 1) * limit;

    let query = db('parts')
      .select(
        'parts.*',
        'containers.name as container_name',
        'containers.location as container_location'
      )
      .leftJoin('containers', 'parts.container_id', 'containers.id')
      .where('parts.company_id', req.user.company_id);

    // Поиск по названию или артикулу
    if (search) {
      query = query.where(function() {
        this.whereRaw('parts.name ILIKE ?', [`%${search}%`])
          .orWhereRaw('parts.article ILIKE ?', [`%${search}%`])
          .orWhereRaw('parts.barcode ILIKE ?', [`%${search}%`]);
      });
    }

    // Фильтр по типу
    if (type !== 'all') {
      query = query.where('parts.type', type);
    }

    // Фильтр по контейнеру
    if (container_id !== 'all') {
      query = query.where('parts.container_id', container_id);
    }

    // Фильтр по низким остаткам
    if (low_stock === 'true') {
      query = query.where('parts.quantity', '<', 5);
    }

    // Получаем общее количество
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('parts.id as count');
    const total = parseInt(count);

    // Сортировка
    const allowedSortFields = ['name', 'article', 'type', 'quantity', 'price', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = ['asc', 'desc'].includes(sort_order) ? sort_order : 'desc';

    // Получаем запчасти с пагинацией
    const parts = await query
      .orderBy(`parts.${sortField}`, sortDirection)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        parts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          search,
          type,
          container_id,
          low_stock,
          sort_by: sortField,
          sort_order: sortDirection,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение конкретной запчасти
router.get('/:id', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const part = await db('parts')
      .select(
        'parts.*',
        'containers.name as container_name',
        'containers.location as container_location'
      )
      .leftJoin('containers', 'parts.container_id', 'containers.id')
      .where('parts.id', id)
      .where('parts.company_id', req.user.company_id)
      .first();

    if (!part) {
      return res.status(404).json({
        success: false,
        error: 'Запчасть не найдена'
      });
    }

    // Получаем историю транзакций для этой запчасти
    const transactions = await db('transactions')
      .select(
        'transactions.*',
        'users.full_name as user_name',
        'equipment.type as equipment_type',
        'equipment.model as equipment_model'
      )
      .leftJoin('users', 'transactions.user_id', 'users.id')
      .leftJoin('equipment', 'transactions.equipment_id', 'equipment.id')
      .where('transactions.part_id', id)
      .orderBy('transactions.created_at', 'desc')
      .limit(20);

    res.json({
      success: true,
      data: {
        ...part,
        transactions
      }
    });

  } catch (error) {
    next(error);
  }
});

// Создание новой запчасти
router.post('/', requirePermission('can_manage_inventory'), [
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Название запчасти обязательно'),
  body('article')
    .optional()
    .trim(),
  body('type')
    .optional()
    .trim(),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Количество должно быть неотрицательным числом'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Цена должна быть неотрицательным числом'),
  body('container_id')
    .optional()
    .isUUID()
    .withMessage('Некорректный ID контейнера'),
  body('barcode')
    .optional()
    .trim(),
  body('supplier')
    .optional()
    .trim(),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Вес должен быть неотрицательным числом'),
  body('brand')
    .optional()
    .trim(),
  body('warranty_months')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Гарантия должна быть неотрицательным числом'),
  body('description')
    .optional()
    .trim(),
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
      name,
      article,
      type,
      quantity,
      price,
      container_id,
      barcode,
      supplier,
      weight,
      brand,
      warranty_months,
      description,
      photos = []
    } = req.body;

    // Проверяем уникальность артикула в рамках компании
    if (article) {
      const existingPart = await db('parts')
        .where('article', article)
        .where('company_id', req.user.company_id)
        .first();

      if (existingPart) {
        return res.status(409).json({
          success: false,
          error: 'Запчасть с таким артикулом уже существует'
        });
      }
    }

    // Проверяем существование контейнера
    if (container_id) {
      const container = await db('containers')
        .where('id', container_id)
        .where('company_id', req.user.company_id)
        .first();

      if (!container) {
        return res.status(404).json({
          success: false,
          error: 'Контейнер не найден'
        });
      }
    }

    // Создаем запчасть в транзакции
    const result = await db.transaction(async (trx) => {
      // Создаем запчасть
      const [part] = await trx('parts')
        .insert({
          company_id: req.user.company_id,
          name,
          article,
          type,
          quantity: parseInt(quantity) || 0,
          price: parseFloat(price) || null,
          container_id: container_id || null,
          barcode,
          supplier,
          weight: parseFloat(weight) || null,
          brand,
          warranty_months: parseInt(warranty_months) || null,
          description,
          photos: JSON.stringify(photos),
        })
        .returning('*');

      // Создаем транзакцию поступления, если количество > 0
      if (parseInt(quantity) > 0) {
        await trx('transactions').insert({
          company_id: req.user.company_id,
          type: 'arrival',
          part_id: part.id,
          part_name: part.name,
          quantity: parseInt(quantity),
          description: `Начальное поступление: ${part.name}`,
          user_id: req.user.id,
        });
      }

      return part;
    });

    res.status(201).json({
      success: true,
      message: 'Запчасть успешно создана',
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// Обновление запчасти
router.patch('/:id', requirePermission('can_manage_inventory'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Название запчасти не может быть пустым'),
  body('article')
    .optional()
    .trim(),
  body('type')
    .optional()
    .trim(),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Цена должна быть неотрицательным числом'),
  body('container_id')
    .optional()
    .custom(value => value === null || (typeof value === 'string' && value.length > 0))
    .withMessage('Некорректный ID контейнера'),
  body('supplier')
    .optional()
    .trim(),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Вес должен быть неотрицательным числом'),
  body('brand')
    .optional()
    .trim(),
  body('warranty_months')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Гарантия должна быть неотрицательным числом'),
  body('description')
    .optional()
    .trim(),
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
    const updateData = {};

    // Проверяем существование запчасти
    const existingPart = await db('parts')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!existingPart) {
      return res.status(404).json({
        success: false,
        error: 'Запчасть не найдена'
      });
    }

    // Подготавливаем данные для обновления
    const allowedFields = [
      'name', 'article', 'type', 'price', 'container_id', 
      'supplier', 'weight', 'brand', 'warranty_months', 'description', 'photos'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'photos') {
          updateData[field] = JSON.stringify(req.body[field]);
        } else if (field === 'price' || field === 'weight') {
          updateData[field] = req.body[field] !== null ? parseFloat(req.body[field]) : null;
        } else if (field === 'warranty_months') {
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

    // Проверяем уникальность артикула (если он изменился)
    if (updateData.article && updateData.article !== existingPart.article) {
      const duplicatePart = await db('parts')
        .where('article', updateData.article)
        .where('company_id', req.user.company_id)
        .where('id', '!=', id)
        .first();

      if (duplicatePart) {
        return res.status(409).json({
          success: false,
          error: 'Запчасть с таким артикулом уже существует'
        });
      }
    }

    // Проверяем существование контейнера (если он изменился)
    if (updateData.container_id) {
      const container = await db('containers')
        .where('id', updateData.container_id)
        .where('company_id', req.user.company_id)
        .first();

      if (!container) {
        return res.status(404).json({
          success: false,
          error: 'Контейнер не найден'
        });
      }
    }

    updateData.updated_at = db.fn.now();

    // Обновляем запчасть
    await db('parts')
      .where('id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Запчасть успешно обновлена'
    });

  } catch (error) {
    next(error);
  }
});

// Обновление количества запчасти
router.patch('/:id/quantity', requirePermission('can_manage_inventory'), [
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Количество должно быть неотрицательным числом'),
  body('reason')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Причина изменения обязательна'),
  body('equipment_id')
    .optional()
    .isUUID()
    .withMessage('Некорректный ID техники'),
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
    const { quantity, reason, equipment_id } = req.body;

    // Получаем текущую запчасть
    const part = await db('parts')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!part) {
      return res.status(404).json({
        success: false,
        error: 'Запчасть не найдена'
      });
    }

    const oldQuantity = part.quantity;
    const newQuantity = parseInt(quantity);
    const difference = newQuantity - oldQuantity;

    if (difference === 0) {
      return res.status(400).json({
        success: false,
        error: 'Новое количество совпадает с текущим'
      });
    }

    // Обновляем в транзакции
    await db.transaction(async (trx) => {
      // Обновляем количество запчасти
      await trx('parts')
        .where('id', id)
        .update({
          quantity: newQuantity,
          updated_at: trx.fn.now(),
        });

      // Создаем транзакцию
      await trx('transactions').insert({
        company_id: req.user.company_id,
        type: difference > 0 ? 'arrival' : 'expense',
        part_id: id,
        part_name: part.name,
        quantity: Math.abs(difference),
        description: reason,
        equipment_id: equipment_id || null,
        user_id: req.user.id,
      });
    });

    res.json({
      success: true,
      message: 'Количество запчасти успешно обновлено',
      data: {
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        difference: difference
      }
    });

  } catch (error) {
    next(error);
  }
});

// Удаление запчасти
router.delete('/:id', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем существование запчасти
    const part = await db('parts')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!part) {
      return res.status(404).json({
        success: false,
        error: 'Запчасть не найдена'
      });
    }

    // Проверяем, используется ли запчасть в активных ремонтах
    const activeRepairs = await db('repair_parts')
      .join('repairs', 'repair_parts.repair_id', 'repairs.id')
      .where('repair_parts.part_id', id)
      .where('repairs.status', 'В процессе')
      .count('* as count')
      .first();

    if (parseInt(activeRepairs.count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Запчасть используется в активных ремонтах и не может быть удалена'
      });
    }

    // Удаляем запчасть (транзакции удалятся каскадно)
    await db('parts')
      .where('id', id)
      .del();

    res.json({
      success: true,
      message: 'Запчасть успешно удалена'
    });

  } catch (error) {
    next(error);
  }
});

// Получение статистики запчастей
router.get('/stats/overview', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const stats = await db.raw(`
      SELECT 
        COUNT(*) as total_parts,
        COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock,
        COUNT(*) FILTER (WHERE quantity < 5 AND quantity > 0) as low_stock,
        COUNT(*) FILTER (WHERE quantity >= 5) as in_stock,
        SUM(quantity) as total_quantity,
        SUM(quantity * COALESCE(price, 0)) as total_value,
        COUNT(DISTINCT type) as unique_types,
        COUNT(DISTINCT container_id) as used_containers
      FROM parts 
      WHERE company_id = ?
    `, [req.user.company_id]);

    // Топ-5 самых дорогих запчастей
    const expensiveParts = await db('parts')
      .select('name', 'price', 'quantity')
      .where('company_id', req.user.company_id)
      .whereNotNull('price')
      .orderBy('price', 'desc')
      .limit(5);

    // Топ-5 запчастей с самым низким остатком
    const lowStockParts = await db('parts')
      .select('name', 'quantity', 'type')
      .where('company_id', req.user.company_id)
      .where('quantity', '>', 0)
      .orderBy('quantity', 'asc')
      .limit(5);

    res.json({
      success: true,
      data: {
        overview: stats.rows[0],
        expensive_parts: expensiveParts,
        low_stock_parts: lowStockParts
      }
    });

  } catch (error) {
    next(error);
  }
});

// Поиск запчастей по штрих-коду
router.get('/search/barcode/:barcode', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const { barcode } = req.params;

    const parts = await db('parts')
      .select(
        'parts.*',
        'containers.name as container_name',
        'containers.location as container_location'
      )
      .leftJoin('containers', 'parts.container_id', 'containers.id')
      .where('parts.company_id', req.user.company_id)
      .where('parts.barcode', barcode);

    res.json({
      success: true,
      data: parts
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;