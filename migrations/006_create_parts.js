exports.up = function(knex) {
  return knex.schema.createTable('parts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('article'); // Артикул
    table.string('type'); // Тип запчасти
    table.integer('quantity').defaultTo(0);
    table.decimal('price', 12, 2);
    table.uuid('container_id').references('id').inTable('containers').onDelete('SET NULL');
    table.string('barcode');
    table.text('description');
    table.string('supplier');
    table.decimal('weight', 8, 2); // кг
    table.string('brand');
    table.integer('warranty_months');
    table.jsonb('photos').defaultTo('[]');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['company_id']);
    table.index(['name']);
    table.index(['article']);
    table.index(['type']);
    table.index(['barcode']);
    table.index(['container_id']);
    table.index(['quantity']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('parts');
};