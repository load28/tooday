import { describe, expect, it } from 'vitest';
import { createCommandExecutionStore } from '@/shared/command-execution-store';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
describe('컴포넌트 실행 Store', () => {
  it('겹친 요청 중 하나가 끝나도 남은 요청의 대기 상태를 유지한다', async () => {
    const state = createCommandExecutionStore();
    const first = deferred();
    const second = deferred();
    const a = state.run(() => first.promise);
    const b = state.run(() => second.promise);
    expect(state.state.get().pendingCount).toBe(2);
    first.resolve();
    await a;
    expect(state.state.get().pendingCount).toBe(1);
    second.resolve();
    await b;
    expect(state.state.get().pendingCount).toBe(0);
  });
  it('이전 요청의 늦은 실패가 최신 성공의 오류 상태를 덮지 않는다', async () => {
    const state = createCommandExecutionStore();
    const first = deferred();
    const pending = state.run(() => first.promise);
    const rejected = expect(pending).rejects.toThrow('old');
    await state.run(async () => {});
    first.reject(new Error('old'));
    await rejected;
    expect(state.state.get()).toEqual({ pendingCount: 0, error: null });
  });
  it('실패를 표시하고 다음 실행에서 지우며 별도 Store에는 전파하지 않는다', async () => {
    const a = createCommandExecutionStore();
    const b = createCommandExecutionStore();
    const error = new Error('failed');
    await expect(
      a.run(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(a.state.get().error).toBe(error);
    expect(b.state.get().error).toBeNull();
    await a.run(async () => 1);
    expect(a.state.get()).toEqual({ pendingCount: 0, error: null });
  });
});
