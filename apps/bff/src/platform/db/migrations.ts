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

/** 키 이름의 사전순이 곧 적용 순서 — 새 변경은 다음 번호로 추가하고 기존 항목은 수정하지 않는다 */
const MIGRATIONS: Record<string, Migration> = {
  '0001_init': migration0001Init,
  '0002_fractional_position': migration0002FractionalPosition,
};

export class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return MIGRATIONS;
  }
}
