import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('channels', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('server_id').notNullable().references('id').inTable('servers').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.enum('type', ['text', 'voice']).notNullable().defaultTo('text');
    table.integer('position').notNullable().defaultTo(0);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('channels');
}
