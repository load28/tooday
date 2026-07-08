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

  /**
   * UserStore 포트 밖 메서드 — 인메모리 세계의 users 테이블 읽기.
   * 테스트 조립 루트가 이 인스턴스를 user 모듈의 UserReader로도 물린다(구조적 타이핑,
   * SQL 세계에서 두 모듈의 어댑터가 같은 테이블을 보는 것과 동형).
   */
  async findById(id: string): Promise<User | null> {
    const record = this.byId.get(id);
    return record ? toUser(record) : null;
  }
}

interface TokenRecord extends RefreshToken {
  supersededAt: number | null;
}

export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  private readonly tokens = new Map<string, TokenRecord>();
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
      sessionId: newId(),
      expiresAt: now + this.idleTtlMs,
      absoluteExpiresAt: now + this.absoluteTtlMs,
    };
    this.tokens.set(token.token, { ...token, supersededAt: null });
    return token;
  }

  async rotate(token: string): Promise<RefreshToken | null> {
    const now = Date.now();
    const current = this.tokens.get(token);
    if (!current) return null;

    // 이미 회전된(supersede된) 토큰의 재제시 = 탈취 신호 → 세션 전체 무효화.
    if (current.supersededAt !== null) {
      this.revokeSession(current.sessionId);
      return null;
    }
    if (current.expiresAt <= now || current.absoluteExpiresAt <= now) {
      this.tokens.delete(token);
      return null;
    }

    // 옛 토큰은 supersede 마킹만(재사용 탐지용, 만료 시 스윕이 청소), 새 토큰은 같은 세션으로.
    current.supersededAt = now;
    const next: RefreshToken = {
      token: generateRefreshToken(),
      userId: current.userId,
      sessionId: current.sessionId,
      expiresAt: Math.min(now + this.idleTtlMs, current.absoluteExpiresAt),
      absoluteExpiresAt: current.absoluteExpiresAt,
    };
    this.tokens.set(next.token, { ...next, supersededAt: null });
    return next;
  }

  async revoke(token: string): Promise<void> {
    const current = this.tokens.get(token);
    if (current) this.revokeSession(current.sessionId);
  }

  async isSessionLive(sessionId: string): Promise<boolean> {
    const now = Date.now();
    for (const record of this.tokens.values()) {
      if (record.sessionId === sessionId && record.absoluteExpiresAt > now) return true;
    }
    return false;
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

  private revokeSession(sessionId: string): void {
    for (const [token, record] of this.tokens) {
      if (record.sessionId === sessionId) this.tokens.delete(token);
    }
  }
}
