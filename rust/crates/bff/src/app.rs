use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Request, State};
use axum::http::{header, HeaderMap, HeaderName, HeaderValue, Method, StatusCode};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get};
use axum::{Json, Router};
use futures::Stream;
use serde_json::{json, Value};
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::modules::auth::access_token::AccessTokens;
use crate::modules::auth::ports::{RefreshTokenStore, UserStore};
use crate::modules::auth::session_liveness::verify_live_session;
use crate::modules::auth::token::extract_access_token;
use crate::modules::task::ports::{ProjectStore, TaskStore};
use crate::modules::user::ports::UserReader;
use crate::platform::config::BffConfig;
use crate::platform::errors::DomainErrorCode;
use crate::platform::http::error_response;
use crate::platform::logging::{Logger, NoopLogger};
use crate::platform::sync_broker::SyncBroker;
use crate::trpc::cache::{resolve_cache_control, ResponseMeta};
use crate::trpc::context::TrpcContext;
use crate::trpc::init::{ProcedureKind, TrpcError, TrpcErrorCode};
use crate::trpc::router::{AppRouter, AppRouterDeps};
use tooday_shared::{SYNC_EVENTS_PATH, TRPC_ENDPOINT};

pub struct AppDeps {
    pub config: BffConfig,
    pub users: Arc<dyn UserStore>,
    pub user_reader: Arc<dyn UserReader>,
    pub refresh_tokens: Arc<dyn RefreshTokenStore>,
    pub access_tokens: Arc<dyn AccessTokens>,
    pub tasks: Arc<dyn TaskStore>,
    pub projects: Arc<dyn ProjectStore>,
    pub sync: Arc<dyn SyncBroker>,
    pub logger: Option<Logger>,
}

pub struct AppState {
    config: Arc<BffConfig>,
    router: AppRouter,
    access_tokens: Arc<dyn AccessTokens>,
    refresh_tokens: Arc<dyn RefreshTokenStore>,
    sync: Arc<dyn SyncBroker>,
    #[allow(dead_code)]
    logger: Logger,
}

pub fn create_app(deps: AppDeps) -> Router {
    let config = Arc::new(deps.config);
    let logger = deps.logger.unwrap_or_else(|| Arc::new(NoopLogger));

    let state = Arc::new(AppState {
        config: Arc::clone(&config),
        router: AppRouter::new(AppRouterDeps {
            users: deps.users,
            user_reader: deps.user_reader,
            refresh_tokens: Arc::clone(&deps.refresh_tokens),
            access_tokens: Arc::clone(&deps.access_tokens),
            tasks: deps.tasks,
            projects: deps.projects,
            sync: Arc::clone(&deps.sync),
        }),
        access_tokens: deps.access_tokens,
        refresh_tokens: deps.refresh_tokens,
        sync: deps.sync,
        logger,
    });

    // 쿠키 인증에는 credentials CORS가 필수
    let origins: Vec<HeaderValue> =
        config.allowed_origins.iter().filter_map(|origin| HeaderValue::from_str(origin).ok()).collect();
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    Router::new()
        .route("/health", get(|| async { Json(json!({ "status": "ok" })) }))
        // 동기화 신호 채널 — "네 데이터 바뀜"만 흘린다. 클라이언트는 신호를 받으면
        // 자기 커서로 task.changes를 당긴다 (신호 유실·중복은 커서가 흡수).
        .route(SYNC_EVENTS_PATH, get(sync_events))
        .route(&format!("{TRPC_ENDPOINT}/{{*path}}"), any(trpc_handler))
        .fallback(not_found)
        .layer(cors)
        .with_state(state)
}

async fn not_found() -> Response {
    error_response(StatusCode::NOT_FOUND, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.")
}

// --- tRPC HTTP 어댑터 --------------------------------------------------------

/// 한 프로시저 호출의 결과 — 배치 응답은 이 값을 순서대로 담는다.
struct CallOutcome {
    path: String,
    result: Result<Value, TrpcError>,
}

impl CallOutcome {
    fn to_envelope(&self) -> Value {
        match &self.result {
            Ok(data) => json!({ "result": { "data": data } }),
            Err(error) => json!({
                "error": {
                    "message": error.message,
                    "code": error.code.json_rpc_code(),
                    "data": {
                        "code": error.code.as_str(),
                        "httpStatus": error.code.http_status(),
                        "path": self.path,
                    }
                }
            }),
        }
    }
}

async fn trpc_handler(State(state): State<Arc<AppState>>, request: Request) -> Response {
    let method = request.method().clone();
    let kind = match method {
        Method::GET => ProcedureKind::Query,
        Method::POST => ProcedureKind::Mutation,
        _ => {
            return error_response(
                StatusCode::METHOD_NOT_ALLOWED,
                "METHOD_NOT_SUPPORTED",
                "지원하지 않는 메서드입니다.",
            )
        }
    };

    let uri = request.uri().clone();
    let query = parse_query(uri.query().unwrap_or_default());
    let is_batch = query.iter().any(|(key, value)| key == "batch" && value == "1");

    let path = uri.path().strip_prefix(&format!("{TRPC_ENDPOINT}/")).unwrap_or_default().to_owned();
    let paths: Vec<String> = path.split(',').filter(|part| !part.is_empty()).map(str::to_owned).collect();

    let headers = request.headers().clone();
    let authorization = header_str(&headers, header::AUTHORIZATION);
    let cookie_header = header_str(&headers, header::COOKIE);

    // 입력은 쿼리(GET)나 본문(POST)에서 온다. 배치면 인덱스 키를 가진 객체다.
    let raw_input: Option<Value> = match kind {
        ProcedureKind::Query => query
            .iter()
            .find(|(key, _)| key == "input")
            .and_then(|(_, value)| serde_json::from_str(value).ok()),
        ProcedureKind::Mutation => {
            let bytes = match axum::body::to_bytes(request.into_body(), 1024 * 1024).await {
                Ok(bytes) => bytes,
                Err(_) => {
                    return error_response(
                        StatusCode::BAD_REQUEST,
                        "PARSE_ERROR",
                        "요청 본문을 읽지 못했습니다.",
                    )
                }
            };
            if bytes.is_empty() {
                None
            } else {
                serde_json::from_slice(&bytes).ok()
            }
        }
    };

    let mut ctx = TrpcContext::create(
        Arc::clone(&state.config),
        state.access_tokens.as_ref(),
        state.refresh_tokens.as_ref(),
        authorization.as_deref(),
        cookie_header.as_deref(),
    )
    .await;

    let mut outcomes: Vec<CallOutcome> = Vec::with_capacity(paths.len());
    for (index, procedure_path) in paths.iter().enumerate() {
        let input = if is_batch {
            raw_input.as_ref().and_then(|value| value.get(index.to_string()).cloned())
        } else {
            raw_input.clone()
        };
        let result = state.router.call(&mut ctx, procedure_path, kind, input).await;
        outcomes.push(CallOutcome { path: procedure_path.clone(), result });
    }

    if outcomes.is_empty() {
        outcomes.push(CallOutcome {
            path: path.clone(),
            result: Err(TrpcError::new(
                TrpcErrorCode::NotFound,
                format!("No procedure found on path \"{path}\""),
            )),
        });
    }

    let body = if is_batch {
        Value::Array(outcomes.iter().map(CallOutcome::to_envelope).collect())
    } else {
        outcomes[0].to_envelope()
    };

    let status = response_status(&outcomes);
    let cache_control = resolve_cache_control(&ResponseMeta {
        paths: &paths,
        kind,
        has_errors: outcomes.iter().any(|outcome| outcome.result.is_err()),
    });

    let mut response = (status, Json(body)).into_response();
    let response_headers = response.headers_mut();
    response_headers
        .insert(header::CACHE_CONTROL, HeaderValue::from_str(&cache_control).expect("cache-control은 ASCII"));
    for cookie in &ctx.set_cookies {
        if let Ok(value) = HeaderValue::from_str(cookie) {
            response_headers.append(header::SET_COOKIE, value);
        }
    }
    response
}

/// 배치는 상태가 갈리면 207, 아니면 공통 상태를 쓴다 (tRPC와 같은 규칙).
fn response_status(outcomes: &[CallOutcome]) -> StatusCode {
    let statuses: Vec<u16> = outcomes
        .iter()
        .map(|outcome| match &outcome.result {
            Ok(_) => 200,
            Err(error) => error.code.http_status(),
        })
        .collect();
    let first = statuses[0];
    if statuses.iter().all(|status| *status == first) {
        StatusCode::from_u16(first).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
    } else {
        StatusCode::MULTI_STATUS
    }
}

fn header_str(headers: &HeaderMap, name: HeaderName) -> Option<String> {
    headers.get(name)?.to_str().ok().map(str::to_owned)
}

fn parse_query(query: &str) -> Vec<(String, String)> {
    query
        .split('&')
        .filter(|pair| !pair.is_empty())
        .map(|pair| {
            let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
            (decode_component(key), decode_component(value))
        })
        .collect()
}

fn decode_component(value: &str) -> String {
    let plus_decoded = value.replace('+', " ");
    percent_encoding::percent_decode_str(&plus_decoded).decode_utf8_lossy().into_owned()
}

// --- SSE 신호 채널 -----------------------------------------------------------

async fn sync_events(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, Response> {
    // tRPC 밖의 라우트도 protectedProcedure와 같은 규칙(액세스 JWT + 세션 라이브니스)을
    // verify_live_session으로 공유해, 인증 로직이 두 벌로 갈라지지 않게 한다.
    let token = extract_access_token(
        header_str(&headers, header::AUTHORIZATION).as_deref(),
        header_str(&headers, header::COOKIE).as_deref(),
        &state.config.access_cookie_name,
    );
    let user_id =
        verify_live_session(token.as_deref(), state.access_tokens.as_ref(), state.refresh_tokens.as_ref())
            .await
            .ok_or_else(|| {
                error_response(
                    StatusCode::UNAUTHORIZED,
                    DomainErrorCode::Unauthenticated.as_str(),
                    DomainErrorCode::Unauthenticated.message(),
                )
            })?;

    let (sender, receiver) = mpsc::unbounded_channel::<Result<Event, Infallible>>();
    // 접속(재접속) 직후 한 번 신호 — 끊겨 있던 사이 놓친 변경을 커서로 따라잡게 한다
    let _ = sender.send(Ok(Event::default().event("change").data("")));

    let subscription = Arc::clone(&state.sync).subscribe(
        &user_id,
        Arc::new({
            let sender = sender.clone();
            move || {
                // 수신자가 사라졌으면(연결 종료) 실패는 무시한다 — 구독은 아래에서 정리된다
                let _ = sender.send(Ok(Event::default().event("change").data("")));
            }
        }),
    );

    let stream =
        SubscribedStream { inner: UnboundedReceiverStream::new(receiver), _subscription: subscription };
    // 프록시 idle timeout 방지 — TS의 25초 ping과 같은 주기
    Ok(Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(25)).text("ping")))
}

/// 스트림이 살아있는 동안 구독을 붙잡아 둔다 — 연결이 끊기면 함께 drop 되어 구독이 풀린다.
struct SubscribedStream<S> {
    inner: S,
    _subscription: crate::platform::sync_broker::Subscription,
}

impl<S: Stream + Unpin> Stream for SubscribedStream<S> {
    type Item = S::Item;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        std::pin::Pin::new(&mut self.inner).poll_next(cx)
    }
}
