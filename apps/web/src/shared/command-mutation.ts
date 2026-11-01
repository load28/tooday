import { type QueryClient, type UseMutationResult, useMutation } from '@tanstack/react-query';

// biome-ignore lint/suspicious/noExplicitAny: 명령마다 입력 타입이 달라 공통 상한으로 any를 쓴다.
type Command = (...args: any[]) => Promise<unknown>;
export type CommandInput<F extends Command> = Parameters<F> extends [] ? undefined : Parameters<F>[0];
export type CommandMutation<F extends Command> = UseMutationResult<Awaited<ReturnType<F>>, Error, CommandInput<F>>;

/** 결과 데이터는 DB 명령이 DB에 반영한다. mutation은 그 실행의 대기·오류 상태만 소유한다. */
export function useCommandMutation<F extends Command>(command: F, client: QueryClient): CommandMutation<F> {
  return useMutation<Awaited<ReturnType<F>>, Error, CommandInput<F>>(
    { mutationFn: (input) => command(input) as Promise<Awaited<ReturnType<F>>> },
    client,
  );
}
