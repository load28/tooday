import { useRouteContext } from '@tanstack/react-router';
import type { SyncChangesResponse, TaskRangeResponse } from '@tooday/shared';
import { SYNC_EVENTS_PATH } from '@tooday/shared';
import { useEffect } from 'react';
import { bffUrl, refreshSession } from '@/app/trpc';

/**
 * 기기 간 실시간 수렴 — SSE로 "네 데이터 바뀜" 신호를 받으면 커서 이후의
 * 델타(task.changes)를 당겨 range 캐시에 패치한다.
 *
 * 신호는 힌트일 뿐 커서가 진실이다: 신호가 유실돼도 재접속 직후 서버가 한 번
 * 신호를 쏘고, 그때 커서가 끊긴 사이의 변경을 전부 따라잡는다. EventSource의
 * 자동 재접속이 재연결을 담당하되, 액세스 쿠키 만료로 재접속이 401을 맞아 스트림이
 * 영구 종료되면 tRPC와 같은 single-flight refresh로 쿠키를 갱신하고 재구독한다.
 */
export function useTaskSync(range: { from: string; to: string }): void {
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });

  useEffect(() => {
    const queryKey = trpc.task.range.queryKey(range);
    let closed = false;
    let pulling = false;
    let pending = false;

    const pull = async (): Promise<void> => {
      if (pulling) {
        pending = true; // 신호 폭주는 "한 번 더"로 접는다
        return;
      }
      pulling = true;
      try {
        do {
          pending = false;
          const current = queryClient.getQueryData<TaskRangeResponse>(queryKey);
          if (!current || closed) return;
          const delta = await queryClient.fetchQuery(trpc.task.changes.queryOptions({ cursor: current.cursor }));
          if (delta.cursor === current.cursor) continue;
          queryClient.setQueryData<TaskRangeResponse>(queryKey, (old) => old && applyDelta(old, delta, range));
        } while (pending && !closed);
      } catch {
        // 델타 실패는 다음 신호(또는 재접속 신호)가 재시도한다
      } finally {
        pulling = false;
      }
    };

    let source: EventSource;
    let refreshedOnce = false; // 재접속 401 refresh는 사이클당 1회 — 정상 신호 수신 시 리셋

    const connect = (): void => {
      source = new EventSource(bffUrl(SYNC_EVENTS_PATH), { withCredentials: true });
      source.addEventListener('change', () => {
        refreshedOnce = false; // 살아있는 연결 확인 → 다음 만료 때 refresh 재허용
        void pull();
      });
      source.addEventListener('error', () => {
        // 열린 스트림은 쿠키 만료에 안 죽는다(인증은 접속 시 1회). transient 네트워크
        // 오류는 readyState CONNECTING이라 EventSource 네이티브 재접속에 맡긴다. CLOSED는
        // 재접속 핸드셰이크가 거부된 것 — 대개 액세스 쿠키 만료로 인한 401이다. 이때만
        // tRPC와 같은 single-flight refresh에 합류해 새 쿠키를 받고 재구독한다.
        if (closed || source.readyState !== EventSource.CLOSED || refreshedOnce) return;
        refreshedOnce = true; // refresh 성공 후 재접속이 또 실패해도 폭주하지 않게 사이클당 1회로 묶는다
        void refreshSession().then((ok) => {
          if (ok && !closed) connect();
        });
      });
    };

    connect();

    return () => {
      closed = true;
      source.close();
    };
  }, [trpc, queryClient, range]);
}

function applyDelta(old: TaskRangeResponse, delta: SyncChangesResponse, range: { from: string; to: string }): TaskRangeResponse {
  let tasks = old.tasks;
  for (const change of delta.tasks) {
    const { syncSeq: _seq, deleted, ...task } = change;
    tasks = tasks.filter((t) => t.id !== task.id);
    // 삭제됐거나 주간 창 밖으로 이동한 행은 캐시에서 빠지는 것으로 반영된다
    if (!deleted && task.date >= range.from && task.date <= range.to) {
      tasks = [...tasks, task];
    }
  }
  let projects = old.projects;
  for (const change of delta.projects) {
    const { syncSeq: _seq, deleted, ...project } = change;
    projects = projects.filter((p) => p.id !== project.id);
    if (!deleted) {
      projects = [...projects, project];
    }
  }
  return { tasks, projects, cursor: Math.max(old.cursor, delta.cursor) };
}
