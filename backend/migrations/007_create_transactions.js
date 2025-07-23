exports.up = function(knex) {
  return knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.enum('type', ['arrival', 'expense']).notNullable();
    table.uuid('part_id').references('id').inTable('parts').onDelete('CASCADE');
    table.string('part_name').notNullable(); // Денормализация для быстрого поиска
    table.integer('quantity').notNullable();
    table.text('description');
    table.uuid('equipment_id').references('id').inTable('equipment').onDelete('SET NULL');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('device').defaultTo('Mobile App');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['company_id']);
    table.index(['type']);
    table.index(['part_id']);
    table.index(['equipment_id']);
    table.index(['user_id']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('transactions');
};