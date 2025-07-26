exports.up = function(knex) {
  return knex.schema.createTable('equipment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.string('type').notNullable(); // Трактор, КамАЗ и т.д.
    table.string('model').notNullable();
    table.string('serial_number');
    table.string('license_plate');
    table.string('year');
    table.enum('status', ['Исправен', 'В ремонте', 'Неисправен']).defaultTo('Исправен');
    table.decimal('engine_hours', 10, 2).defaultTo(0);
    table.decimal('mileage', 12, 2).defaultTo(0);
    table.jsonb('photos').defaultTo('[]');
    table.text('description');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['company_id']);
    table.index(['type']);
    table.index(['status']);
    table.index(['serial_number']);
    table.index(['license_plate']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('equipment');
};