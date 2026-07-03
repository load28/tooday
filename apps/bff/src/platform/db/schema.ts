export interface UsersTable {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export interface SessionsTable {
  token: string;
  user_id: string;
  expires_at: number;
}

/** Kysely가 컴파일 타임에 쿼리를 검증하는 기준 스키마 */
export interface DatabaseSchema {
  users: UsersTable;
  sessions: SessionsTable;
}
