import type { SqlDatabase } from './ports';

const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
  )`,
];

export async function migrate(db: SqlDatabase): Promise<void> {
  for (const statement of MIGRATIONS) {
    await db.run(statement);
  }
}
