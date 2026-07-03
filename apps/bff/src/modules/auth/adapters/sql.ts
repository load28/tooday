import type { CreateUserInput, Session, SessionStore, UserStore } from '@bff/modules/auth/ports';
import { generateSessionToken } from '@bff/modules/auth/session-token';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import type { User } from '@tooday/shared';
import type { Kysely } from 'kysely';

export class SqlUserStore implements UserStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async create({ email, password, name }: CreateUserInput): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.db.selectFrom('users').select('id').where('email', '=', normalizedEmail).executeTakeFirst();
    if (existing) {
      throw new DomainError(DOMAIN_ERROR_CODES.EMAIL_TAKEN);
    }
    const user: User = { id: crypto.randomUUID(), email: normalizedEmail, name };
    await this.db
      .insertInto('users')
      .values({ ...user, password_hash: await Bun.password.hash(password) })
      .execute();
    return user;
  }

  async verifyCredentials({ email, password }: { email: string; password: string }): Promise<User | null> {
    const row = await this.db.selectFrom('users').selectAll().where('email', '=', email.trim().toLowerCase()).executeTakeFirst();
    if (!row) return null;
    const valid = await Bun.password.verify(password, row.password_hash);
    return valid ? { id: row.id, email: row.email, name: row.name } : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.selectFrom('users').select(['id', 'email', 'name']).where('id', '=', id).executeTakeFirst();
    return row ?? null;
  }
}

export class SqlSessionStore implements SessionStore {
  private readonly db: Kysely<DatabaseSchema>;
  private readonly ttlMs: number;

  constructor({ db, ttlMs }: { db: Kysely<DatabaseSchema>; ttlMs: number }) {
    this.db = db;
    this.ttlMs = ttlMs;
  }

  async create(userId: string): Promise<Session> {
    const session: Session = {
      token: generateSessionToken(),
      userId,
      expiresAt: Date.now() + this.ttlMs,
    };
    await this.db
      .insertInto('sessions')
      .values({ token: session.token, user_id: session.userId, expires_at: session.expiresAt })
      .execute();
    return session;
  }

  async get(token: string): Promise<Session | null> {
    const row = await this.db.selectFrom('sessions').selectAll().where('token', '=', token).executeTakeFirst();
    if (!row) return null;
    if (row.expires_at <= Date.now()) {
      await this.revoke(token);
      return null;
    }
    return { token: row.token, userId: row.user_id, expiresAt: row.expires_at };
  }

  async revoke(token: string): Promise<void> {
    await this.db.deleteFrom('sessions').where('token', '=', token).execute();
  }
}
