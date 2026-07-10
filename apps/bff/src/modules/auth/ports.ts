import type { AuthResponse, LoginRequest, SignupRequest, TokenPair } from '@tooday/shared';

/**
 * 인증 흐름 게이트웨이 — BFF는 이 계약으로 조립(쿠키·tRPC 매핑)만 하고,
 * 실제 내부 동작(비밀번호 해싱, 토큰 발급·회전, 재사용 탐지, 세션 라이브니스)은
 * 러스트 API(apps/api)가 소유한다. HTTP 어댑터가 기본이고, 테스트는 인메모리 어댑터를 쓴다.
 */
export interface AuthGateway {
  /** 계정 생성 + 세션 발급. 중복 이메일이면 DomainError(EMAIL_TAKEN)를 던진다. */
  signup(input: SignupRequest): Promise<AuthResponse>;
  /** 자격 증명 검증 + 세션 발급. 불일치면 DomainError(INVALID_CREDENTIALS)를 던진다. */
  login(input: LoginRequest): Promise<AuthResponse>;
  /**
   * 리프레시 회전 — 유효하면 새 토큰 쌍(idle 슬라이딩 + absolute 캡, 같은 세션).
   * 없거나 만료·재사용 탐지(세션 무효화)면 null.
   */
  refresh(refreshToken: string): Promise<TokenPair | null>;
  /** 로그아웃 — 토큰이 속한 세션 전체를 폐기 */
  logout(refreshToken: string): Promise<void>;
  /**
   * 인증 핫패스 — 액세스 JWT 서명·만료 검증 + 세션 라이브니스 체크(즉시 무효화)를
   * 한 번에. 유효하면 userId, 아니면 null. 저장소·API 장애는 fail-closed로 거부한다.
   */
  verifyAccessToken(accessToken: string | null): Promise<string | null>;
}
