import type { UserReader } from '@bff/modules/user/ports';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import type { User } from '@tooday/shared';
import type { Kysely } from 'kysely';

/** 읽기 전용 — users 테이블 쓰기는 auth 모듈의 SqlUserStore만 한다 */
export class SqlUserReader implements UserReader {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.selectFrom('users').select(['id', 'email', 'name']).where('id', '=', id).executeTakeFirst();
    return row ?? null;
  }
}
