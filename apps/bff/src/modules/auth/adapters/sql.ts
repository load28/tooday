import type { CreateUserInput, RefreshToken, RefreshTokenStore, UserStore } from '@bff/modules/auth/ports';
import { generateRefreshToken, hashRefreshToken } from '@bff/modules/auth/refresh-token';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { newId } from '@bff/platform/ids';
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
    const user: User = { id: newId(), email: normalizedEmail, name };
    await this.db
      .insertInto('users')
      .values({ ...user, password_hash: await Bun.password.hash(password) })
      .execute();
    return user;
  }

  async verifyCredentials({ email, password }: { email: string; password: string }): Promise<User | null> {
    const row = await this.db
      .selectFrom('users')
      .select(['id', 'email', 'name', 'password_hash'])
      .where('email', '=', email.trim().toLowerCase())
      .executeTakeFirst();
    if (!row) return null;
    const valid = await Bun.password.verify(password, row.password_hash);
    return valid ? { id: row.id, email: row.email, name: row.name } : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.selectFrom('users').select(['id', 'email', 'name']).where('id', '=', id).executeTakeFirst();
    return row ?? null;
  }
}

export class SqlRefreshTokenStore implements RefreshTokenStore {
  private readonly db: Kysely<DatabaseSchema>;
  private readonly idleTtlMs: number;
  private readonly absoluteTtlMs: number;

  constructor({ db, idleTtlMs, absoluteTtlMs }: { db: Kysely<DatabaseSchema>; idleTtlMs: number; absoluteTtlMs: number }) {
    this.db = db;
    this.idleTtlMs = idleTtlMs;
    this.absoluteTtlMs = absoluteTtlMs;
  }

  async issue(userId: string): Promise<RefreshToken> {
    const now = Date.now();
    const token: RefreshToken = {
      token: generateRefreshToken(),
      userId,
      expiresAt: now + this.idleTtlMs,
      absoluteExpiresAt: now + this.absoluteTtlMs,
    };
    await this.insert(token);
    return token;
  }

  async rotate(token: string): Promise<RefreshToken | null> {
    const now = Date.now();
    const row = await this.db
      .selectFrom('refresh_tokens')
      .select(['user_id', 'expires_at', 'absolute_expires_at'])
      .where('token_hash', '=', hashRefreshToken(token))
      .executeTakeFirst();
    if (!row) return null;

    const idleExpired = row.expires_at.getTime() <= now;
    const absoluteExpired = row.absolute_expires_at.getTime() <= now;
    if (idleExpired || absoluteExpired) {
      await this.revoke(token);
      return null;
    }

    // idle는 슬라이딩(now+idle)하되 absolute 캡을 넘지 못한다.
    const next: RefreshToken = {
      token: generateRefreshToken(),
      userId: row.user_id,
      expiresAt: Math.min(now + this.idleTtlMs, row.absolute_expires_at.getTime()),
      absoluteExpiresAt: row.absolute_expires_at.getTime(),
    };
    // 옛 토큰 폐기 + 새 토큰 발급을 한 트랜잭션으로 — 회전은 원자적이어야 한다.
    await this.db.transaction().execute(async (tx) => {
      await tx.deleteFrom('refresh_tokens').where('token_hash', '=', hashRefreshToken(token)).execute();
      await tx.insertInto('refresh_tokens').values(this.toRow(next)).execute();
    });
    return next;
  }

  async revoke(token: string): Promise<void> {
    await this.db.deleteFrom('refresh_tokens').where('token_hash', '=', hashRefreshToken(token)).execute();
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    // 드라이버별 affected-rows 보고 차이를 타지 않도록 RETURNING으로 직접 센다.
    const rows = await this.db
      .deleteFrom('refresh_tokens')
      .where((eb) => eb.or([eb('expires_at', '<=', now), eb('absolute_expires_at', '<=', now)]))
      .returning('token_hash')
      .execute();
    return rows.length;
  }

  private async insert(token: RefreshToken): Promise<void> {
    await this.db.insertInto('refresh_tokens').values(this.toRow(token)).execute();
  }

  private toRow(token: RefreshToken) {
    return {
      token_hash: hashRefreshToken(token.token),
      user_id: token.userId,
      expires_at: new Date(token.expiresAt),
      absolute_expires_at: new Date(token.absoluteExpiresAt),
    };
  }
}
