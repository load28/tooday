import type { AuthGateway } from '@bff/modules/auth/ports';
import type { ApiClient } from '@bff/platform/api-client';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import type { AuthResponse, LoginRequest, SignupRequest, TokenPair } from '@tooday/shared';

/** 러스트 API의 인증 흐름 엔드포인트를 1:1로 호출하는 게이트웨이 어댑터. */
export class HttpAuthGateway implements AuthGateway {
  constructor(private readonly api: ApiClient) {}

  async signup(input: SignupRequest): Promise<AuthResponse> {
    // EMAIL_TAKEN은 api-client가 DomainError로 되살려 던진다 — 그대로 전파.
    return this.api.request({ method: 'POST', path: '/internal/auth/signup', body: input });
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    // INVALID_CREDENTIALS도 DomainError로 그대로 전파.
    return this.api.request({ method: 'POST', path: '/internal/auth/login', body: input });
  }

  async refresh(refreshToken: string): Promise<TokenPair | null> {
    try {
      return await this.api.request({ method: 'POST', path: '/internal/auth/refresh', body: { refreshToken } });
    } catch (error) {
      // 무효·만료·재사용 탐지 — 라우터가 쿠키 삭제 후 UNAUTHENTICATED로 응답한다.
      if (error instanceof DomainError && error.code === DOMAIN_ERROR_CODES.UNAUTHENTICATED) return null;
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.api.request({ method: 'POST', path: '/internal/auth/logout', body: { refreshToken } });
  }

  async verifyAccessToken(accessToken: string | null): Promise<string | null> {
    if (!accessToken) return null;
    try {
      const { userId } = await this.api.request<{ userId: string | null }>({
        method: 'POST',
        path: '/internal/auth/verify',
        body: { accessToken },
      });
      return userId;
    } catch {
      // API가 응답하지 못하면 fail-closed로 거부한다(가용성보다 보안 우선).
      return null;
    }
  }
}
