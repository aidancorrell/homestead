import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Token version for refresh token revocation
    table.integer('token_version').notNullable().defaultTo(0);
    // Make email optional (invite-only registration, no email needed)
    table.string('email', 255).nullable().alter();
  });

  // Drop the unique constraint on email (it may still be unique but nullable)
  await knex.schema.alterTable('users', (table) => {
    table.dropUnique(['email']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('token_version');
    table.string('email', 255).notNullable().alter();
    table.unique(['email']);
  });
}
