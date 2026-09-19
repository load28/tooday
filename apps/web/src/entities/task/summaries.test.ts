import { DbClient } from '@tanstack/react-db';
import type { ProjectSummary } from '@tooday/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProjectSummaries } from '@/entities/task/summaries';

const resources: Array<() => Promise<void>> = [];
const row: ProjectSummary = { id: 'p1', name: '프로젝트', color: 'blue', totalCount: 100, doneCount: 20 };
function setup(initial?: ProjectSummary[]) {
  const db = new DbClient();
  const abort = new AbortController();
  let rows = [row];
  const fetch = vi.fn(async () => ({ projects: rows }));
  const data = createProjectSummaries(db, 'u1', { summaries: fetch }, abort.signal, 300000, initial);
  resources.push(async () => {
    abort.abort();
    await db.cleanup();
    data.clear();
  });
  return {
    data,
    fetch,
    setRows: (next: ProjectSummary[]) => {
      rows = next;
    },
  };
}
afterEach(async () => {
  await Promise.all(resources.splice(0).map((cleanup) => cleanup()));
});
describe('프로젝트 집계 DB', () => {
  it('서버 전체 집계를 읽고 무효화 시 구독 중인 DB를 갱신한다', async () => {
    const { data, fetch, setRows } = setup();
    await data.preload();
    const view = data.view();
    const subscription = view.subscribeChanges(() => {});
    try {
      expect([...view.values()]).toMatchObject([row]);
      setRows([{ ...row, doneCount: 21 }]);
      data.invalidate();
      await vi.waitFor(() => expect([...view.values()][0]?.doneCount).toBe(21));
      expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
      setRows([]);
      data.invalidate();
      await vi.waitFor(() => expect([...view.values()]).toEqual([]));
    } finally {
      subscription.unsubscribe();
    }
  });
  it('직렬화한 집계를 새 DB에 복원한다', async () => {
    const server = setup();
    await server.data.preload();
    const client = setup(server.data.dehydrate());
    await client.data.preload();
    expect([...client.data.view().values()]).toMatchObject([row]);
  });
});
