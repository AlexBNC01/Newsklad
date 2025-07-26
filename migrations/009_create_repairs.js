exports.up = function(knex) {
  return knex.schema.createTable('repairs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('equipment_id').references('id').inTable('equipment').onDelete('CASCADE');
    table.enum('status', ['В процессе', 'Завершен']).defaultTo('В процессе');
    table.timestamp('start_date').defaultTo(knex.fn.now());
    table.timestamp('end_date');
    table.text('description');
    table.decimal('total_cost', 12, 2).defaultTo(0);
    table.decimal('labor_cost', 12, 2).defaultTo(0);
    table.decimal('completion_engine_hours', 10, 2);
    table.decimal('completion_mileage', 12, 2);
    table.text('completion_notes');
    table.decimal('final_cost', 12, 2);
    table.jsonb('photos').defaultTo('[]');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['company_id']);
    table.index(['equipment_id']);
    table.index(['status']);
    table.index(['start_date']);
    table.index(['end_date']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('repairs');
};