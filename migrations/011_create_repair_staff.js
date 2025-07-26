exports.up = function(knex) {
  return knex.schema.createTable('repair_staff', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('repair_id').references('id').inTable('repairs').onDelete('CASCADE');
    table.uuid('staff_id').references('id').inTable('staff').onDelete('CASCADE');
    table.string('staff_name').notNullable();
    table.string('staff_position');
    table.decimal('hours', 8, 2).notNullable();
    table.decimal('hourly_rate', 8, 2).notNullable();
    table.decimal('labor_cost', 12, 2).notNullable();
    table.text('description');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['repair_id']);
    table.index(['staff_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('repair_staff');
};