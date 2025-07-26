exports.up = function(knex) {
  return knex.schema.createTable('repair_parts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('repair_id').references('id').inTable('repairs').onDelete('CASCADE');
    table.uuid('part_id').references('id').inTable('parts').onDelete('CASCADE');
    table.string('part_name').notNullable();
    table.string('part_article');
    table.integer('quantity').notNullable();
    table.decimal('unit_price', 12, 2);
    table.decimal('total_price', 12, 2);
    table.text('description');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['repair_id']);
    table.index(['part_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('repair_parts');
};