exports.up = function(knex) {
  return knex.schema.createTable('files', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('original_name').notNullable();
    table.string('file_type').notNullable(); // MIME type
    table.integer('file_size').notNullable(); // в байтах
    table.string('s3_key').notNullable(); // путь в S3
    table.string('public_url').notNullable(); // публичный URL
    table.string('thumbnail_key'); // путь к миниатюре в S3
    table.string('thumbnail_url'); // публичный URL миниатюры
    table.text('description');
    table.jsonb('tags').defaultTo('[]');
    table.enum('status', ['pending', 'completed', 'failed']).defaultTo('pending');
    table.timestamp('uploaded_at');
    table.timestamps(true, true);
    
    // Индексы
    table.index(['company_id']);
    table.index(['user_id']);
    table.index(['file_type']);
    table.index(['status']);
    table.index(['original_name']);
    table.index(['uploaded_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('files');
};