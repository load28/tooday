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

export interface RefreshTokensTable {
  /** 토큰 원문은 저장하지 않는다 — DB 유출이 곧 세션 탈취가 되지 않도록 SHA-256 해시만 */
  token_hash: string;
  user_id: string;
  /** idle 만료(슬라이딩) — 회전할 때마다 갱신된다 */
  expires_at: Date;
  /** 절대 만료(하드캡) — 로그인 시 박히고 회전해도 안 늘어난다 */
  absolute_expires_at: Date;
  created_at: Generated<Date>;
}

export interface ProjectsTable {
  id: string;
  user_id: string;
  name: string;
  color: ProjectColor;
  /** 수동 정렬 — fractional index 키 (collate "C", platform/ordering.ts로만 생성) */
  position: string;
  /** 이 행의 마지막 변경 seq — 델타 동기화 커서 기준. platform/db/sync.ts로만 발급 */
  sync_seq: Generated<number>;
  /** tombstone — 삭제도 델타에 실리도록 소프트 삭제. 읽기는 IS NULL만 */
  deleted_at: Date | null;
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
  /** 행 변경 카운터 — 쓰기마다 +1 (캐시 검증·디버깅용) */
  version: Generated<number>;
  /** 이 행의 마지막 변경 seq — 델타 동기화 커서 기준. platform/db/sync.ts로만 발급 */
  sync_seq: Generated<number>;
  /** tombstone — 삭제도 델타에 실리도록 소프트 삭제. 읽기는 IS NULL만 */
  deleted_at: Date | null;
  completed_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

/** 유저별 단조증가 동기화 시퀀스 — 발급은 platform/db/sync.ts의 withUserSyncSeq로만 */
export interface SyncCountersTable {
  user_id: string;
  seq: number;
}

/** Kysely가 컴파일 타임에 쿼리를 검증하는 기준 스키마 */
export interface DatabaseSchema {
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  projects: ProjectsTable;
  tasks: TasksTable;
  sync_counters: SyncCountersTable;
}
