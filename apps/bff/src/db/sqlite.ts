import { Database } from 'bun:sqlite';
import type { SqlDatabase, SqlValue } from './ports';

export function createSqliteDatabase(path: string): SqlDatabase {
  const db = new Database(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  return {
    async query(sql: string, params: readonly SqlValue[] = []): Promise<unknown[]> {
      return db.query(sql).all(...params);
    },
    async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
      db.query(sql).run(...params);
    },
  };
}
