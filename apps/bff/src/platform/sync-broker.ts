/*
 * 위치 근거(platform 유지): 현재 유일한 notify 소비처는 task 모듈이지만, "유저별 데이터
 * 변경 신호"는 도메인에 무관한 전송 계약이다. app 셸의 SSE 채널(`/sync/events`)이 이 포트를
 * 직접 소비하고, seq+커서 동기화 원리는 태스크 공유 등 타 도메인으로 재사용될 설계다
 * (docs/task-sharing-architecture.md). task 모듈로 내리면 app 셸·trpc 조립이 도메인 모듈을
 * 역으로 참조하게 되므로 platform에 둔다.
 */
export type SyncListener = () => void;

/**
 * "이 유저의 데이터가 바뀌었다"를 중계하는 신호 브로커(포트).
 * 데이터는 싣지 않는다 — 신호를 받은 클라이언트가 자기 커서로 델타를 당긴다.
 * 신호가 유실·중복돼도 커서가 진실이므로 정합성에 영향이 없다.
 *
 * 다중 인스턴스 배포에서는 이 인터페이스를 Redis pub/sub 등 브로커 어댑터로
 * 구현해 갈아끼운다 — 소비처는 이 계약에만 의존하므로 표면이 그대로다.
 */
export interface SyncBroker {
  subscribe(userId: string, listener: SyncListener): () => void;
  notify(userId: string): void;
}

/** 프로세스 안에서만 신호를 중계하는 인메모리 어댑터 — 단일 인스턴스 배포용. */
export class InMemorySyncBroker implements SyncBroker {
  private readonly listeners = new Map<string, Set<SyncListener>>();

  subscribe(userId: string, listener: SyncListener): () => void {
    let set = this.listeners.get(userId);
    if (!set) {
      set = new Set();
      this.listeners.set(userId, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(userId);
    };
  }

  notify(userId: string): void {
    const set = this.listeners.get(userId);
    if (!set) return;
    for (const listener of set) listener();
  }
}
