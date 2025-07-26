exports.up = function(knex) {
  return knex.schema.createTable('report_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('report_type', 50).notNullable();
    table.string('title').notNullable();
    table.jsonb('filters');
    table.string('format', 10).defaultTo('json');
    table.jsonb('data');
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index(['company_id', 'generated_at']);
    table.index(['company_id', 'report_type']);
    table.index(['company_id', 'user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('report_history');
};