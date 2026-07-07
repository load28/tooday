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
  /** 회전 세션 식별자(sid) — 로그인 시 하나 발급, 회전해도 유지된다. 재사용 탐지 단위. */
  sessionId: string;
  /** idle 만료(슬라이딩) — 회전할 때마다 now+idle로 다시 연장된다. */
  expiresAt: number;
  /** 절대 만료(하드캡) — 로그인 시 박히고 회전해도 안 늘어난다. */
  absoluteExpiresAt: number;
}

export interface RefreshTokenStore {
  /** 로그인/회원가입 — 새 세션의 리프레시 토큰. absolute 캡을 지금부터 건다. */
  issue(userId: string): Promise<RefreshToken>;
  /**
   * 회전 — 유효하면 옛 토큰을 supersede하고 같은 세션의 새 토큰을 발급한다
   * (idle 슬라이딩, absolute 유지). 없거나 idle/absolute 만료면 null.
   *
   * 재사용 탐지: 이미 supersede된(=한 번 회전된) 토큰이 다시 제시되면 탈취 신호로 보고
   * 세션 전체를 무효화한 뒤 null을 돌려준다.
   */
  rotate(token: string): Promise<RefreshToken | null>;
  /** 로그아웃 — 해당 토큰이 속한 세션 전체를 폐기 */
  revoke(token: string): Promise<void>;
  /**
   * 세션 라이브니스 체크 — 매 요청 액세스 JWT 검증 뒤 `sid`로 호출한다.
   * 세션은 자기 리프레시 토큰으로 존재한다: 살아있으면 true, 폐기(로그아웃/재사용 탐지)
   * 됐거나 absolute 만료면 false. 무상태 액세스에 즉시 무효화를 부여하는 유일한 지점.
   */
  isSessionLive(sessionId: string): Promise<boolean>;
  /** 만료(idle/absolute) 토큰 청소 배치 — 삭제한 행 수를 반환한다 */
  deleteExpired(): Promise<number>;
}
