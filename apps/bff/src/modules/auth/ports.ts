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

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface SessionWithUser {
  session: Session;
  user: User;
}

export interface SessionStore {
  create(userId: string): Promise<Session>;
  get(token: string): Promise<Session | null>;
  /** 인증 핫패스 — 세션과 유저를 한 번에 (SQL 구현은 단일 조인 쿼리) */
  getWithUser(token: string): Promise<SessionWithUser | null>;
  revoke(token: string): Promise<void>;
  /** 만료 세션 청소 배치 — 삭제한 행 수를 반환한다 */
  deleteExpired(): Promise<number>;
}
