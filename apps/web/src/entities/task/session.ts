import { createTaskData, type TaskData, type TaskHydration } from '@/entities/task/data';
import type { TaskTransport } from '@/entities/task/ports';

/** 브라우저 router 또는 SSR 요청 하나가 소유한다. 모듈 전역 사용자 레지스트리는 두지 않는다. */
export function createTaskSession(transport: TaskTransport, realtime: boolean) {
  let current: TaskData | undefined;
  return {
    get userId() {
      return current?.userId;
    },
    get(userId: string): TaskData {
      if (current?.userId !== userId) {
        const previous = current;
        current = createTaskData(userId, transport, { realtime });
        // dispose는 첫 await 전에 abort하므로 이전 응답이 새 세션으로 들어오지 않는다.
        void previous?.dispose().catch(() => {});
      }
      return current;
    },
    hydrate(initial: TaskHydration) {
      if (current) throw new Error('Task 세션의 초기 복원은 한 번만 수행합니다.');
      current = createTaskData(initial.userId, transport, { initial, realtime });
    },
    dehydrate() {
      return current?.dehydrate() ?? null;
    },
    async clear() {
      const previous = current;
      current = undefined;
      await previous?.dispose();
    },
  };
}
export type TaskSession = ReturnType<typeof createTaskSession>;
