exports.up = function(knex) {
  return knex.schema.createTable('containers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('location');
    table.text('description');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['company_id']);
    table.index(['name']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('containers');
};