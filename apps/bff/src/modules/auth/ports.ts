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
  /** 회전 계보(lineage) 식별자 — 로그인 시 하나 발급, 회전해도 유지된다. 재사용 탐지 단위. */
  familyId: string;
  /** idle 만료(슬라이딩) — 회전할 때마다 now+idle로 다시 연장된다. */
  expiresAt: number;
  /** 절대 만료(하드캡) — 로그인 시 박히고 회전해도 안 늘어난다. */
  absoluteExpiresAt: number;
}

export interface RefreshTokenStore {
  /** 로그인/회원가입 — 새 계보의 리프레시 토큰. absolute 캡을 지금부터 건다. */
  issue(userId: string): Promise<RefreshToken>;
  /**
   * 회전 — 유효하면 옛 토큰을 supersede하고 같은 계보의 새 토큰을 발급한다
   * (idle 슬라이딩, absolute 유지). 없거나 idle/absolute 만료면 null.
   *
   * 재사용 탐지: 이미 supersede된(=한 번 회전된) 토큰이 다시 제시되면 탈취 신호로 보고
   * 계보(family) 전체를 무효화한 뒤 null을 돌려준다.
   */
  rotate(token: string): Promise<RefreshToken | null>;
  /** 로그아웃 — 해당 토큰이 속한 계보 전체를 폐기 */
  revoke(token: string): Promise<void>;
  /** 만료(idle/absolute) 토큰 청소 배치 — 삭제한 행 수를 반환한다 */
  deleteExpired(): Promise<number>;
}
