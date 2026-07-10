import type { AccessTokenService } from '@bff/modules/auth/access-token';
import type { AuthGateway } from '@bff/modules/auth/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { newId } from '@bff/platform/ids';
import type { AuthResponse, LoginRequest, SignupRequest, TokenPair, User } from '@tooday/shared';

/*
 * 테스트 전용 인메모리 세계 — 러스트 API(apps/api)가 소유한 내부 동작(계정·리프레시
 * 회전·재사용 탐지·세션 라이브니스)을 프로세스 안에서 그대로 흉내 낸다.
 * app.test.ts가 이 어댑터로 BFF 조립(쿠키·캐시·에러 매핑) 계약을 검증하므로,
 * 의미는 러스트 구현과 일치해야 한다 (러스트 쪽 진실: apps/api/src/auth/*).
 */

function generateRefreshToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

interface UserRecord extends User {
  passwordHash: string;
}

function toUser({ id, email, name }: UserRecord): User {
  return { id, email, name };
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

export class InMemoryUserStore {
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

  /** user 모듈의 UserReader를 구조적으로 충족한다 — 같은 가짜 users 테이블 읽기. */
  async findById(id: string): Promise<User | null> {
    const record = this.byId.get(id);
    return record ? toUser(record) : null;
  }
}

export interface RefreshToken {
  token: string;
  userId: string;
  /** 회전 세션 식별자(sid) — 로그인 시 하나 발급, 회전해도 유지. 재사용 탐지 단위. */
  sessionId: string;
  /** idle 만료(슬라이딩) */
  expiresAt: number;
  /** 절대 만료(하드캡) */
  absoluteExpiresAt: number;
}

interface TokenRecord extends RefreshToken {
  supersededAt: number | null;
}

export class InMemoryRefreshTokenStore {
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

    // 옛 토큰은 supersede 마킹만(재사용 탐지용), 새 토큰은 같은 세션으로 idle 슬라이딩 + absolute 캡.
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

export interface InMemoryAuthGatewayDeps {
  users: InMemoryUserStore;
  refreshTokens: InMemoryRefreshTokenStore;
  accessTokens: AccessTokenService;
}

/** 인증 흐름 게이트웨이의 인메모리 구현 — 러스트 API의 /internal/auth/*와 의미 동일. */
export class InMemoryAuthGateway implements AuthGateway {
  constructor(private readonly deps: InMemoryAuthGatewayDeps) {}

  /** 세션(리프레시) 발급 + 그 세션의 sid로 액세스 서명 — 러스트 issue_tokens와 동형. */
  private async issueTokens(userId: string): Promise<TokenPair> {
    const refresh = await this.deps.refreshTokens.issue(userId);
    return {
      accessToken: await this.deps.accessTokens.sign({ userId, sessionId: refresh.sessionId }),
      refreshToken: refresh.token,
    };
  }

  async signup(input: SignupRequest): Promise<AuthResponse> {
    const user = await this.deps.users.create(input);
    return { user, ...(await this.issueTokens(user.id)) };
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const user = await this.deps.users.verifyCredentials(input);
    if (!user) {
      throw new DomainError(DOMAIN_ERROR_CODES.INVALID_CREDENTIALS);
    }
    return { user, ...(await this.issueTokens(user.id)) };
  }

  async refresh(refreshToken: string): Promise<TokenPair | null> {
    const rotated = await this.deps.refreshTokens.rotate(refreshToken);
    if (!rotated) return null;
    return {
      accessToken: await this.deps.accessTokens.sign({ userId: rotated.userId, sessionId: rotated.sessionId }),
      refreshToken: rotated.token,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.deps.refreshTokens.revoke(refreshToken);
  }

  async verifyAccessToken(accessToken: string | null): Promise<string | null> {
    if (!accessToken) return null;
    const claims = await this.deps.accessTokens.verify(accessToken);
    if (!claims) return null;
    try {
      return (await this.deps.refreshTokens.isSessionLive(claims.sessionId)) ? claims.userId : null;
    } catch {
      // fail-closed — 라이브니스를 판정하지 못하면 거부한다.
      return null;
    }
  }
}
