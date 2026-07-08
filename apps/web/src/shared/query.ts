import type { QueryClient, QueryKey } from '@tanstack/react-query';

type OptimisticContext<TData> = { previous: TData | undefined };

/**
 * 낙관적 업데이트 배선 — cancel → snapshot → 캐시 패치, 실패 시 롤백, 정착 시 invalidate.
 * mutationOptions에 그대로 넘긴다. 캐시 shape 반영은 apply 콜백이 결정한다 (도메인 무관).
 * 언제 이 전략을 쓰는지는 docs/conventions/web-cache-policy.md 참고.
 */
export function optimisticPatch<TInput, TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  apply: (old: TData, input: TInput) => TData,
) {
  return {
    onMutate: async (input: TInput): Promise<OptimisticContext<TData>> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TData>(queryKey);
      queryClient.setQueryData<TData>(queryKey, (old) => old && apply(old, input));
      return { previous };
    },
    onError: (_error: unknown, _input: TInput, context: OptimisticContext<TData> | undefined) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  };
}
