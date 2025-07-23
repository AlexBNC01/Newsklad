const express = require('express');
const { body, validationResult } = require('express-validator');
const { requirePermission } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Получение истории транзакций с фильтрацией
router.get('/', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      type = 'all',
      part_id,
      equipment_id,
      user_id,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;

    const offset = (page - 1) * limit;

    let query = db('transactions')
      .select(
        'transactions.*',
        'parts.name as part_name',
        'parts.article as part_article',
        'equipment.type as equipment_type',
        'equipment.model as equipment_model',
        'users.full_name as user_name'
      )
      .leftJoin('parts', 'transactions.part_id', 'parts.id')
      .leftJoin('equipment', 'transactions.equipment_id', 'equipment.id')
      .leftJoin('users', 'transactions.user_id', 'users.id')
      .where('transactions.company_id', req.user.company_id);

    // Фильтр по типу операции
    if (type !== 'all') {
      query = query.where('transactions.type', type);
    }

    // Фильтр по запчасти
    if (part_id) {
      query = query.where('transactions.part_id', part_id);
    }

    // Фильтр по технике
    if (equipment_id) {
      query = query.where('transactions.equipment_id', equipment_id);
    }

    // Фильтр по пользователю
    if (user_id) {
      query = query.where('transactions.user_id', user_id);
    }

    // Фильтр по датам
    if (start_date) {
      query = query.where('transactions.created_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('transactions.created_at', '<=', end_date);
    }

    // Получаем общее количество
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('transactions.id as count');
    const total = parseInt(count);

    // Сортировка
    const allowedSortFields = ['created_at', 'type', 'quantity', 'part_name'];
    const sortField = allowedSortFields.includes(sort_by) ? 
      (sort_by === 'part_name' ? 'parts.name' : `transactions.${sort_by}`) : 
      'transactions.created_at';
    const sortDirection = ['asc', 'desc'].includes(sort_order) ? sort_order : 'desc';

    // Получаем транзакции с пагинацией
    const transactions = await query
      .orderBy(sortField, sortDirection)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          type,
          part_id,
          equipment_id,
          user_id,
          start_date,
          end_date,
          sort_by,
          sort_order,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение конкретной транзакции
router.get('/:id', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await db('transactions')
      .select(
        'transactions.*',
        'parts.name as part_name',
        'parts.article as part_article',
        'parts.type as part_type',
        'equipment.type as equipment_type',
        'equipment.model as equipment_model',
        'equipment.serial_number as equipment_serial',
        'users.full_name as user_name',
        'users.email as user_email'
      )
      .leftJoin('parts', 'transactions.part_id', 'parts.id')
      .leftJoin('equipment', 'transactions.equipment_id', 'equipment.id')
      .leftJoin('users', 'transactions.user_id', 'users.id')
      .where('transactions.id', id)
      .where('transactions.company_id', req.user.company_id)
      .first();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Транзакция не найдена'
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    next(error);
  }
});

// Создание новой транзакции (поступление или расход)
router.post('/', requirePermission('can_manage_inventory'), [
  body('type')
    .isIn(['arrival', 'expense'])
    .withMessage('Тип транзакции должен быть arrival или expense'),
  body('part_id')
    .isUUID()
    .withMessage('Некорректный ID запчасти'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Количество должно быть положительным числом'),
  body('description')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Описание операции обязательно'),
  body('equipment_id')
    .optional()
    .isUUID()
    .withMessage('Некорректный ID техники'),
  body('repair_id')
    .optional()
    .isUUID()
    .withMessage('Некорректный ID ремонта'),
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
      part_id,
      quantity,
      description,
      equipment_id,
      repair_id
    } = req.body;

    // Получаем информацию о запчасти
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

    // Проверяем доступность запчасти для расхода
    if (type === 'expense' && part.quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `Недостаточно запчастей на складе. Доступно: ${part.quantity}`
      });
    }

    // Проверяем существование техники (если указана)
    if (equipment_id) {
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
    }

    // Проверяем существование ремонта (если указан)
    if (repair_id) {
      const repair = await db('repairs')
        .where('id', repair_id)
        .where('company_id', req.user.company_id)
        .first();

      if (!repair) {
        return res.status(404).json({
          success: false,
          error: 'Ремонт не найден'
        });
      }
    }

    // Выполняем операцию в транзакции
    const result = await db.transaction(async (trx) => {
      // Обновляем количество запчасти
      const newQuantity = type === 'arrival' 
        ? part.quantity + parseInt(quantity)
        : part.quantity - parseInt(quantity);

      await trx('parts')
        .where('id', part_id)
        .update({
          quantity: newQuantity,
          updated_at: trx.fn.now(),
        });

      // Создаем транзакцию
      const [transaction] = await trx('transactions')
        .insert({
          company_id: req.user.company_id,
          type,
          part_id,
          part_name: part.name,
          quantity: parseInt(quantity),
          description,
          equipment_id: equipment_id || null,
          repair_id: repair_id || null,
          user_id: req.user.id,
        })
        .returning('*');

      return transaction;
    });

    res.status(201).json({
      success: true,
      message: 'Транзакция успешно создана',
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// Получение статистики транзакций
router.get('/stats/overview', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;

    // Определяем период
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        dateFilter = "created_at >= NOW() - INTERVAL '90 days'";
        break;
      case '1y':
        dateFilter = "created_at >= NOW() - INTERVAL '1 year'";
        break;
      default:
        dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
    }

    // Общая статистика
    const stats = await db.raw(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE type = 'arrival') as arrivals,
        COUNT(*) FILTER (WHERE type = 'expense') as expenses,
        SUM(quantity) FILTER (WHERE type = 'arrival') as total_arrivals_quantity,
        SUM(quantity) FILTER (WHERE type = 'expense') as total_expenses_quantity,
        COUNT(DISTINCT part_id) as unique_parts,
        COUNT(DISTINCT equipment_id) as equipment_used
      FROM transactions 
      WHERE company_id = ? AND ${dateFilter}
    `, [req.user.company_id]);

    // Транзакции по дням (последние 30 дней)
    const dailyStats = await db.raw(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'arrival') as arrivals,
        COUNT(*) FILTER (WHERE type = 'expense') as expenses
      FROM transactions 
      WHERE company_id = ? AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [req.user.company_id]);

    // Топ-5 самых активных запчастей
    const topParts = await db('transactions')
      .select(
        'parts.name',
        'parts.article',
        db.raw('COUNT(*) as transaction_count'),
        db.raw('SUM(transactions.quantity) as total_quantity')
      )
      .join('parts', 'transactions.part_id', 'parts.id')
      .where('transactions.company_id', req.user.company_id)
      .whereRaw(dateFilter)
      .groupBy('parts.id', 'parts.name', 'parts.article')
      .orderBy('transaction_count', 'desc')
      .limit(5);

    res.json({
      success: true,
      data: {
        period,
        overview: stats.rows[0],
        daily_stats: dailyStats.rows,
        top_parts: topParts
      }
    });

  } catch (error) {
    next(error);
  }
});

// Массовое создание транзакций (для импорта)
router.post('/batch', requirePermission('can_manage_inventory'), [
  body('transactions')
    .isArray({ min: 1 })
    .withMessage('Необходимо передать массив транзакций'),
  body('transactions.*.type')
    .isIn(['arrival', 'expense'])
    .withMessage('Тип транзакции должен быть arrival или expense'),
  body('transactions.*.part_id')
    .isUUID()
    .withMessage('Некорректный ID запчасти'),
  body('transactions.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Количество должно быть положительным числом'),
  body('transactions.*.description')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Описание операции обязательно'),
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

    const { transactions } = req.body;

    // Ограничиваем количество транзакций в батче
    if (transactions.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Максимальное количество транзакций в одном запросе: 100'
      });
    }

    // Получаем все уникальные part_id для проверки
    const partIds = [...new Set(transactions.map(t => t.part_id))];
    const parts = await db('parts')
      .whereIn('id', partIds)
      .where('company_id', req.user.company_id)
      .select('id', 'name', 'quantity');

    const partsMap = new Map(parts.map(p => [p.id, p]));

    // Валидируем все транзакции
    const validationErrors = [];
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const part = partsMap.get(transaction.part_id);

      if (!part) {
        validationErrors.push(`Транзакция ${i + 1}: запчасть не найдена`);
        continue;
      }

      if (transaction.type === 'expense' && part.quantity < transaction.quantity) {
        validationErrors.push(`Транзакция ${i + 1}: недостаточно запчастей на складе (доступно: ${part.quantity})`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ошибки валидации транзакций',
        details: validationErrors
      });
    }

    // Выполняем все операции в одной транзакции
    const results = await db.transaction(async (trx) => {
      const createdTransactions = [];

      for (const transactionData of transactions) {
        const part = partsMap.get(transactionData.part_id);
        
        // Обновляем количество запчасти
        const newQuantity = transactionData.type === 'arrival' 
          ? part.quantity + parseInt(transactionData.quantity)
          : part.quantity - parseInt(transactionData.quantity);

        await trx('parts')
          .where('id', transactionData.part_id)
          .update({
            quantity: newQuantity,
            updated_at: trx.fn.now(),
          });

        // Создаем транзакцию
        const [transaction] = await trx('transactions')
          .insert({
            company_id: req.user.company_id,
            type: transactionData.type,
            part_id: transactionData.part_id,
            part_name: part.name,
            quantity: parseInt(transactionData.quantity),
            description: transactionData.description,
            equipment_id: transactionData.equipment_id || null,
            repair_id: transactionData.repair_id || null,
            user_id: req.user.id,
          })
          .returning('*');

        createdTransactions.push(transaction);

        // Обновляем количество в нашем локальном кеше для последующих транзакций
        part.quantity = newQuantity;
      }

      return createdTransactions;
    });

    res.status(201).json({
      success: true,
      message: `Успешно создано ${results.length} транзакций`,
      data: {
        count: results.length,
        transactions: results
      }
    });

  } catch (error) {
    next(error);
  }
});

// Отмена транзакции (только для администраторов)
router.post('/:id/cancel', requirePermission('can_manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Причина отмены обязательна'
      });
    }

    // Получаем транзакцию
    const transaction = await db('transactions')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Транзакция не найдена'
      });
    }

    // Проверяем, что транзакция еще не отменена
    if (transaction.cancelled_at) {
      return res.status(400).json({
        success: false,
        error: 'Транзакция уже отменена'
      });
    }

    // Получаем текущую запчасть
    const part = await db('parts')
      .where('id', transaction.part_id)
      .first();

    if (!part) {
      return res.status(404).json({
        success: false,
        error: 'Запчасть не найдена'
      });
    }

    // Отменяем транзакцию
    await db.transaction(async (trx) => {
      // Возвращаем количество запчасти
      const revertedQuantity = transaction.type === 'arrival' 
        ? part.quantity - transaction.quantity
        : part.quantity + transaction.quantity;

      await trx('parts')
        .where('id', transaction.part_id)
        .update({
          quantity: Math.max(0, revertedQuantity), // Не допускаем отрицательных значений
          updated_at: trx.fn.now(),
        });

      // Помечаем транзакцию как отмененную
      await trx('transactions')
        .where('id', id)
        .update({
          cancelled_at: trx.fn.now(),
          cancelled_by: req.user.id,
          cancellation_reason: reason.trim(),
        });
    });

    res.json({
      success: true,
      message: 'Транзакция успешно отменена'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;