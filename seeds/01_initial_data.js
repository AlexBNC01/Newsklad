/**
 * Начальные данные для Timeweb Cloud Apps
 * Создает базовые записи при первом запуске
 */

exports.seed = async function(knex) {
  console.log('🌱 Создание начальных данных...');
  
  try {
    // Проверяем, есть ли уже данные
    const existingCompanies = await knex('companies').select('*').limit(1);
    
    if (existingCompanies.length > 0) {
      console.log('📊 Данные уже существуют, пропускаем seed');
      return;
    }
    
    console.log('🏢 Создание демо-компании...');
    
    // Создаем демо-компанию
    const [demoCompany] = await knex('companies').insert({
      name: 'Демо Компания',
      settings: JSON.stringify({
        currency: 'RUB',
        timezone: 'Europe/Moscow',
        inventory_alerts: true,
        maintenance_alerts: true,
      }),
      subscription: JSON.stringify({
        plan: 'free',
        users_limit: null,
        storage_limit_gb: null,
        expires_at: null,
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }).returning('*');
    
    console.log('👤 Создание демо-пользователя...');
    
    // Создаем демо-админа (пароль: demo123)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('demo123', 12);
    
    const [demoUser] = await knex('users').insert({
      email: 'demo@skladreact.ru',
      password_hash: hashedPassword,
      full_name: 'Демо Администратор',
      company_id: demoCompany.id,
      role: 'admin',
      permissions: JSON.stringify({
        can_manage_users: true,
        can_manage_equipment: true,
        can_manage_inventory: true,
        can_view_reports: true,
        can_export_data: true,
      }),
      is_active: true,
      email_verified: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }).returning('*');
    
    console.log('📦 Создание демо-контейнеров...');
    
    // Создаем базовые контейнеры
    await knex('containers').insert([
      {
        name: 'Склад А1',
        location: 'Основной склад',
        description: 'Основное хранилище запчастей',
        company_id: demoCompany.id,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        name: 'Склад Б1',
        location: 'Дополнительный склад',
        description: 'Запчасти для спецтехники',
        company_id: demoCompany.id,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        name: 'Мобильный склад',
        location: 'Сервисный автомобиль',
        description: 'Часто используемые запчасти',
        company_id: demoCompany.id,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ]);
    
    console.log('👥 Создание демо-персонала...');
    
    // Создаем демо-персонал
    await knex('staff').insert([
      {
        name: 'Иван Петров',
        position: 'Слесарь',
        hourly_rate: 500,
        phone: '+7 (999) 123-45-67',
        company_id: demoCompany.id,
        is_active: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        name: 'Сергей Сидоров',
        position: 'Механик',
        hourly_rate: 600,
        phone: '+7 (999) 234-56-78',
        company_id: demoCompany.id,
        is_active: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ]);
    
    console.log('🚜 Создание демо-техники...');
    
    // Создаем демо-технику
    await knex('equipment').insert([
      {
        type: 'Трактор',
        model: 'МТЗ-82',
        serial_number: 'МТЗ123456',
        license_plate: 'A123BC77',
        year: 2018,
        status: 'Исправен',
        engine_hours: 1250,
        mileage: 45000,
        company_id: demoCompany.id,
        photos: JSON.stringify([]),
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        type: 'КамАЗ',
        model: 'КамАЗ-5320',
        serial_number: 'КАМ789012',
        license_plate: 'В456ЕК99',
        year: 2020,
        status: 'Исправен',
        engine_hours: 950,
        mileage: 78000,
        company_id: demoCompany.id,
        photos: JSON.stringify([]),
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ]);
    
    console.log('✅ Начальные данные созданы успешно!');
    console.log('🔑 Демо-доступ:');
    console.log('   Email: demo@skladreact.ru');
    console.log('   Пароль: demo123');
    
  } catch (error) {
    console.error('❌ Ошибка создания начальных данных:', error);
    throw error;
  }
};