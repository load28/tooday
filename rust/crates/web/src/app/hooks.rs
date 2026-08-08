//! 앱 컨텍스트와 데이터 로딩 훅.
//!
//! locale과 사전은 앱 셸에서 한 번 결정되어 컨텍스트로 내려온다 — 전역 가변 상태가 없다.

use std::rc::Rc;

use dioxus::prelude::*;
use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::app::trpc::{TrpcClient, TrpcResult};
use crate::shared::i18n::{load_dictionary, Locale, Messages};
use crate::shared::query::{CacheEvent, QueryKey};

#[derive(Clone)]
pub struct AppContext {
    pub trpc: TrpcClient,
    pub t: Messages,
    pub locale: Locale,
    /// 캐시 변경 카운터. 쿼리 캐시는 UI를 모르는 순수 구조라 그 자체로는 리렌더를
    /// 일으키지 못한다 — 캐시가 바뀔 때마다 이 시그널을 올려, 캐시를 읽는 화면이
    /// 낙관적 패치와 SSE 델타를 곧바로 보게 한다.
    revision: Signal<u64>,
    /// 무효화 카운터. 붙어 있는 쿼리를 다시 당기는 신호다 — 쓰기(revision)와 갈라 두지
    /// 않으면 조회 → 쓰기 → 재조회가 끝없이 돈다.
    invalidation: Signal<u64>,
}

impl AppContext {
    /// 컴포넌트 스코프에서 호출해야 한다 — 시그널의 수명이 앱 셸에 묶인다.
    pub fn new(locale: Locale) -> Self {
        let trpc = TrpcClient::new();
        let revision = Signal::new(0u64);
        let invalidation = Signal::new(0u64);
        trpc.query_client.subscribe(Rc::new(move |event| {
            // Signal은 Copy라 Fn 클로저 안에서도 매번 새 핸들로 쓴다
            let mut revision = revision;
            revision += 1;
            if event == CacheEvent::Invalidated {
                let mut invalidation = invalidation;
                invalidation += 1;
            }
        }));
        Self { trpc, t: load_dictionary(locale), locale, revision, invalidation }
    }

    /// 캐시에 든 값을 읽으면서 변경 구독을 건다 — 낙관적 패치가 반영된 최신 상태를
    /// 화면이 보게 한다.
    pub fn cached<T: DeserializeOwned>(&self, key: &QueryKey) -> Option<T> {
        // 읽는 것만으로 이 컴포넌트가 캐시 변경을 구독한다
        let _ = self.revision.read();
        self.trpc.query_client.get_query_data(key)
    }
}

pub fn use_app() -> AppContext {
    use_context::<AppContext>()
}

/// 캐시를 먼저 보고 없을 때만 네트워크를 타는 로딩 훅.
///
/// TS의 `ensureQueryData` + `useSuspenseQuery` 조합이 하던 일이다 — 캐시가 살아 있으면
/// 첫 렌더에서 곧바로 데이터가 있고(내비게이션 블로킹 제로), 없을 때만 로딩 상태가 뜬다.
pub fn use_cached_query<T, F, Fut>(key: QueryKey, fetch: F) -> Resource<Option<TrpcResult<T>>>
where
    T: Serialize + DeserializeOwned + Clone + PartialEq + 'static,
    F: Fn(TrpcClient) -> Fut + Clone + 'static,
    Fut: std::future::Future<Output = TrpcResult<T>> + 'static,
{
    let app = use_app();
    use_resource(move || {
        // 무효화 신호를 구독한다 — 뮤테이션이 정착하면(onSettled) 이 쿼리가 다시 당겨진다.
        // 쓰기 카운터(revision)를 구독하면 자기 응답에 자기가 반응해 무한히 돈다.
        let _ = app.invalidation.read();
        let app = app.clone();
        let key = key.clone();
        let fetch = fetch.clone();
        async move {
            let client = &app.trpc.query_client;
            // 낡음 표시가 붙은 키는 캐시를 무시하고 새로 당긴다 (쓰기가 표시를 지운다)
            let outcome = if client.is_invalidated(&key) {
                client.fetch_query(&key, || fetch(app.trpc.clone())).await
            } else {
                client.ensure_query_data(&key, || fetch(app.trpc.clone())).await
            };
            Some(outcome)
        }
    })
}
