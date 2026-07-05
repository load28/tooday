export type SyncListener = () => void;

/**
 * "이 유저의 데이터가 바뀌었다"를 프로세스 안에서 중계하는 허브.
 * 데이터는 싣지 않는다 — 신호를 받은 클라이언트가 자기 커서로 델타를 당긴다.
 * 신호가 유실·중복돼도 커서가 진실이므로 정합성에 영향이 없다.
 *
 * 다중 인스턴스 배포에서는 이 클래스를 Redis pub/sub 등 브로커 구현으로
 * 교체한다 — 구독/발행 표면은 그대로다.
 */
export class SyncHub {
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
