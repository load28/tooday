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
