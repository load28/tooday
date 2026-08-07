//! 쿼리 캐시 — TanStack Query 중 이 앱이 쓰는 표면만 옮긴 구현.
//!
//! 옮긴 의미: 키별 캐시 엔트리(데이터 + 갱신 시각 + 무효화 표시), staleTime으로 판정하는
//! 신선도, `ensure_query_data`(캐시가 있으면 네트워크 없이 즉시 반환), 낙관적 패치의
//! 스냅샷·롤백·정착 시 invalidate. 전략 선택 기준은 docs/conventions/web-cache-policy.md.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::Value;

/// 쿼리 키 — tRPC 프로시저 경로 + 입력. TS의 `trpc.x.queryKey(input)` 파생과 같은 자리.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct QueryKey {
    pub path: &'static str,
    /// 입력을 정규화한 문자열. None이면 "이 경로의 모든 입력"을 뜻한다(부분 일치용).
    pub input: Option<String>,
}

impl QueryKey {
    pub fn new(path: &'static str, input: &impl Serialize) -> Self {
        Self { path, input: Some(serde_json::to_string(input).unwrap_or_else(|_| "null".into())) }
    }

    /// 입력 없는 프로시저의 키
    pub fn bare(path: &'static str) -> Self {
        Self { path, input: Some("null".into()) }
    }

    /// 경로 전체를 가리키는 접두 키 — `remove_queries`/`invalidate_queries`가 부분 일치에 쓴다
    pub fn prefix(path: &'static str) -> Self {
        Self { path, input: None }
    }

    fn matches(&self, filter: &QueryKey) -> bool {
        self.path == filter.path && (filter.input.is_none() || filter.input == self.input)
    }
}

#[derive(Debug, Clone)]
struct CacheEntry {
    data: Value,
    /// 데이터를 받은 시각(ms) — staleTime 판정 기준
    updated_at: i64,
    invalidated: bool,
}

/// 진행 중인 낙관적 패치가 덮어써지지 않도록, 취소된 세대의 응답은 캐시에 쓰지 않는다.
#[derive(Default)]
struct QueryState {
    entries: HashMap<QueryKey, CacheEntry>,
    /// 키별 취소 세대 — `cancel_queries` 시 증가한다
    generations: HashMap<QueryKey, u64>,
}

#[derive(Clone, Default)]
pub struct QueryClient {
    state: Rc<RefCell<QueryState>>,
}

/// 현재 시각(ms). wasm에서는 브라우저 시계를, 네이티브 테스트에서는 시스템 시계를 쓴다.
fn now_ms() -> i64 {
    #[cfg(target_arch = "wasm32")]
    {
        js_sys::Date::now() as i64
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        chrono::Utc::now().timestamp_millis()
    }
}

impl QueryClient {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_query_data<T: DeserializeOwned>(&self, key: &QueryKey) -> Option<T> {
        let state = self.state.borrow();
        let entry = state.entries.get(key)?;
        serde_json::from_value(entry.data.clone()).ok()
    }

    pub fn set_query_data<T: Serialize>(&self, key: &QueryKey, data: &T) {
        let Ok(value) = serde_json::to_value(data) else { return };
        self.set_raw(key, value);
    }

    fn set_raw(&self, key: &QueryKey, data: Value) {
        let mut state = self.state.borrow_mut();
        state.entries.insert(key.clone(), CacheEntry { data, updated_at: now_ms(), invalidated: false });
    }

    /// 캐시가 있으면 그대로, 없으면 fetch로 채운다. 낡음(stale)은 무시한다 —
    /// loader가 내비게이션을 막지 않게 하는 성질이 여기서 온다.
    pub async fn ensure_query_data<T, F, Fut, E>(&self, key: &QueryKey, fetch: F) -> Result<T, E>
    where
        T: Serialize + DeserializeOwned,
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
    {
        if let Some(cached) = self.get_query_data::<T>(key) {
            return Ok(cached);
        }
        self.fetch_query(key, fetch).await
    }

    /// 항상 네트워크를 타고 결과를 캐시에 쓴다.
    pub async fn fetch_query<T, F, Fut, E>(&self, key: &QueryKey, fetch: F) -> Result<T, E>
    where
        T: Serialize + DeserializeOwned,
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
    {
        let generation = self.generation(key);
        let data = fetch().await?;
        // 요청 중에 취소(cancel_queries)가 있었다면 낙관적 패치를 덮지 않는다
        if self.generation(key) == generation {
            self.set_query_data(key, &data);
        }
        Ok(data)
    }

    fn generation(&self, key: &QueryKey) -> u64 {
        self.state.borrow().generations.get(key).copied().unwrap_or(0)
    }

    /// 진행 중인 요청의 결과가 캐시에 쓰이지 않게 한다 — 낙관적 패치 직전에 부른다.
    pub fn cancel_queries(&self, key: &QueryKey) {
        let mut state = self.state.borrow_mut();
        *state.generations.entry(key.clone()).or_insert(0) += 1;
    }

    /// 낡음 표시 — 다음 구독 시 재검증하게 한다. 캐시 데이터는 남는다.
    pub fn invalidate_queries(&self, filter: &QueryKey) {
        let mut state = self.state.borrow_mut();
        for (key, entry) in state.entries.iter_mut() {
            if key.matches(filter) {
                entry.invalidated = true;
            }
        }
    }

    /// 캐시에서 지운다 — 다음 loader가 반드시 새로 채우게 할 때 쓴다(전략 ④).
    pub fn remove_queries(&self, filter: &QueryKey) {
        let mut state = self.state.borrow_mut();
        state.entries.retain(|key, _| !key.matches(filter));
    }

    /// 웹뷰는 새로고침으로 리셋되지 않는다 — 로그아웃 시 이전 유저 데이터를 전부 비운다.
    pub fn clear(&self) {
        let mut state = self.state.borrow_mut();
        state.entries.clear();
    }

    pub fn is_invalidated(&self, key: &QueryKey) -> bool {
        self.state.borrow().entries.get(key).is_some_and(|entry| entry.invalidated)
    }

    /// staleTime을 넘겼거나 무효화됐으면 낡았다 — 게이트(`user.me`)가 재확인 여부를 이걸로 정한다.
    pub fn is_stale(&self, key: &QueryKey, stale_time_ms: i64) -> bool {
        let state = self.state.borrow();
        match state.entries.get(key) {
            Some(entry) => entry.invalidated || now_ms() - entry.updated_at >= stale_time_ms,
            None => true,
        }
    }
}

/// 낙관적 업데이트 배선 — cancel → snapshot → 캐시 패치, 실패 시 롤백, 정착 시 invalidate.
/// 캐시 shape 반영은 `apply` 콜백이 결정한다 (도메인 무관).
pub struct OptimisticPatch<T> {
    client: QueryClient,
    key: QueryKey,
    /// 롤백용 스냅샷 — 패치 전 캐시 값
    previous: Option<T>,
}

impl<T: Serialize + DeserializeOwned> OptimisticPatch<T> {
    /// TS `onMutate` — 취소 → 스냅샷 → 캐시 패치. 캐시가 비어 있으면 패치하지 않는다.
    pub fn begin(client: &QueryClient, key: QueryKey, apply: impl FnOnce(T) -> T) -> Self {
        client.cancel_queries(&key);
        let previous: Option<T> = client.get_query_data(&key);
        if let Some(current) = client.get_query_data::<T>(&key) {
            client.set_query_data(&key, &apply(current));
        }
        Self { client: client.clone(), key, previous }
    }

    /// TS `onError` — 스냅샷으로 롤백한다.
    pub fn rollback(&self) {
        if let Some(previous) = &self.previous {
            self.client.set_query_data(&self.key, previous);
        }
    }

    /// TS `onSettled` — 서버 결과와 수렴하도록 쿼리를 invalidate 한다.
    pub fn settle(&self) {
        self.client.invalidate_queries(&self.key);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, Clone, PartialEq, Eq, Serialize, serde::Deserialize)]
    struct Counter {
        value: i64,
    }

    fn key() -> QueryKey {
        QueryKey::bare("counter")
    }

    #[test]
    fn 캐시를_낙관적으로_패치하고_스냅샷을_들고_있는다() {
        let client = QueryClient::new();
        client.set_query_data(&key(), &Counter { value: 1 });

        let patch = OptimisticPatch::begin(&client, key(), |old: Counter| Counter { value: old.value + 2 });

        assert_eq!(client.get_query_data::<Counter>(&key()), Some(Counter { value: 3 }));
        assert_eq!(patch.previous, Some(Counter { value: 1 }));
    }

    #[test]
    fn 캐시가_비어_있으면_패치하지_않는다() {
        let client = QueryClient::new();

        let patch = OptimisticPatch::begin(&client, key(), |old: Counter| Counter { value: old.value + 2 });

        assert_eq!(client.get_query_data::<Counter>(&key()), None);
        assert_eq!(patch.previous, None);
    }

    #[test]
    fn 실패하면_스냅샷으로_롤백한다() {
        let client = QueryClient::new();
        client.set_query_data(&key(), &Counter { value: 1 });
        let patch = OptimisticPatch::begin(&client, key(), |old: Counter| Counter { value: old.value + 2 });

        patch.rollback();

        assert_eq!(client.get_query_data::<Counter>(&key()), Some(Counter { value: 1 }));
    }

    #[test]
    fn 정착하면_서버_결과와_수렴하도록_invalidate한다() {
        let client = QueryClient::new();
        client.set_query_data(&key(), &Counter { value: 1 });
        let patch = OptimisticPatch::begin(&client, key(), |old: Counter| Counter { value: old.value + 2 });

        patch.settle();

        assert!(client.is_invalidated(&key()));
    }

    #[tokio::test]
    async fn ensure_query_data는_캐시가_있으면_네트워크를_타지_않는다() {
        let client = QueryClient::new();
        client.set_query_data(&key(), &Counter { value: 7 });

        let fetched: Result<Counter, ()> =
            client.ensure_query_data(&key(), || async { panic!("네트워크를 타면 안 된다") }).await;

        assert_eq!(fetched, Ok(Counter { value: 7 }));
    }

    #[tokio::test]
    async fn ensure_query_data는_캐시가_없으면_채운다() {
        let client = QueryClient::new();

        let fetched: Result<Counter, ()> =
            client.ensure_query_data(&key(), || async { Ok(Counter { value: 5 }) }).await;

        assert_eq!(fetched, Ok(Counter { value: 5 }));
        assert_eq!(client.get_query_data::<Counter>(&key()), Some(Counter { value: 5 }));
    }

    #[tokio::test]
    async fn 취소된_요청의_결과는_낙관적_패치를_덮지_않는다() {
        let client = QueryClient::new();
        client.set_query_data(&key(), &Counter { value: 1 });

        // 요청이 아직 날아가는 중에 낙관적 패치가 캐시를 바꾸는 상황을 재현한다
        let fetched: Result<Counter, ()> = client
            .fetch_query(&key(), || async {
                client.cancel_queries(&key());
                client.set_query_data(&key(), &Counter { value: 99 });
                Ok(Counter { value: 1 })
            })
            .await;
        assert_eq!(fetched, Ok(Counter { value: 1 }));
        // 캐시는 낙관적 값을 유지한다 — 늦게 온 응답이 덮지 않는다
        assert_eq!(client.get_query_data::<Counter>(&key()), Some(Counter { value: 99 }));
    }

    #[test]
    fn remove_queries는_경로_접두로_지운다() {
        let client = QueryClient::new();
        client.set_query_data(&QueryKey::new("task.range", &"a"), &Counter { value: 1 });
        client.set_query_data(&QueryKey::new("task.range", &"b"), &Counter { value: 2 });
        client.set_query_data(&QueryKey::bare("task.projects"), &Counter { value: 3 });

        client.remove_queries(&QueryKey::prefix("task.range"));

        assert_eq!(client.get_query_data::<Counter>(&QueryKey::new("task.range", &"a")), None);
        assert_eq!(client.get_query_data::<Counter>(&QueryKey::new("task.range", &"b")), None);
        assert_eq!(
            client.get_query_data::<Counter>(&QueryKey::bare("task.projects")),
            Some(Counter { value: 3 })
        );
    }

    #[test]
    fn clear는_전_캐시를_비운다() {
        let client = QueryClient::new();
        client.set_query_data(&key(), &Counter { value: 1 });
        client.clear();
        assert_eq!(client.get_query_data::<Counter>(&key()), None);
    }

    #[test]
    fn 캐시가_없으면_항상_낡음이다() {
        let client = QueryClient::new();
        assert!(client.is_stale(&key(), 60_000));

        client.set_query_data(&key(), &Counter { value: 1 });
        assert!(!client.is_stale(&key(), 60_000));

        client.invalidate_queries(&QueryKey::prefix("counter"));
        assert!(client.is_stale(&key(), 60_000));
    }
}
