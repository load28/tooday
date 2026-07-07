import { orderKeyAfter } from '@bff/platform/ordering';
import type { Kysely, Migration, MigrationProvider } from 'kysely';
import { sql } from 'kysely';

/**
 * 0001 — 초기 스키마 (PostgreSQL).
 *
 * 마이그레이션은 불변 이력이다: CHECK의 허용값 목록은 계약(@tooday/shared)을
 * import 하지 않고 당시 값을 리터럴로 동결한다. 값이 늘면 제약을 바꾸는
 * 새 마이그레이션을 추가한다.
 */
const migration0001Init: Migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .createTable('users')
      .addColumn('id', 'uuid', (col) => col.primaryKey())
      .addColumn('email', 'text', (col) => col.notNull().unique())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('password_hash', 'text', (col) => col.notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      // 이메일 소문자 정규화를 앱 레이어에만 의존하지 않고 DB가 보장한다
      .addCheckConstraint('users_email_lowercase', sql`email = lower(email)`)
      .execute();

    await db.schema
      .createTable('sessions')
      .addColumn('token_hash', 'text', (col) => col.primaryKey())
      .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
      .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .execute();
    // 유저 단위 일괄 무효화(전 기기 로그아웃) 경로
    await db.schema.createIndex('sessions_user_id').on('sessions').column('user_id').execute();
    // 만료 세션 청소 배치 경로
    await db.schema.createIndex('sessions_expires_at').on('sessions').column('expires_at').execute();

    await db.schema
      .createTable('projects')
      .addColumn('id', 'uuid', (col) => col.primaryKey())
      .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('color', 'text', (col) => col.notNull())
      .addColumn('position', 'double precision', (col) => col.notNull().defaultTo(0))
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addCheckConstraint('projects_name_not_empty', sql`length(name) > 0`)
      .addCheckConstraint('projects_color_valid', sql`color in ('blue', 'mint', 'violet', 'amber', 'pink', 'gray')`)
      .execute();
    await db.schema.createIndex('projects_user_id_position').on('projects').columns(['user_id', 'position']).execute();

    await db.schema
      .createTable('tasks')
      .addColumn('id', 'uuid', (col) => col.primaryKey())
      .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
      // 프로젝트 삭제가 태스크를 지우면 안 된다 — 라벨만 떼어낸다
      .addColumn('project_id', 'uuid', (col) => col.references('projects.id').onDelete('set null'))
      .addColumn('title', 'text', (col) => col.notNull())
      .addColumn('date', 'text', (col) => col.notNull())
      .addColumn('start_at', 'text', (col) => col.notNull())
      .addColumn('duration_min', 'integer', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('position', 'double precision', (col) => col.notNull().defaultTo(0))
      .addColumn('version', 'integer', (col) => col.notNull().defaultTo(1))
      .addColumn('completed_at', 'timestamptz')
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addCheckConstraint('tasks_title_not_empty', sql`length(title) > 0`)
      .addCheckConstraint('tasks_date_format', sql`date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`)
      .addCheckConstraint('tasks_start_at_format', sql`start_at ~ '^[0-2][0-9]:[0-5][0-9]$'`)
      .addCheckConstraint('tasks_duration_min_positive', sql`duration_min > 0`)
      .addCheckConstraint('tasks_status_valid', sql`status in ('todo', 'doing', 'done')`)
      .execute();
    // 주간 창 쿼리(user_id + date 범위 + start_at 정렬)를 인덱스 순서 그대로 커버한다
    await db.schema.createIndex('tasks_user_id_date_start_at').on('tasks').columns(['user_id', 'date', 'start_at']).execute();
    // 프로젝트 보드(프로젝트별 · 상태별 조회) 경로 + project_id FK 검사 커버
    await db.schema
      .createIndex('tasks_user_id_project_id_status')
      .on('tasks')
      .columns(['user_id', 'project_id', 'status'])
      .execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('tasks').execute();
    await db.schema.dropTable('projects').execute();
    await db.schema.dropTable('sessions').execute();
    await db.schema.dropTable('users').execute();
  },
};

/**
 * 0002 — 수동 정렬 키를 float 중간값에서 Figma 방식 fractional index(text)로 전환.
 *
 * float는 같은 틈을 ~50번 쪼개면 정밀도가 고갈되지만 문자열 키는 자릿수를
 * 늘리면 되므로 고갈이 없다. 바이트 순서 비교가 전제라 collate "C"를 강제한다.
 * 기존 float 값(전부 기본값 0)은 생성 순서(id = UUIDv7 = 시간순)대로 백필한다.
 */
const migration0002FractionalPosition: Migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    for (const table of ['projects', 'tasks'] as const) {
      await db.schema.alterTable(table).addColumn('position_key', sql`text collate "C"`).execute();

      // 유저별로 (기존 position, 생성 순서) 순서를 보존하며 키 체인을 생성
      const rows = await sql<{ id: string; user_id: string }>`
        select id, user_id from ${sql.table(table)} order by user_id, position, id
      `.execute(db);
      let currentUser: string | null = null;
      let last: string | null = null;
      for (const row of rows.rows) {
        if (row.user_id !== currentUser) {
          currentUser = row.user_id;
          last = null;
        }
        last = orderKeyAfter(last);
        await sql`update ${sql.table(table)} set position_key = ${last} where id = ${row.id}`.execute(db);
      }

      await db.schema
        .alterTable(table)
        .alterColumn('position_key', (col) => col.setNotNull())
        .execute();
      await db.schema.alterTable(table).dropColumn('position').execute();
      await db.schema.alterTable(table).renameColumn('position_key', 'position').execute();
    }

    // dropColumn이 옛 인덱스를 함께 지우므로 새 text 컬럼으로 재생성
    await db.schema.createIndex('projects_user_id_position').on('projects').columns(['user_id', 'position']).execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    for (const table of ['projects', 'tasks'] as const) {
      await db.schema.alterTable(table).dropColumn('position').execute();
      await db.schema
        .alterTable(table)
        .addColumn('position', 'double precision', (col) => col.notNull().defaultTo(0))
        .execute();
    }
    await db.schema.createIndex('projects_user_id_position').on('projects').columns(['user_id', 'position']).execute();
  },
};

/**
 * 0003 — 기기 간 델타 동기화 기반.
 *
 * - sync_counters: 유저별 단조증가 시퀀스. 모든 쓰기가 여기서 seq를 발급받아
 *   행에 찍는다 → 클라이언트는 "커서(마지막으로 본 seq) 이후"만 당겨서 수렴한다.
 * - tasks/projects.sync_seq: 그 행의 마지막 변경 seq. 기존 행은 0으로 백필 —
 *   커서는 항상 현재 카운터값에서 시작하므로 0인 행이 델타에 잘못 실릴 일이 없다.
 * - deleted_at(tombstone): 하드 DELETE는 "사라졌다"는 사실이 델타에 안 담기므로
 *   소프트 삭제로 전환할 자리. 읽기 경로는 deleted_at IS NULL만 본다.
 */
const migration0003Sync: Migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .createTable('sync_counters')
      .addColumn('user_id', 'uuid', (col) => col.primaryKey().references('users.id').onDelete('cascade'))
      // integer 상한(유저당 21억 쓰기)은 개인 앱 규모에서 도달 불가 — int8은 드라이버별 파싱 편차가 있어 피한다
      .addColumn('seq', 'integer', (col) => col.notNull().defaultTo(0))
      .execute();

    for (const table of ['projects', 'tasks'] as const) {
      await db.schema
        .alterTable(table)
        .addColumn('sync_seq', 'integer', (col) => col.notNull().defaultTo(0))
        .execute();
      await db.schema.alterTable(table).addColumn('deleted_at', 'timestamptz').execute();
      await db.schema.createIndex(`${table}_user_id_sync_seq`).on(table).columns(['user_id', 'sync_seq']).execute();
    }
  },

  async down(db: Kysely<unknown>): Promise<void> {
    for (const table of ['projects', 'tasks'] as const) {
      await db.schema.alterTable(table).dropColumn('sync_seq').execute();
      await db.schema.alterTable(table).dropColumn('deleted_at').execute();
    }
    await db.schema.dropTable('sync_counters').execute();
  },
};

/**
 * 0004 — 세션 테이블을 리프레시 토큰 저장소로 전환.
 *
 * 액세스(JWT, 무상태) + 리프레시(회전) 모델로 바뀌며 저장소는 리프레시 토큰만 관리한다.
 * - sessions → refresh_tokens 로 이름 변경(인덱스는 테이블에 종속돼 함께 따라온다).
 * - absolute_expires_at 추가: idle 만료(expires_at, 슬라이딩)와 별개인 하드캡. 기존 행은
 *   expires_at을 그대로 백필해 하위 호환(어차피 전환 시점에 재로그인이 필요하다).
 */
const migration0004RefreshTokens: Migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('sessions').renameTo('refresh_tokens').execute();
    await db.schema.alterTable('refresh_tokens').addColumn('absolute_expires_at', 'timestamptz').execute();
    // 기존 행의 하드캡은 idle 만료값으로 백필한 뒤 NOT NULL을 건다.
    await sql`update refresh_tokens set absolute_expires_at = expires_at where absolute_expires_at is null`.execute(db);
    await db.schema
      .alterTable('refresh_tokens')
      .alterColumn('absolute_expires_at', (col) => col.setNotNull())
      .execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('refresh_tokens').dropColumn('absolute_expires_at').execute();
    await db.schema.alterTable('refresh_tokens').renameTo('sessions').execute();
  },
};

/**
 * 0005 — 리프레시 토큰 회전 재사용 탐지(OAuth 2.0 BCP).
 *
 * - family_id: 회전 계보. 재사용이 탐지되면 이 단위로 일괄 무효화한다.
 * - superseded_at: 회전으로 폐기된 시각. 이미 폐기된 토큰이 다시 제시되면 탈취 신호.
 *
 * 인증 모델 자체가 바뀌어(불투명 세션 → 액세스/리프레시) 기존 토큰은 어차피 무효다.
 * 기존 행을 지우고 family_id를 NOT NULL로 추가한다 — 전환 시 전원 재로그인.
 */
const migration0005ReuseDetection: Migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`delete from refresh_tokens`.execute(db);
    await db.schema
      .alterTable('refresh_tokens')
      .addColumn('family_id', 'uuid', (col) => col.notNull())
      .execute();
    await db.schema.alterTable('refresh_tokens').addColumn('superseded_at', 'timestamptz').execute();
    // 재사용 탐지 시 계보 전체를 지우는 경로
    await db.schema.createIndex('refresh_tokens_family_id').on('refresh_tokens').column('family_id').execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('refresh_tokens').dropColumn('superseded_at').execute();
    await db.schema.alterTable('refresh_tokens').dropColumn('family_id').execute();
  },
};

/**
 * 0006 — 회전 계보(family)를 표준 용어 세션(session)으로 정정.
 *
 * OAuth 회전 계보 = 하나의 로그인 세션이다. 액세스 JWT의 `sid`(OIDC 세션 id 클레임)와
 * 개념을 일치시켜 family_id → session_id로 컬럼·인덱스를 이름만 바꾼다(데이터 변화 없음).
 */
const migration0006SessionId: Migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('refresh_tokens').renameColumn('family_id', 'session_id').execute();
    await db.schema.dropIndex('refresh_tokens_family_id').execute();
    await db.schema.createIndex('refresh_tokens_session_id').on('refresh_tokens').column('session_id').execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropIndex('refresh_tokens_session_id').execute();
    await db.schema.alterTable('refresh_tokens').renameColumn('session_id', 'family_id').execute();
    await db.schema.createIndex('refresh_tokens_family_id').on('refresh_tokens').column('family_id').execute();
  },
};

/** 키 이름의 사전순이 곧 적용 순서 — 새 변경은 다음 번호로 추가하고 기존 항목은 수정하지 않는다 */
const MIGRATIONS: Record<string, Migration> = {
  '0001_init': migration0001Init,
  '0002_fractional_position': migration0002FractionalPosition,
  '0003_sync': migration0003Sync,
  '0004_refresh_tokens': migration0004RefreshTokens,
  '0005_reuse_detection': migration0005ReuseDetection,
  '0006_session_id': migration0006SessionId,
};

export class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return MIGRATIONS;
  }
}
