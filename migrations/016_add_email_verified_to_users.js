exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.boolean('email_verified').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('email_verified');
  });
};