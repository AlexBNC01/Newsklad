const express = require('express');
const { body, validationResult } = require('express-validator');
const { requirePermission } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Генерация отчета
router.post('/generate', requirePermission('can_view_reports'), [
  body('report_type')
    .isIn(['parts_inventory', 'equipment_status', 'repair_history', 'staff_workload', 'transactions', 'financial'])
    .withMessage('Недопустимый тип отчета'),
  body('format')
    .optional()
    .isIn(['html', 'json', 'csv'])
    .withMessage('Недопустимый формат отчета'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Фильтры должны быть объектом'),
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

    const { report_type, format = 'json', filters = {} } = req.body;

    let reportData;
    let reportTitle;

    switch (report_type) {
      case 'parts_inventory':
        reportData = await generatePartsInventoryReport(req.user.company_id, filters);
        reportTitle = 'Отчет по складским запчастям';
        break;

      case 'equipment_status':
        reportData = await generateEquipmentStatusReport(req.user.company_id, filters);
        reportTitle = 'Отчет по состоянию техники';
        break;

      case 'repair_history':
        reportData = await generateRepairHistoryReport(req.user.company_id, filters);
        reportTitle = 'История ремонтов';
        break;

      case 'staff_workload':
        reportData = await generateStaffWorkloadReport(req.user.company_id, filters);
        reportTitle = 'Отчет по загруженности персонала';
        break;

      case 'transactions':
        reportData = await generateTransactionsReport(req.user.company_id, filters);
        reportTitle = 'Отчет по операциям со складом';
        break;

      case 'financial':
        reportData = await generateFinancialReport(req.user.company_id, filters);
        reportTitle = 'Финансовый отчет';
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Неподдерживаемый тип отчета'
        });
    }

    // Сохраняем отчет в истории
    const [reportRecord] = await db('report_history')
      .insert({
        company_id: req.user.company_id,
        user_id: req.user.id,
        report_type,
        title: reportTitle,
        filters: JSON.stringify(filters),
        format,
        data: JSON.stringify(reportData),
        generated_at: db.fn.now(),
      })
      .returning('*');

    // Форматируем результат в зависимости от запрашиваемого формата
    let formattedData;
    switch (format) {
      case 'html':
        formattedData = generateHTMLReport(reportTitle, reportData);
        break;
      case 'csv':
        formattedData = generateCSVReport(reportData);
        break;
      default:
        formattedData = reportData;
    }

    res.json({
      success: true,
      data: {
        report_id: reportRecord.id,
        title: reportTitle,
        type: report_type,
        format,
        generated_at: reportRecord.generated_at,
        data: formattedData
      }
    });

  } catch (error) {
    next(error);
  }
});

// Отчет по складским запчастям
async function generatePartsInventoryReport(companyId, filters) {
  const {
    container_id,
    part_type,
    low_stock_only = false,
    include_photos = false
  } = filters;

  let query = db('parts')
    .select(
      'parts.id',
      'parts.name',
      'parts.article',
      'parts.type',
      'parts.quantity',
      'parts.price',
      'parts.supplier',
      'parts.brand',
      'containers.name as container_name',
      'containers.location as container_location'
    )
    .leftJoin('containers', 'parts.container_id', 'containers.id')
    .where('parts.company_id', companyId);

  if (container_id) {
    query = query.where('parts.container_id', container_id);
  }

  if (part_type) {
    query = query.where('parts.type', part_type);
  }

  if (low_stock_only) {
    query = query.where('parts.quantity', '<', 5);
  }

  const parts = await query.orderBy('parts.name');

  // Статистика
  const stats = await db('parts')
    .where('company_id', companyId)
    .select(
      db.raw('COUNT(*) as total_parts'),
      db.raw('SUM(quantity) as total_quantity'),
      db.raw('SUM(quantity * COALESCE(price, 0)) as total_value'),
      db.raw('COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock'),
      db.raw('COUNT(*) FILTER (WHERE quantity < 5 AND quantity > 0) as low_stock')
    )
    .first();

  return {
    summary: stats,
    parts,
    filters,
    generated_at: new Date().toISOString()
  };
}

// Отчет по состоянию техники
async function generateEquipmentStatusReport(companyId, filters) {
  const { equipment_type, status } = filters;

  let query = db('equipment')
    .select('*')
    .where('company_id', companyId);

  if (equipment_type) {
    query = query.where('type', equipment_type);
  }

  if (status) {
    query = query.where('status', status);
  }

  const equipment = await query.orderBy('type', 'model');

  // Статистика по статусам
  const statusStats = await db('equipment')
    .where('company_id', companyId)
    .select(
      'status',
      db.raw('COUNT(*) as count')
    )
    .groupBy('status');

  // Статистика по типам
  const typeStats = await db('equipment')
    .where('company_id', companyId)
    .select(
      'type',
      db.raw('COUNT(*) as count'),
      db.raw('AVG(engine_hours) as avg_engine_hours'),
      db.raw('AVG(mileage) as avg_mileage')
    )
    .groupBy('type');

  return {
    summary: {
      total_equipment: equipment.length,
      status_breakdown: statusStats,
      type_breakdown: typeStats
    },
    equipment,
    filters,
    generated_at: new Date().toISOString()
  };
}

// История ремонтов
async function generateRepairHistoryReport(companyId, filters) {
  const { 
    equipment_id, 
    start_date, 
    end_date, 
    status,
    include_parts = false,
    include_staff = false
  } = filters;

  let query = db('repairs')
    .select(
      'repairs.*',
      'equipment.type as equipment_type',
      'equipment.model as equipment_model',
      'equipment.serial_number as equipment_serial'
    )
    .leftJoin('equipment', 'repairs.equipment_id', 'equipment.id')
    .where('repairs.company_id', companyId);

  if (equipment_id) {
    query = query.where('repairs.equipment_id', equipment_id);
  }

  if (status) {
    query = query.where('repairs.status', status);
  }

  if (start_date) {
    query = query.where('repairs.start_date', '>=', start_date);
  }

  if (end_date) {
    query = query.where('repairs.start_date', '<=', end_date);
  }

  const repairs = await query.orderBy('repairs.start_date', 'desc');

  // Если нужно включить детали
  if (include_parts || include_staff) {
    for (let repair of repairs) {
      if (include_parts) {
        repair.parts = await db('repair_parts')
          .select(
            'repair_parts.*',
            'parts.name as part_name',
            'parts.article as part_article'
          )
          .leftJoin('parts', 'repair_parts.part_id', 'parts.id')
          .where('repair_parts.repair_id', repair.id);
      }

      if (include_staff) {
        repair.staff = await db('repair_staff')
          .select(
            'repair_staff.*',
            'staff.name as staff_name',
            'staff.position as staff_position'
          )
          .leftJoin('staff', 'repair_staff.staff_id', 'staff.id')
          .where('repair_staff.repair_id', repair.id);
      }
    }
  }

  // Статистика
  const stats = await db('repairs')
    .where('company_id', companyId)
    .select(
      db.raw('COUNT(*) as total_repairs'),
      db.raw('COUNT(*) FILTER (WHERE status = \'Завершен\') as completed'),
      db.raw('SUM(CASE WHEN status = \'Завершен\' THEN total_cost ELSE 0 END) as total_cost'),
      db.raw('AVG(CASE WHEN status = \'Завершен\' THEN total_cost END) as avg_cost')
    )
    .first();

  return {
    summary: stats,
    repairs,
    filters,
    generated_at: new Date().toISOString()
  };
}

// Отчет по загруженности персонала
async function generateStaffWorkloadReport(companyId, filters) {
  const { staff_id, start_date, end_date } = filters;

  let query = db('staff')
    .select('*')
    .where('company_id', companyId)
    .where('is_active', true);

  if (staff_id) {
    query = query.where('id', staff_id);
  }

  const staff = await query.orderBy('name');

  // Для каждого сотрудника получаем статистику
  for (let person of staff) {
    let repairQuery = db('repair_staff')
      .join('repairs', 'repair_staff.repair_id', 'repairs.id')
      .where('repair_staff.staff_id', person.id);

    if (start_date) {
      repairQuery = repairQuery.where('repairs.start_date', '>=', start_date);
    }

    if (end_date) {
      repairQuery = repairQuery.where('repairs.start_date', '<=', end_date);
    }

    const workloadStats = await repairQuery
      .select(
        db.raw('COUNT(DISTINCT repair_staff.repair_id) as total_repairs'),
        db.raw('COUNT(DISTINCT repair_staff.repair_id) FILTER (WHERE repairs.status = \'Завершен\') as completed_repairs'),
        db.raw('SUM(repair_staff.hours_worked) as total_hours'),
        db.raw('AVG(repair_staff.hours_worked) as avg_hours_per_repair')
      )
      .first();

    person.workload = workloadStats;
  }

  return {
    staff,
    filters,
    generated_at: new Date().toISOString()
  };
}

// Отчет по операциям со складом
async function generateTransactionsReport(companyId, filters) {
  const { 
    type, 
    part_id, 
    equipment_id, 
    start_date, 
    end_date,
    user_id 
  } = filters;

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
    .where('transactions.company_id', companyId);

  if (type) {
    query = query.where('transactions.type', type);
  }

  if (part_id) {
    query = query.where('transactions.part_id', part_id);
  }

  if (equipment_id) {
    query = query.where('transactions.equipment_id', equipment_id);
  }

  if (user_id) {
    query = query.where('transactions.user_id', user_id);
  }

  if (start_date) {
    query = query.where('transactions.created_at', '>=', start_date);
  }

  if (end_date) {
    query = query.where('transactions.created_at', '<=', end_date);
  }

  const transactions = await query.orderBy('transactions.created_at', 'desc');

  // Статистика
  const stats = await db('transactions')
    .where('company_id', companyId)
    .select(
      db.raw('COUNT(*) as total_transactions'),
      db.raw('COUNT(*) FILTER (WHERE type = \'arrival\') as arrivals'),
      db.raw('COUNT(*) FILTER (WHERE type = \'expense\') as expenses'),
      db.raw('SUM(quantity) FILTER (WHERE type = \'arrival\') as total_arrivals_qty'),
      db.raw('SUM(quantity) FILTER (WHERE type = \'expense\') as total_expenses_qty')
    )
    .first();

  return {
    summary: stats,
    transactions,
    filters,
    generated_at: new Date().toISOString()
  };
}

// Финансовый отчет
async function generateFinancialReport(companyId, filters) {
  const { start_date, end_date } = filters;

  // Стоимость ремонтов
  let repairCostsQuery = db('repairs')
    .where('company_id', companyId)
    .where('status', 'Завершен');

  if (start_date) {
    repairCostsQuery = repairCostsQuery.where('end_date', '>=', start_date);
  }

  if (end_date) {
    repairCostsQuery = repairCostsQuery.where('end_date', '<=', end_date);
  }

  const repairCosts = await repairCostsQuery
    .select(
      db.raw('COUNT(*) as total_repairs'),
      db.raw('SUM(total_cost) as total_repair_cost'),
      db.raw('SUM(parts_cost) as total_parts_cost'),
      db.raw('SUM(labor_cost) as total_labor_cost')
    )
    .first();

  // Стоимость закупленных запчастей (поступления)
  let purchasesQuery = db('transactions')
    .join('parts', 'transactions.part_id', 'parts.id')
    .where('transactions.company_id', companyId)
    .where('transactions.type', 'arrival');

  if (start_date) {
    purchasesQuery = purchasesQuery.where('transactions.created_at', '>=', start_date);
  }

  if (end_date) {
    purchasesQuery = purchasesQuery.where('transactions.created_at', '<=', end_date);
  }

  const purchases = await purchasesQuery
    .select(
      db.raw('COUNT(*) as total_purchases'),
      db.raw('SUM(transactions.quantity * COALESCE(parts.price, 0)) as total_purchase_cost')
    )
    .first();

  // Стоимость текущих запасов
  const inventoryValue = await db('parts')
    .where('company_id', companyId)
    .select(
      db.raw('SUM(quantity * COALESCE(price, 0)) as total_inventory_value')
    )
    .first();

  // Разбивка по типам техники
  const equipmentCosts = await db('repairs')
    .join('equipment', 'repairs.equipment_id', 'equipment.id')
    .where('repairs.company_id', companyId)
    .where('repairs.status', 'Завершен')
    .select(
      'equipment.type',
      db.raw('COUNT(*) as repair_count'),
      db.raw('SUM(repairs.total_cost) as total_cost'),
      db.raw('AVG(repairs.total_cost) as avg_cost_per_repair')
    )
    .groupBy('equipment.type')
    .orderBy('total_cost', 'desc');

  return {
    summary: {
      repair_costs: repairCosts,
      purchases: purchases,
      inventory_value: inventoryValue.total_inventory_value || 0
    },
    equipment_breakdown: equipmentCosts,
    filters,
    generated_at: new Date().toISOString()
  };
}

// Генерация HTML отчета
function generateHTMLReport(title, data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background: #f2f2f2; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Сгенерирован: ${new Date().toLocaleString('ru-RU')}</p>
    </div>
    
    <div class="summary">
        <h3>Сводка</h3>
        <pre>${JSON.stringify(data.summary || {}, null, 2)}</pre>
    </div>
    
    <div class="footer">
        <p>Отчет сгенерирован системой управления складом</p>
    </div>
</body>
</html>`;
}

// Генерация CSV отчета
function generateCSVReport(data) {
  if (!data || typeof data !== 'object') {
    return 'Нет данных для экспорта';
  }

  // Простейший CSV экспорт - здесь можно расширить логику
  const lines = ['Тип данных,Значение'];
  
  if (data.summary) {
    Object.entries(data.summary).forEach(([key, value]) => {
      lines.push(`${key},${value}`);
    });
  }

  return lines.join('\n');
}

// Получение истории отчетов
router.get('/history', requirePermission('can_view_reports'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      report_type = 'all',
      sort_by = 'generated_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    let query = db('report_history')
      .select(
        'id',
        'report_type',
        'title',
        'filters',
        'format',
        'generated_at',
        'user_id'
      )
      .where('company_id', req.user.company_id);

    if (report_type !== 'all') {
      query = query.where('report_type', report_type);
    }

    // Получаем общее количество
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('id as count');
    const total = parseInt(count);

    // Получаем отчеты с пагинацией
    const reports = await query
      .orderBy(sort_by, sort_order)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение сохраненного отчета
router.get('/:id', requirePermission('can_view_reports'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await db('report_history')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Отчет не найден'
      });
    }

    // Парсим данные
    let reportData;
    try {
      reportData = JSON.parse(report.data);
    } catch (e) {
      reportData = report.data;
    }

    res.json({
      success: true,
      data: {
        id: report.id,
        title: report.title,
        type: report.report_type,
        format: report.format,
        generated_at: report.generated_at,
        data: reportData
      }
    });

  } catch (error) {
    next(error);
  }
});

// Удаление отчета из истории
router.delete('/:id', requirePermission('can_view_reports'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await db('report_history')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .del();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Отчет не найден'
      });
    }

    res.json({
      success: true,
      message: 'Отчет удален из истории'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;