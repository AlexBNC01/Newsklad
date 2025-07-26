exports.up = function(knex) {
  return knex.schema.createTable('email_verifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('code', 6).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);

    table.index(['user_id', 'code']);
    table.index('expires_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('email_verifications');
};