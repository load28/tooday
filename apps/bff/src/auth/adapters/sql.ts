import type { User } from '@tooday/shared';
import { z } from 'zod';
import type { SqlDatabase } from '../../db/ports';
import { DomainError } from '../../errors';
import type { CreateUserInput, Session, SessionStore, UserStore } from '../ports';
import { generateSessionToken } from '../session-token';

const userRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

const credentialsRowSchema = userRowSchema.extend({
  password_hash: z.string(),
});

const sessionRowSchema = z.object({
  token: z.string(),
  user_id: z.string(),
  expires_at: z.number(),
});

export class SqlUserStore implements UserStore {
  constructor(private readonly db: SqlDatabase) {}

  async create({ email, password, name }: CreateUserInput): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      throw new DomainError('EMAIL_TAKEN');
    }
    const user: User = { id: crypto.randomUUID(), email: normalizedEmail, name };
    const passwordHash = await Bun.password.hash(password);
    await this.db.run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [
      user.id,
      user.email,
      user.name,
      passwordHash,
    ]);
    return user;
  }

  async verifyCredentials({ email, password }: { email: string; password: string }): Promise<User | null> {
    const rows = await this.db.query('SELECT id, email, name, password_hash FROM users WHERE email = ?', [
      email.trim().toLowerCase(),
    ]);
    if (rows[0] === undefined) return null;
    const row = credentialsRowSchema.parse(rows[0]);
    const valid = await Bun.password.verify(password, row.password_hash);
    return valid ? { id: row.id, email: row.email, name: row.name } : null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.query('SELECT id, email, name FROM users WHERE id = ?', [id]);
    return rows[0] === undefined ? null : userRowSchema.parse(rows[0]);
  }
}

export class SqlSessionStore implements SessionStore {
  private readonly db: SqlDatabase;
  private readonly ttlMs: number;

  constructor({ db, ttlMs }: { db: SqlDatabase; ttlMs: number }) {
    this.db = db;
    this.ttlMs = ttlMs;
  }

  async create(userId: string): Promise<Session> {
    const session: Session = {
      token: generateSessionToken(),
      userId,
      expiresAt: Date.now() + this.ttlMs,
    };
    await this.db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [
      session.token,
      session.userId,
      session.expiresAt,
    ]);
    return session;
  }

  async get(token: string): Promise<Session | null> {
    const rows = await this.db.query('SELECT token, user_id, expires_at FROM sessions WHERE token = ?', [token]);
    if (rows[0] === undefined) return null;
    const row = sessionRowSchema.parse(rows[0]);
    if (row.expires_at <= Date.now()) {
      await this.revoke(token);
      return null;
    }
    return { token: row.token, userId: row.user_id, expiresAt: row.expires_at };
  }

  async revoke(token: string): Promise<void> {
    await this.db.run('DELETE FROM sessions WHERE token = ?', [token]);
  }
}
