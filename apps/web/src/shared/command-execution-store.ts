import { createAtom, useAtom } from '@tanstack/react-store';
import { useState } from 'react';

type CommandExecutionState = { pendingCount: number; error: unknown };

/** 결과 데이터는 DB에 둔다. 이 Store는 컴포넌트 인스턴스의 명령 실행 상태만 소유한다. */
export function createCommandExecutionStore() {
  const state = createAtom<CommandExecutionState>({ pendingCount: 0, error: null });
  let latest = 0;
  async function run<T>(action: () => Promise<T>): Promise<T> {
    const id = ++latest;
    state.set((previous) => ({ pendingCount: previous.pendingCount + 1, error: null }));
    try {
      return await action();
    } catch (error) {
      if (id === latest) state.set((previous) => ({ ...previous, error }));
      throw error;
    } finally {
      state.set((previous) => ({ ...previous, pendingCount: previous.pendingCount - 1 }));
    }
  }
  return {
    state,
    run,
    dispatch(action: () => Promise<unknown>) {
      void run(action).catch(() => {}); // 에러는 Store를 구독하는 UI가 표시한다.
    },
    reset() {
      latest++;
      state.set((previous) => ({ ...previous, error: null }));
    },
  };
}

export function useCommandExecutionStore() {
  const [execution] = useState(createCommandExecutionStore);
  const [state] = useAtom(execution.state);
  return { ...execution, isPending: state.pendingCount > 0, isError: state.error !== null };
}
