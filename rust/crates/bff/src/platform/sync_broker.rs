/*
 * 위치 근거(platform 유지): 현재 유일한 notify 소비처는 task 모듈이지만, "유저별 데이터
 * 변경 신호"는 도메인에 무관한 전송 계약이다. app 셸의 SSE 채널(`/sync/events`)이 이 포트를
 * 직접 소비하고, seq+커서 동기화 원리는 태스크 공유 등 타 도메인으로 재사용될 설계다.
 * task 모듈로 내리면 app 셸·trpc 조립이 도메인 모듈을 역으로 참조하게 되므로 platform에 둔다.
 */
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

pub type SyncListener = Arc<dyn Fn() + Send + Sync>;

/// 구독 해제 핸들 — drop 되면 자동으로 구독이 풀린다.
/// TS는 unsubscribe 함수를 돌려줬고, 여기서는 그 호출을 잊을 수 없게 RAII로 묶는다.
pub struct Subscription {
    unsubscribe: Option<Box<dyn FnOnce() + Send>>,
}

impl Subscription {
    pub fn new(unsubscribe: impl FnOnce() + Send + 'static) -> Self {
        Self { unsubscribe: Some(Box::new(unsubscribe)) }
    }
}

impl Drop for Subscription {
    fn drop(&mut self) {
        if let Some(unsubscribe) = self.unsubscribe.take() {
            unsubscribe();
        }
    }
}

/// "이 유저의 데이터가 바뀌었다"를 중계하는 신호 브로커(포트).
/// 데이터는 싣지 않는다 — 신호를 받은 클라이언트가 자기 커서로 델타를 당긴다.
/// 신호가 유실·중복돼도 커서가 진실이므로 정합성에 영향이 없다.
///
/// 다중 인스턴스 배포에서는 이 인터페이스를 Redis pub/sub 등 브로커 어댑터로
/// 구현해 갈아끼운다 — 소비처는 이 계약에만 의존하므로 표면이 그대로다.
pub trait SyncBroker: Send + Sync {
    fn subscribe(self: Arc<Self>, user_id: &str, listener: SyncListener) -> Subscription;
    fn notify(&self, user_id: &str);
}

/// 프로세스 안에서만 신호를 중계하는 인메모리 어댑터 — 단일 인스턴스 배포용.
#[derive(Default)]
pub struct InMemorySyncBroker {
    listeners: Mutex<HashMap<String, Vec<(u64, SyncListener)>>>,
    next_id: AtomicU64,
}

impl InMemorySyncBroker {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }
}

impl SyncBroker for InMemorySyncBroker {
    fn subscribe(self: Arc<Self>, user_id: &str, listener: SyncListener) -> Subscription {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        self.listeners
            .lock()
            .expect("sync broker mutex")
            .entry(user_id.to_owned())
            .or_default()
            .push((id, listener));

        let broker = Arc::clone(&self);
        let user_id = user_id.to_owned();
        Subscription::new(move || {
            let mut listeners = broker.listeners.lock().expect("sync broker mutex");
            if let Some(entries) = listeners.get_mut(&user_id) {
                entries.retain(|(entry_id, _)| *entry_id != id);
                if entries.is_empty() {
                    listeners.remove(&user_id);
                }
            }
        })
    }

    fn notify(&self, user_id: &str) {
        // 리스너를 복제해 잠금 밖에서 호출한다 — 리스너가 다시 브로커를 만져도 교착되지 않는다
        let listeners: Vec<SyncListener> = {
            let guard = self.listeners.lock().expect("sync broker mutex");
            guard
                .get(user_id)
                .map(|entries| entries.iter().map(|(_, listener)| Arc::clone(listener)).collect())
                .unwrap_or_default()
        };
        for listener in listeners {
            listener();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicUsize;

    fn counter() -> (Arc<AtomicUsize>, SyncListener) {
        let count = Arc::new(AtomicUsize::new(0));
        let listener = {
            let count = Arc::clone(&count);
            Arc::new(move || {
                count.fetch_add(1, Ordering::SeqCst);
            }) as SyncListener
        };
        (count, listener)
    }

    #[test]
    fn 구독자에게_신호가_간다() {
        let broker = InMemorySyncBroker::new();
        let (count, listener) = counter();
        let _subscription = Arc::clone(&broker).subscribe("user-1", listener);

        broker.notify("user-1");
        assert_eq!(count.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn 다른_유저의_신호는_가지_않는다() {
        let broker = InMemorySyncBroker::new();
        let (count, listener) = counter();
        let _subscription = Arc::clone(&broker).subscribe("user-1", listener);

        broker.notify("user-2");
        assert_eq!(count.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn 구독을_놓으면_신호가_끊긴다() {
        let broker = InMemorySyncBroker::new();
        let (count, listener) = counter();
        let subscription = Arc::clone(&broker).subscribe("user-1", listener);

        drop(subscription);
        broker.notify("user-1");
        assert_eq!(count.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn 여러_구독자_모두에게_신호가_간다() {
        let broker = InMemorySyncBroker::new();
        let (first, first_listener) = counter();
        let (second, second_listener) = counter();
        let _a = Arc::clone(&broker).subscribe("user-1", first_listener);
        let _b = Arc::clone(&broker).subscribe("user-1", second_listener);

        broker.notify("user-1");
        assert_eq!(first.load(Ordering::SeqCst), 1);
        assert_eq!(second.load(Ordering::SeqCst), 1);
    }
}
