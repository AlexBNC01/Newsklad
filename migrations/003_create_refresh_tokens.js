exports.up = function(knex) {
  return knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.text('token').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
    
    // Индексы
    table.index(['user_id']);
    table.index(['token']);
    table.index(['expires_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('refresh_tokens');
};