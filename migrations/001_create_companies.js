exports.up = function(knex) {
  return knex.schema.createTable('companies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.jsonb('settings').defaultTo('{}');
    table.jsonb('subscription').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Индексы
    table.index(['name']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('companies');
};