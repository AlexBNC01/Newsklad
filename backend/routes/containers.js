const express = require('express');
const { body, validationResult } = require('express-validator');
const { requirePermission } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Получение списка всех контейнеров
router.get('/', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const containers = await db('containers')
      .select(
        'containers.*',
        db.raw('COUNT(parts.id) as parts_count'),
        db.raw('COALESCE(SUM(parts.quantity), 0) as total_parts_quantity')
      )
      .leftJoin('parts', 'containers.id', 'parts.container_id')
      .where('containers.company_id', req.user.company_id)
      .groupBy('containers.id')
      .orderBy('containers.name');

    res.json({
      success: true,
      data: containers
    });

  } catch (error) {
    next(error);
  }
});

// Получение конкретного контейнера с содержимым
router.get('/:id', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Получаем информацию о контейнере
    const container = await db('containers')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!container) {
      return res.status(404).json({
        success: false,
        error: 'Контейнер не найден'
      });
    }

    // Получаем запчасти в контейнере
    const parts = await db('parts')
      .select('id', 'name', 'article', 'type', 'quantity', 'price')
      .where('container_id', id)
      .orderBy('name');

    // Статистика контейнера
    const stats = await db('parts')
      .where('container_id', id)
      .select(
        db.raw('COUNT(*) as total_parts'),
        db.raw('SUM(quantity) as total_quantity'),
        db.raw('SUM(quantity * COALESCE(price, 0)) as total_value'),
        db.raw('COUNT(DISTINCT type) as unique_types')
      )
      .first();

    res.json({
      success: true,
      data: {
        ...container,
        parts,
        stats
      }
    });

  } catch (error) {
    next(error);
  }
});

// Создание нового контейнера
router.post('/', requirePermission('can_manage_inventory'), [
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Название контейнера обязательно'),
  body('location')
    .optional()
    .trim(),
  body('description')
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

    const { name, location, description } = req.body;

    // Проверяем уникальность названия в рамках компании
    const existingContainer = await db('containers')
      .where('name', name)
      .where('company_id', req.user.company_id)
      .first();

    if (existingContainer) {
      return res.status(409).json({
        success: false,
        error: 'Контейнер с таким названием уже существует'
      });
    }

    // Создаем контейнер
    const [container] = await db('containers')
      .insert({
        company_id: req.user.company_id,
        name,
        location,
        description,
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: 'Контейнер успешно создан',
      data: container
    });

  } catch (error) {
    next(error);
  }
});

// Обновление контейнера
router.patch('/:id', requirePermission('can_manage_inventory'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Название контейнера не может быть пустым'),
  body('location')
    .optional()
    .trim(),
  body('description')
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
    const { name, location, description } = req.body;

    // Проверяем существование контейнера
    const existingContainer = await db('containers')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!existingContainer) {
      return res.status(404).json({
        success: false,
        error: 'Контейнер не найден'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет данных для обновления'
      });
    }

    // Проверяем уникальность названия (если оно изменилось)
    if (name && name !== existingContainer.name) {
      const duplicateContainer = await db('containers')
        .where('name', name)
        .where('company_id', req.user.company_id)
        .where('id', '!=', id)
        .first();

      if (duplicateContainer) {
        return res.status(409).json({
          success: false,
          error: 'Контейнер с таким названием уже существует'
        });
      }
    }

    updateData.updated_at = db.fn.now();

    // Обновляем контейнер
    await db('containers')
      .where('id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Контейнер успешно обновлен'
    });

  } catch (error) {
    next(error);
  }
});

// Удаление контейнера
router.delete('/:id', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем существование контейнера
    const container = await db('containers')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!container) {
      return res.status(404).json({
        success: false,
        error: 'Контейнер не найден'
      });
    }

    // Проверяем, есть ли запчасти в контейнере
    const partsCount = await db('parts')
      .where('container_id', id)
      .count('* as count')
      .first();

    if (parseInt(partsCount.count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Контейнер содержит запчасти и не может быть удален'
      });
    }

    // Удаляем контейнер
    await db('containers')
      .where('id', id)
      .del();

    res.json({
      success: true,
      message: 'Контейнер успешно удален'
    });

  } catch (error) {
    next(error);
  }
});

// Перемещение запчастей между контейнерами
router.post('/:id/move-parts', requirePermission('can_manage_inventory'), [
  body('part_ids')
    .isArray({ min: 1 })
    .withMessage('Необходимо указать минимум одну запчасть'),
  body('part_ids.*')
    .isUUID()
    .withMessage('Некорректный ID запчасти'),
  body('target_container_id')
    .optional()
    .custom(value => value === null || (typeof value === 'string' && value.length > 0))
    .withMessage('Некорректный ID целевого контейнера'),
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
    const { part_ids, target_container_id } = req.body;

    // Проверяем существование исходного контейнера
    const sourceContainer = await db('containers')
      .where('id', id)
      .where('company_id', req.user.company_id)
      .first();

    if (!sourceContainer) {
      return res.status(404).json({
        success: false,
        error: 'Исходный контейнер не найден'
      });
    }

    // Проверяем существование целевого контейнера (если указан)
    if (target_container_id) {
      const targetContainer = await db('containers')
        .where('id', target_container_id)
        .where('company_id', req.user.company_id)
        .first();

      if (!targetContainer) {
        return res.status(404).json({
          success: false,
          error: 'Целевой контейнер не найден'
        });
      }
    }

    // Проверяем, что все запчасти принадлежат компании и находятся в исходном контейнере
    const parts = await db('parts')
      .whereIn('id', part_ids)
      .where('company_id', req.user.company_id)
      .where('container_id', id);

    if (parts.length !== part_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'Некоторые запчасти не найдены в указанном контейнере'
      });
    }

    // Перемещаем запчасти
    await db('parts')
      .whereIn('id', part_ids)
      .update({
        container_id: target_container_id,
        updated_at: db.fn.now(),
      });

    res.json({
      success: true,
      message: `Успешно перемещено ${part_ids.length} запчастей`,
      data: {
        moved_parts_count: part_ids.length,
        source_container: sourceContainer.name,
        target_container: target_container_id ? 'выбранный контейнер' : 'без контейнера'
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение статистики контейнеров
router.get('/stats/overview', requirePermission('can_manage_inventory'), async (req, res, next) => {
  try {
    const stats = await db.raw(`
      SELECT 
        COUNT(DISTINCT containers.id) as total_containers,
        COUNT(DISTINCT containers.id) FILTER (WHERE parts.id IS NOT NULL) as used_containers,
        COUNT(DISTINCT containers.id) FILTER (WHERE parts.id IS NULL) as empty_containers,
        COUNT(parts.id) as total_parts_in_containers,
        SUM(parts.quantity) as total_quantity_in_containers,
        SUM(parts.quantity * COALESCE(parts.price, 0)) as total_value_in_containers
      FROM containers 
      LEFT JOIN parts ON containers.id = parts.container_id
      WHERE containers.company_id = ?
    `, [req.user.company_id]);

    // Топ-5 контейнеров по количеству запчастей
    const topContainers = await db('containers')
      .select(
        'containers.name',
        'containers.location',
        db.raw('COUNT(parts.id) as parts_count'),
        db.raw('SUM(parts.quantity) as total_quantity')
      )
      .leftJoin('parts', 'containers.id', 'parts.container_id')
      .where('containers.company_id', req.user.company_id)
      .groupBy('containers.id', 'containers.name', 'containers.location')
      .orderBy('parts_count', 'desc')
      .limit(5);

    // Запчасти без контейнера
    const partsWithoutContainer = await db('parts')
      .where('company_id', req.user.company_id)
      .whereNull('container_id')
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        overview: stats.rows[0],
        top_containers: topContainers,
        parts_without_container: parseInt(partsWithoutContainer.count)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;