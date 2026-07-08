import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { optimisticPatch } from '@/shared/query';

const queryKey = ['counter'];
const setup = () => {
  const queryClient = new QueryClient();
  const handlers = optimisticPatch(queryClient, queryKey, (old: { value: number }, delta: number) => ({
    value: old.value + delta,
  }));
  return { queryClient, handlers };
};

describe('optimisticPatch', () => {
  it('onMutate — 캐시를 낙관적으로 패치하고 스냅샷을 컨텍스트로 돌려준다', async () => {
    const { queryClient, handlers } = setup();
    queryClient.setQueryData(queryKey, { value: 1 });

    const context = await handlers.onMutate(2);

    expect(queryClient.getQueryData(queryKey)).toEqual({ value: 3 });
    expect(context.previous).toEqual({ value: 1 });
  });

  it('onMutate — 캐시가 비어 있으면 패치하지 않는다', async () => {
    const { queryClient, handlers } = setup();

    const context = await handlers.onMutate(2);

    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
    expect(context.previous).toBeUndefined();
  });

  it('onError — 스냅샷으로 롤백한다', async () => {
    const { queryClient, handlers } = setup();
    queryClient.setQueryData(queryKey, { value: 1 });
    const context = await handlers.onMutate(2);

    handlers.onError(new Error('boom'), 2, context);

    expect(queryClient.getQueryData(queryKey)).toEqual({ value: 1 });
  });

  it('onSettled — 서버 결과와 수렴하도록 쿼리를 invalidate 한다', async () => {
    const { queryClient, handlers } = setup();
    queryClient.setQueryData(queryKey, { value: 1 });

    await handlers.onSettled();

    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
  });
});
