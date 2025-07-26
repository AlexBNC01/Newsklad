const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

// GET /api/companies - Получить информацию о компании
router.get('/', auth, async (req, res) => {
  try {
    const company = await db('companies')
      .where('id', req.user.company_id)
      .first();

    if (!company) {
      return res.status(404).json({ error: 'Компания не найдена' });
    }

    res.json({
      id: company.id,
      name: company.name,
      settings: JSON.parse(company.settings || '{}'),
      subscription: JSON.parse(company.subscription || '{}'),
      created_at: company.created_at
    });
  } catch (error) {
    console.error('Ошибка получения компании:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/companies - Обновить настройки компании
router.put('/', auth, async (req, res) => {
  try {
    const { name, settings } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (settings) updateData.settings = JSON.stringify(settings);
    updateData.updated_at = new Date();

    await db('companies')
      .where('id', req.user.company_id)
      .update(updateData);

    const updatedCompany = await db('companies')
      .where('id', req.user.company_id)
      .first();

    res.json({
      id: updatedCompany.id,
      name: updatedCompany.name,
      settings: JSON.parse(updatedCompany.settings || '{}'),
      subscription: JSON.parse(updatedCompany.subscription || '{}'),
      updated_at: updatedCompany.updated_at
    });
  } catch (error) {
    console.error('Ошибка обновления компании:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/companies/stats - Получить статистику компании
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = {};

    // Подсчет пользователей
    const usersCount = await db('users')
      .where('company_id', req.user.company_id)
      .count('* as count')
      .first();
    stats.users = parseInt(usersCount.count);

    // Подсчет оборудования
    const equipmentCount = await db('equipment')
      .where('company_id', req.user.company_id)
      .count('* as count')
      .first();
    stats.equipment = parseInt(equipmentCount.count);

    // Подсчет запчастей
    const partsCount = await db('parts')
      .where('company_id', req.user.company_id)
      .count('* as count')
      .first();
    stats.parts = parseInt(partsCount.count);

    // Подсчет контейнеров
    const containersCount = await db('containers')
      .where('company_id', req.user.company_id)
      .count('* as count')
      .first();
    stats.containers = parseInt(containersCount.count);

    // Подсчет активных ремонтов
    const activeRepairsCount = await db('repairs')
      .join('equipment', 'repairs.equipment_id', 'equipment.id')
      .where('equipment.company_id', req.user.company_id)
      .where('repairs.status', '!=', 'Завершен')
      .count('* as count')
      .first();
    stats.activeRepairs = parseInt(activeRepairsCount.count);

    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;