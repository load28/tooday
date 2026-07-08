import { describe, expect, it } from 'bun:test';
import { SqlUserReader } from '@bff/modules/user/adapters/sql';
import { testDatabase } from '@bff/platform/db/testing';
import { newId } from '@bff/platform/ids';

describe('UserReader 포트 계약 — sql(pglite)', () => {
  it('id로 유저를 조회하고, 없으면 null을 돌려준다', async () => {
    const db = await testDatabase();
    // users 테이블 쓰기는 auth 모듈 소유 — 어댑터 단위 테스트에서는 시드로 직접 삽입한다
    const user = { id: newId(), email: 'reader@tooday.app', name: '리더' };
    await db
      .insertInto('users')
      .values({ ...user, password_hash: 'seed-only' })
      .execute();

    const reader = new SqlUserReader(db);
    expect(await reader.findById(user.id)).toEqual(user);
    expect(await reader.findById(crypto.randomUUID())).toBeNull();
  });
});
