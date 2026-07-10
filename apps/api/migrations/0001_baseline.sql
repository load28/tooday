-- 0001 — 베이스라인 (BFF Kysely 마이그레이션 0001~0006의 최종 스키마).
--
-- 기존 배포 DB에는 이미 이 스키마가 있으므로 전부 IF NOT EXISTS로 선언한다 —
-- 신규 DB는 이 파일 하나로 최종 형태가 만들어지고, 기존 DB에서는 no-op이다.
-- (이후 스키마 변경은 새 번호의 sqlx 마이그레이션으로만 추가한다.)
--
-- 인덱스 이름은 기존 DB의 실제 이름(테이블 rename 이력 포함)을 따른다 —
-- 다른 이름으로 만들면 기존 DB에 중복 인덱스가 생긴다.

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 이메일 소문자 정규화를 앱 레이어에만 의존하지 않고 DB가 보장한다
  constraint users_email_lowercase check (email = lower(email))
);

-- 액세스(JWT, 무상태) + 리프레시(회전) 모델의 리프레시 토큰 저장소.
-- 토큰 원문은 저장하지 않는다 — DB 유출이 곧 세션 탈취가 되지 않도록 SHA-256 해시만.
create table if not exists refresh_tokens (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  -- 회전 세션 식별자(sid) — 재사용 탐지 시 이 단위로 일괄 무효화한다
  session_id uuid not null,
  -- idle 만료(슬라이딩) — 회전할 때마다 갱신된다
  expires_at timestamptz not null,
  -- 절대 만료(하드캡) — 로그인 시 박히고 회전해도 안 늘어난다
  absolute_expires_at timestamptz not null,
  -- 회전으로 폐기된 시각. NULL이면 활성 토큰. 재사용 탐지를 위해 만료까지 보존한다
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);
-- 유저 단위 일괄 무효화(전 기기 로그아웃) 경로 (구 sessions 테이블 시절 이름 유지)
create index if not exists sessions_user_id on refresh_tokens (user_id);
-- 만료 토큰 청소 배치 경로
create index if not exists sessions_expires_at on refresh_tokens (expires_at);
-- 재사용 탐지 시 세션 전체를 지우는 경로
create index if not exists refresh_tokens_session_id on refresh_tokens (session_id);

create table if not exists projects (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  color text not null,
  -- 수동 정렬 — fractional index 키. 바이트 순서 비교 전제라 collate "C" 필수
  position text collate "C" not null,
  -- 이 행의 마지막 변경 seq — 델타 동기화 커서 기준
  sync_seq integer not null default 0,
  -- tombstone — 삭제도 델타에 실리도록 소프트 삭제. 읽기는 IS NULL만
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_empty check (length(name) > 0),
  constraint projects_color_valid check (color in ('blue', 'mint', 'violet', 'amber', 'pink', 'gray'))
);
create index if not exists projects_user_id_position on projects (user_id, position);
create index if not exists projects_user_id_sync_seq on projects (user_id, sync_seq);

create table if not exists tasks (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  -- 프로젝트 삭제가 태스크를 지우면 안 된다 — 라벨만 떼어낸다
  project_id uuid references projects(id) on delete set null,
  title text not null,
  -- 'YYYY-MM-DD' — 시간대 없는 캘린더 날짜. 문자열 비교가 곧 날짜 비교
  date text not null,
  -- 'HH:mm'
  start_at text not null,
  duration_min integer not null,
  status text not null,
  position text collate "C" not null,
  -- 행 변경 카운터 — 쓰기마다 +1 (캐시 검증·디버깅용). 낙관적 잠금 아님
  version integer not null default 1,
  sync_seq integer not null default 0,
  deleted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_empty check (length(title) > 0),
  constraint tasks_date_format check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  constraint tasks_start_at_format check (start_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
  constraint tasks_duration_min_positive check (duration_min > 0),
  constraint tasks_status_valid check (status in ('todo', 'doing', 'done'))
);
-- 주간 창 쿼리(user_id + date 범위 + start_at 정렬)를 인덱스 순서 그대로 커버한다
create index if not exists tasks_user_id_date_start_at on tasks (user_id, date, start_at);
-- 프로젝트 보드(프로젝트별 · 상태별 조회) 경로 + project_id FK 검사 커버
create index if not exists tasks_user_id_project_id_status on tasks (user_id, project_id, status);
create index if not exists tasks_user_id_sync_seq on tasks (user_id, sync_seq);

-- 유저별 단조증가 동기화 시퀀스 — 발급은 sync_seq::begin_user_write로만
create table if not exists sync_counters (
  user_id uuid primary key references users(id) on delete cascade,
  seq integer not null default 0
);
