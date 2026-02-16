import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '../../../.env') });

export default {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: resolve(import.meta.dirname, '../db/migrations'),
    extension: 'ts',
  },
};
