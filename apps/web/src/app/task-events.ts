import { SYNC_EVENTS_PATH } from '@tooday/shared';
import { bffUrl, refreshSession } from '@/app/trpc';

/** SSE는 사용자별 변경 힌트만 전달한다. 수명은 호출한 컬렉션 동기화가 소유한다. */
export function subscribeTaskEvents(listener: () => void, onSessionLost: () => void): () => void {
  let closed = false;
  let refreshedOnce = false;
  let source: EventSource;
  const connect = () => {
    source = new EventSource(bffUrl(SYNC_EVENTS_PATH), { withCredentials: true });
    source.addEventListener('change', () => {
      refreshedOnce = false;
      listener();
    });
    source.addEventListener('open', listener);
    source.addEventListener('error', () => {
      if (closed || source.readyState !== EventSource.CLOSED || refreshedOnce) return;
      refreshedOnce = true;
      source.close();
      void refreshSession().then((ok) => {
        if (closed) return;
        if (ok) connect();
        else onSessionLost();
      });
    });
  };
  connect();
  return () => {
    closed = true;
    source.close();
  };
}
