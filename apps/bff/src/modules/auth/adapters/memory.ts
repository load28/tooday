import type { CreateUserInput, RefreshToken, RefreshTokenStore, UserStore } from '@bff/modules/auth/ports';
import { generateRefreshToken } from '@bff/modules/auth/refresh-token';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { newId } from '@bff/platform/ids';
import type { User } from '@tooday/shared';

interface UserRecord extends User {
  passwordHash: string;
}

function toUser({ id, email, name }: UserRecord): User {
  return { id, email, name };
}

export class InMemoryUserStore implements UserStore {
  private readonly byId = new Map<string, UserRecord>();
  private readonly idByEmail = new Map<string, string>();

  async create({ email, password, name }: CreateUserInput): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.idByEmail.has(normalizedEmail)) {
      throw new DomainError(DOMAIN_ERROR_CODES.EMAIL_TAKEN);
    }
    const record: UserRecord = {
      id: newId(),
      email: normalizedEmail,
      name,
      passwordHash: await Bun.password.hash(password),
    };
    this.byId.set(record.id, record);
    this.idByEmail.set(normalizedEmail, record.id);
    return toUser(record);
  }

  async verifyCredentials({ email, password }: { email: string; password: string }): Promise<User | null> {
    const id = this.idByEmail.get(email.trim().toLowerCase());
    const record = id ? this.byId.get(id) : undefined;
    if (!record) return null;
    const valid = await Bun.password.verify(password, record.passwordHash);
    return valid ? toUser(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = this.byId.get(id);
    return record ? toUser(record) : null;
  }
}

export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  private readonly tokens = new Map<string, RefreshToken>();
  private readonly idleTtlMs: number;
  private readonly absoluteTtlMs: number;

  constructor({ idleTtlMs, absoluteTtlMs }: { idleTtlMs: number; absoluteTtlMs: number }) {
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
    this.tokens.set(token.token, token);
    return token;
  }

  async rotate(token: string): Promise<RefreshToken | null> {
    const now = Date.now();
    const current = this.tokens.get(token);
    if (!current) return null;
    if (current.expiresAt <= now || current.absoluteExpiresAt <= now) {
      this.tokens.delete(token);
      return null;
    }
    this.tokens.delete(token);
    const next: RefreshToken = {
      token: generateRefreshToken(),
      userId: current.userId,
      expiresAt: Math.min(now + this.idleTtlMs, current.absoluteExpiresAt),
      absoluteExpiresAt: current.absoluteExpiresAt,
    };
    this.tokens.set(next.token, next);
    return next;
  }

  async revoke(token: string): Promise<void> {
    this.tokens.delete(token);
  }

  async deleteExpired(): Promise<number> {
    const now = Date.now();
    let deleted = 0;
    for (const [token, record] of this.tokens) {
      if (record.expiresAt <= now || record.absoluteExpiresAt <= now) {
        this.tokens.delete(token);
        deleted += 1;
      }
    }
    return deleted;
  }
}
