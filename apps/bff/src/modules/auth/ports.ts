import type { User } from '@tooday/shared';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

export interface UserStore {
  create(input: CreateUserInput): Promise<User>;
  verifyCredentials(input: { email: string; password: string }): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export interface RefreshToken {
  /** 원문 — 클라이언트만 가진다. 저장소에는 해시로만 남긴다(불투명 문자열). */
  token: string;
  userId: string;
  /** idle 만료(슬라이딩) — 회전할 때마다 now+idle로 다시 연장된다. */
  expiresAt: number;
  /** 절대 만료(하드캡) — 로그인 시 박히고 회전해도 안 늘어난다. */
  absoluteExpiresAt: number;
}

export interface RefreshTokenStore {
  /** 로그인/회원가입 — 새 리프레시 토큰. absolute 캡을 지금부터 건다. */
  issue(userId: string): Promise<RefreshToken>;
  /**
   * 회전 — 유효하면 옛 토큰을 폐기하고 새 토큰을 발급한다(idle 슬라이딩, absolute 유지).
   * 없거나 idle/absolute 만료면 null. 로그아웃 없이 세션을 이어가는 유일한 경로.
   */
  rotate(token: string): Promise<RefreshToken | null>;
  /** 로그아웃 — 해당 토큰 폐기 */
  revoke(token: string): Promise<void>;
  /** 만료(idle/absolute) 토큰 청소 배치 — 삭제한 행 수를 반환한다 */
  deleteExpired(): Promise<number>;
}
