import type { ProjectColor, TaskStatus } from '@tooday/shared';
import type { Generated } from 'kysely';

export interface UsersTable {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SessionsTable {
  /** 토큰 원문은 저장하지 않는다 — DB 유출이 곧 세션 탈취가 되지 않도록 SHA-256 해시만 */
  token_hash: string;
  user_id: string;
  expires_at: Date;
  created_at: Generated<Date>;
}

export interface ProjectsTable {
  id: string;
  user_id: string;
  name: string;
  color: ProjectColor;
  /** 수동 정렬 — fractional index 키 (collate "C", platform/ordering.ts로만 생성) */
  position: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TasksTable {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  /** 'YYYY-MM-DD' — 시간대 없는 캘린더 날짜. 문자열 비교가 곧 날짜 비교 */
  date: string;
  /** 'HH:mm' */
  start_at: string;
  duration_min: number;
  status: TaskStatus;
  /** 수동 정렬 — fractional index 키 (collate "C", platform/ordering.ts로만 생성) */
  position: string;
  /** 낙관적 잠금 — 쓰기마다 +1, 클라이언트는 읽은 version으로 갱신을 조건부 실행한다 */
  version: Generated<number>;
  completed_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

/** Kysely가 컴파일 타임에 쿼리를 검증하는 기준 스키마 */
export interface DatabaseSchema {
  users: UsersTable;
  sessions: SessionsTable;
  projects: ProjectsTable;
  tasks: TasksTable;
}
