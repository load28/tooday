//! 앱 컨텍스트와 데이터 로딩 훅.
//!
//! locale과 사전은 앱 셸에서 한 번 결정되어 컨텍스트로 내려온다 — 전역 가변 상태가 없다.

use dioxus::prelude::*;
use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::app::trpc::{TrpcClient, TrpcResult};
use crate::shared::i18n::{load_dictionary, Locale, Messages};
use crate::shared::query::QueryKey;

#[derive(Clone)]
pub struct AppContext {
    pub trpc: TrpcClient,
    pub t: Messages,
    pub locale: Locale,
}

impl AppContext {
    pub fn new(locale: Locale) -> Self {
        Self { trpc: TrpcClient::new(), t: load_dictionary(locale), locale }
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
        let app = app.clone();
        let key = key.clone();
        let fetch = fetch.clone();
        async move { Some(app.trpc.query_client.ensure_query_data(&key, || fetch(app.trpc.clone())).await) }
    })
}

/// 캐시에 든 값을 그대로 읽는다 — 낙관적 패치가 반영된 최신 상태를 화면이 보게 한다.
pub fn cached<T: DeserializeOwned>(client: &TrpcClient, key: &QueryKey) -> Option<T> {
    client.query_client.get_query_data(key)
}
