exports.up = function(knex) {
  return knex.schema.createTable('staff', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('position');
    table.decimal('hourly_rate', 8, 2);
    table.string('phone');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Индексы
    table.index(['company_id']);
    table.index(['name']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('staff');
};