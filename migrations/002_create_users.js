exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('full_name').notNullable();
    table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.enum('role', ['admin', 'manager', 'worker']).defaultTo('worker');
    table.jsonb('permissions').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_active_at');
    table.string('avatar_url');
    table.string('phone');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['email']);
    table.index(['company_id']);
    table.index(['role']);
    table.index(['is_active']);
    table.index(['last_active_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};