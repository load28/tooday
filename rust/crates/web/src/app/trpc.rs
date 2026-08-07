//! tRPC 클라이언트 — TS `apps/web/src/app/trpc.ts` 대응.
//!
//! 노배치(httpLink 상당): 쿼리는 GET 단일 경로 URL로 나가야 BFF의 HTTP 캐시 정책이
//! 동작한다. 뮤테이션은 POST + 본문.

use std::cell::RefCell;
use std::rc::Rc;

use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::Value;
use tooday_shared::{MeResponse, User, TRPC_ENDPOINT};

use crate::shared::query::{QueryClient, QueryKey};

/// BFF 절대 URL 조립의 단일 소유자 — base URL 배선이 이 모듈 밖으로 새지 않게 한다.
pub fn bff_url(path: &str) -> String {
    format!("{}{path}", bff_base_url())
}

fn bff_base_url() -> String {
    option_env!("TOODAY_BFF_URL").unwrap_or("http://localhost:3002").to_owned()
}

/// BFF가 DomainError를 tRPC로 매핑해 내려주는 전송 코드 중 화면이 분기하는 것들
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrpcErrorCode {
    Conflict,
    Unauthorized,
    NotFound,
    BadRequest,
    Other,
}

impl TrpcErrorCode {
    fn from_str(value: &str) -> Self {
        match value {
            "CONFLICT" => TrpcErrorCode::Conflict,
            "UNAUTHORIZED" => TrpcErrorCode::Unauthorized,
            "NOT_FOUND" => TrpcErrorCode::NotFound,
            "BAD_REQUEST" => TrpcErrorCode::BadRequest,
            _ => TrpcErrorCode::Other,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TrpcError {
    /// BFF가 tRPC 에러 봉투로 돌려준 실패 — 화면이 code로 분기한다
    Procedure { code: TrpcErrorCode, message: String },
    /// 네트워크·파싱 실패
    Transport(String),
}

impl TrpcError {
    pub fn has_code(&self, code: TrpcErrorCode) -> bool {
        matches!(self, TrpcError::Procedure { code: actual, .. } if *actual == code)
    }
}

impl std::fmt::Display for TrpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TrpcError::Procedure { message, .. } => f.write_str(message),
            TrpcError::Transport(message) => f.write_str(message),
        }
    }
}

pub type TrpcResult<T> = Result<T, TrpcError>;

/// 401을 refresh로 자동 복구하지 않을 프로시저 — refresh 자체(재귀 방지) +
/// 로그인/회원가입(401이 정상 응답)
const NON_REFRESHABLE: [&str; 3] = ["auth.refresh", "auth.login", "auth.signup"];

/// 액세스 만료로 여러 요청이 동시에 401을 맞아도 refresh는 한 번만 나가게 하는 single-flight.
#[derive(Clone, Default)]
struct InflightRefresh {
    running: Rc<RefCell<bool>>,
}

#[derive(Clone)]
pub struct TrpcClient {
    pub query_client: QueryClient,
    refresh: InflightRefresh,
    /// 세션이 죽었을 때 게이트 캐시를 버리는 콜백
    on_session_lost: Rc<dyn Fn()>,
}

impl TrpcClient {
    pub fn new() -> Self {
        let query_client = QueryClient::new();
        let gate = query_client.clone();
        Self {
            query_client,
            refresh: InflightRefresh::default(),
            // refresh까지 실패 = 세션이 죽었다. 게이트 캐시를 버려 다음 가드가
            // 곧바로 로그인 리다이렉트하게 한다 — 폴링 주기를 기다리지 않는다.
            on_session_lost: Rc::new(move || gate.remove_queries(&QueryKey::prefix("user.me"))),
        }
    }

    /// 쿼리 — GET 단일 경로 URL(`?input=`)로 나간다.
    pub async fn query<I: Serialize, O: DeserializeOwned>(
        &self,
        path: &'static str,
        input: &I,
    ) -> TrpcResult<O> {
        let encoded = encode_component(&serde_json::to_string(input).unwrap_or_else(|_| "null".into()));
        let url = bff_url(&format!("{TRPC_ENDPOINT}/{path}?input={encoded}"));
        let value = self.send(path, Request::Get(url)).await?;
        decode(value)
    }

    /// 입력이 없는 쿼리
    pub async fn query_bare<O: DeserializeOwned>(&self, path: &'static str) -> TrpcResult<O> {
        let url = bff_url(&format!("{TRPC_ENDPOINT}/{path}"));
        let value = self.send(path, Request::Get(url)).await?;
        decode(value)
    }

    /// 뮤테이션 — POST + JSON 본문
    pub async fn mutate<I: Serialize, O: DeserializeOwned>(
        &self,
        path: &'static str,
        input: &I,
    ) -> TrpcResult<O> {
        let url = bff_url(&format!("{TRPC_ENDPOINT}/{path}"));
        let body = serde_json::to_string(input).unwrap_or_else(|_| "null".into());
        let value = self.send(path, Request::Post { url, body }).await?;
        decode(value)
    }

    /// 액세스 토큰(짧은 JWT)이 만료되면 요청이 401로 돌아온다. refresh(회전)를 한 번
    /// 시도해 새 액세스 쿠키를 받은 뒤 원요청을 재시도한다.
    async fn send(&self, path: &'static str, request: Request) -> TrpcResult<Value> {
        let first = fetch_trpc(request.clone()).await?;
        if first.status != 401 || NON_REFRESHABLE.contains(&path) {
            return unwrap_envelope(first);
        }
        if !self.refresh_session().await {
            (self.on_session_lost)();
            return unwrap_envelope(first);
        }
        unwrap_envelope(fetch_trpc(request).await?)
    }

    /// 액세스 만료 시 refresh(회전)를 한 번만 내보내는 single-flight.
    /// tRPC 재시도와 SSE 채널(`use_task_sync`)이 이 경로를 공유해 두 벌로 갈라지지 않게 한다.
    pub async fn refresh_session(&self) -> bool {
        if *self.refresh.running.borrow() {
            // 이미 진행 중인 회전이 끝나기를 기다린다 — 중복 회전은 재사용 탐지에 걸린다
            while *self.refresh.running.borrow() {
                yield_now().await;
            }
            return true;
        }
        *self.refresh.running.borrow_mut() = true;
        let url = bff_url(&format!("{TRPC_ENDPOINT}/auth.refresh"));
        // 웹은 리프레시 쿠키로 인증 — body는 비운다
        let outcome = fetch_trpc(Request::Post { url, body: "{}".into() }).await;
        *self.refresh.running.borrow_mut() = false;
        matches!(outcome, Ok(response) if response.status < 400)
    }
}

impl Default for TrpcClient {
    fn default() -> Self {
        Self::new()
    }
}

/// 세션 게이트가 캐시를 신선하다고 볼 시간 — 이 동안은 재확인 요청이 나가지 않는다.
const SESSION_STALE_MS: i64 = 15 * 60_000;

/// 세션 게이트 — 라우트 가드가 매 진입마다 부른다.
///
/// 게이트 용도라 초 단위 정확도가 필요 없다. 캐시를 즉시 반환해 내비게이션을 막지 않고,
/// 낡았을 때만 뒤에서 세션 유효성을 재확인한다. 폐기를 즉시 잡는 건 이 주기가 아니라
/// 401 복구 실패 시의 세션 상실 콜백이 담당한다.
pub async fn fetch_session_user(client: &TrpcClient) -> Option<User> {
    let key = QueryKey::bare("user.me");
    if !client.query_client.is_stale(&key, SESSION_STALE_MS) {
        if let Some(cached) = client.query_client.get_query_data::<MeResponse>(&key) {
            return cached.user;
        }
    }
    let fetched: TrpcResult<MeResponse> =
        client.query_client.fetch_query(&key, || client.query_bare::<MeResponse>("user.me")).await;
    fetched.ok().and_then(|response| response.user)
}

// --- 전송 계층 ---------------------------------------------------------------

#[derive(Clone)]
// 필드는 wasm 전송 경로에서만 읽힌다 — 네이티브 빌드에서는 fetch가 없다
#[cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]
enum Request {
    Get(String),
    Post { url: String, body: String },
}

struct RawResponse {
    status: u16,
    body: Value,
}

/// tRPC 봉투를 벗긴다 — 성공은 `result.data`, 실패는 `error.data.code`로 분기한다.
fn unwrap_envelope(response: RawResponse) -> TrpcResult<Value> {
    if let Some(data) = response.body.get("result").and_then(|result| result.get("data")) {
        return Ok(data.clone());
    }
    let error = response.body.get("error");
    let code = error
        .and_then(|error| error.get("data"))
        .and_then(|data| data.get("code"))
        .and_then(Value::as_str)
        .map(TrpcErrorCode::from_str)
        .unwrap_or(TrpcErrorCode::Other);
    let message = error
        .and_then(|error| error.get("message"))
        .and_then(Value::as_str)
        .unwrap_or("요청에 실패했습니다.")
        .to_owned();
    Err(TrpcError::Procedure { code, message })
}

fn decode<O: DeserializeOwned>(value: Value) -> TrpcResult<O> {
    serde_json::from_value(value).map_err(|error| TrpcError::Transport(error.to_string()))
}

fn encode_component(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (byte as char).to_string(),
            _ => format!("%{byte:02X}"),
        })
        .collect()
}

#[cfg(target_arch = "wasm32")]
async fn fetch_trpc(request: Request) -> TrpcResult<RawResponse> {
    use gloo_net::http::Request as HttpRequest;
    use web_sys::RequestCredentials;

    let builder = match &request {
        Request::Get(url) => HttpRequest::get(url),
        Request::Post { url, .. } => HttpRequest::post(url),
    };
    // 쿠키 인증이므로 자격증명을 항상 싣는다
    let builder = builder.credentials(RequestCredentials::Include);
    let sent = match &request {
        Request::Get(_) => builder.send().await,
        Request::Post { body, .. } => {
            match builder.header("Content-Type", "application/json").body(body.clone()) {
                Ok(prepared) => prepared.send().await,
                Err(error) => return Err(TrpcError::Transport(error.to_string())),
            }
        }
    };
    let response = sent.map_err(|error| TrpcError::Transport(error.to_string()))?;
    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    Ok(RawResponse { status, body: serde_json::from_str(&text).unwrap_or(Value::Null) })
}

#[cfg(not(target_arch = "wasm32"))]
async fn fetch_trpc(_request: Request) -> TrpcResult<RawResponse> {
    // 네이티브 빌드(테스트·타입체크)에는 fetch가 없다 — 전송은 wasm 전용이다.
    Err(TrpcError::Transport("HTTP 전송은 wasm 타깃에서만 동작한다".into()))
}

#[cfg(target_arch = "wasm32")]
async fn yield_now() {
    gloo_timers::future::TimeoutFuture::new(16).await;
}

#[cfg(not(target_arch = "wasm32"))]
async fn yield_now() {}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn 성공_봉투에서_데이터를_꺼낸다() {
        let response = RawResponse { status: 200, body: json!({ "result": { "data": { "ok": true } } }) };
        assert_eq!(unwrap_envelope(response), Ok(json!({ "ok": true })));
    }

    #[test]
    fn 에러_봉투에서_코드와_메시지를_꺼낸다() {
        let response = RawResponse {
            status: 409,
            body: json!({
                "error": {
                    "message": "이미 가입된 이메일입니다.",
                    "code": -32009,
                    "data": { "code": "CONFLICT", "httpStatus": 409, "path": "auth.signup" }
                }
            }),
        };
        let error = unwrap_envelope(response).expect_err("에러여야 한다");
        assert!(error.has_code(TrpcErrorCode::Conflict));
        assert_eq!(error.to_string(), "이미 가입된 이메일입니다.");
    }

    #[test]
    fn 알_수_없는_봉투는_other_코드로_떨어진다() {
        let response = RawResponse { status: 500, body: Value::Null };
        let error = unwrap_envelope(response).expect_err("에러여야 한다");
        assert!(error.has_code(TrpcErrorCode::Other));
    }

    #[test]
    fn refresh와_로그인_회원가입은_401_자동복구_대상이_아니다() {
        assert!(NON_REFRESHABLE.contains(&"auth.refresh"));
        assert!(NON_REFRESHABLE.contains(&"auth.login"));
        assert!(NON_REFRESHABLE.contains(&"auth.signup"));
        assert!(!NON_REFRESHABLE.contains(&"task.range"));
        assert!(!NON_REFRESHABLE.contains(&"user.me"));
    }

    #[test]
    fn 입력은_url_인코딩된_json으로_실린다() {
        assert_eq!(encode_component(r#"{"from":"2026-07-02"}"#), "%7B%22from%22%3A%222026-07-02%22%7D");
    }
}
