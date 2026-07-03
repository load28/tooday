import type { DatabaseSchema } from '@bff/db/schema';
import type { Kysely } from 'kysely';

export async function migrate(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('sessions')
    .ifNotExists()
    .addColumn('token', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id'))
    .addColumn('expires_at', 'integer', (col) => col.notNull())
    .execute();
}
