import type { DatabaseSchema } from '@bff/platform/db/schema';
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

  await db.schema
    .createTable('projects')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id'))
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('color', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('tasks')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id'))
    .addColumn('project_id', 'text', (col) => col.references('projects.id'))
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('date', 'text', (col) => col.notNull())
    .addColumn('start_at', 'text', (col) => col.notNull())
    .addColumn('duration_min', 'integer', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull())
    .execute();

  await db.schema.createIndex('tasks_user_id_date').ifNotExists().on('tasks').columns(['user_id', 'date']).execute();
}
