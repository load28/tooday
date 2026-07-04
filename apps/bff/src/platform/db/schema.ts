import type { ProjectColor, TaskStatus } from '@tooday/shared';

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

export interface ProjectsTable {
  id: string;
  user_id: string;
  name: string;
  color: ProjectColor;
}

export interface TasksTable {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  /** 'YYYY-MM-DD' — 문자열 비교가 곧 날짜 비교 */
  date: string;
  /** 'HH:mm' */
  start_at: string;
  duration_min: number;
  status: TaskStatus;
}

/** Kysely가 컴파일 타임에 쿼리를 검증하는 기준 스키마 */
export interface DatabaseSchema {
  users: UsersTable;
  sessions: SessionsTable;
  projects: ProjectsTable;
  tasks: TasksTable;
}
