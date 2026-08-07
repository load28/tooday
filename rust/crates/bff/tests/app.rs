//! `apps/bff/src/app.test.ts`의 포팅본.
//!
//! TS 테스트와 같은 시나리오·같은 단언을 유지한다 — 이 파일이 통과한다는 것이
//! 러스트 BFF가 기존 BFF와 같은 HTTP 계약을 갖는다는 증거다.

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use serde::de::DeserializeOwned;
use serde_json::{json, Value};
use tower::ServiceExt;

use tooday_bff::app::{create_app, AppDeps};
use tooday_bff::modules::auth::access_token::AccessTokenService;
use tooday_bff::modules::auth::adapters::memory::{InMemoryRefreshTokenStore, InMemoryUserStore};
use tooday_bff::modules::auth::cookies::{
    serialize_access_cookie, serialize_auth_cookie_removals, serialize_refresh_cookie,
};
use tooday_bff::modules::task::adapters::memory::{
    InMemoryProjectStore, InMemorySyncCounter, InMemoryTaskStore,
};
use tooday_bff::platform::config::BffConfig;
use tooday_bff::platform::logging::LogFormat;
use tooday_bff::platform::sync_broker::{InMemorySyncBroker, SyncBroker};
use tooday_bff::trpc::cache::{
    serialize_public_cache_control, CACHE_DIRECTIVES_BY_PATH, PRIVATE_CACHE_CONTROL,
};
use tooday_shared::{
    AuthResponse, MeResponse, Project, ProjectResponse, SyncChangesResponse, Task, TaskChange,
    TaskRangeResponse, TaskResponse, TaskStatus, TokenPair, SYNC_EVENTS_PATH, TRPC_ENDPOINT,
};

struct TestApp {
    router: Router,
    config: BffConfig,
    sync: Arc<InMemorySyncBroker>,
}

fn setup() -> TestApp {
    setup_with(|_| {})
}

fn setup_with(customize: impl FnOnce(&mut BffConfig)) -> TestApp {
    let mut config = BffConfig {
        port: 0,
        allowed_origins: vec!["http://localhost:3000".into()],
        access_cookie_name: "tooday_access".into(),
        refresh_cookie_name: "tooday_refresh".into(),
        cookie_secure: false,
        jwt_secret: "test-secret".into(),
        access_ttl_ms: 60_000,
        refresh_idle_ttl_ms: 60_000,
        refresh_absolute_ttl_ms: 120_000,
        database_url: None,
        pg_pool_size: 1,
        redis_url: None,
        log_format: LogFormat::Pretty,
        log_requests: false,
    };
    customize(&mut config);

    let users = Arc::new(InMemoryUserStore::new());
    let counter = InMemorySyncCounter::new();
    let sync = InMemorySyncBroker::new();
    let router = create_app(AppDeps {
        users: Arc::clone(&users) as Arc<_>,
        // InMemoryUserStore가 UserReader도 구현한다 — 같은 가짜 users 테이블
        user_reader: Arc::clone(&users) as Arc<_>,
        refresh_tokens: Arc::new(InMemoryRefreshTokenStore::new(
            config.refresh_idle_ttl_ms,
            config.refresh_absolute_ttl_ms,
        )),
        access_tokens: Arc::new(AccessTokenService::new(&config.jwt_secret, config.access_ttl_ms)),
        tasks: Arc::new(InMemoryTaskStore::new(Arc::clone(&counter))),
        projects: Arc::new(InMemoryProjectStore::new(counter)),
        sync: Arc::clone(&sync) as Arc<_>,
        logger: None,
        config: config.clone(),
    });

    TestApp { router, config, sync }
}

const SIGNUP_EMAIL: &str = "test@tooday.app";
const SIGNUP_PASSWORD: &str = "password123";
const SIGNUP_NAME: &str = "테스터";

fn signup_body() -> Value {
    json!({ "email": SIGNUP_EMAIL, "password": SIGNUP_PASSWORD, "name": SIGNUP_NAME })
}

fn trpc_path(procedure: &str) -> String {
    format!("{TRPC_ENDPOINT}/{procedure}")
}

/// 응답을 상태·헤더·본문으로 펼쳐 둔다 — TS의 `Response` 객체 역할
struct TestResponse {
    status: StatusCode,
    headers: axum::http::HeaderMap,
    body: Value,
}

impl TestResponse {
    fn header(&self, name: &str) -> Option<String> {
        self.headers.get(name)?.to_str().ok().map(str::to_owned)
    }

    fn set_cookies(&self) -> Vec<String> {
        self.headers
            .get_all(axum::http::header::SET_COOKIE)
            .iter()
            .filter_map(|value| value.to_str().ok().map(str::to_owned))
            .collect()
    }

    /// tRPC 성공 봉투를 벗기고 계약 타입으로 파싱한다 — TS의 `unwrapTrpcData`
    fn data<T: DeserializeOwned>(&self) -> T {
        let data = self
            .body
            .get("result")
            .and_then(|result| result.get("data"))
            .unwrap_or_else(|| panic!("성공 봉투가 아니다: {}", self.body));
        serde_json::from_value(data.clone())
            .unwrap_or_else(|error| panic!("계약 위반: {error} — {data}"))
    }
}

impl TestApp {
    async fn request(&self, uri: &str, builder: RequestInit) -> TestResponse {
        let mut request = Request::builder().method(builder.method).uri(uri);
        for (name, value) in &builder.headers {
            request = request.header(name, value);
        }
        let body = match &builder.body {
            Some(value) => Body::from(value.clone()),
            None => Body::empty(),
        };
        let response = self
            .router
            .clone()
            .oneshot(request.body(body).expect("요청 조립"))
            .await
            .expect("응답");

        let status = response.status();
        let headers = response.headers().clone();

        // SSE는 끝나지 않는 스트림이라 끝까지 읽을 수 없다 — TS 테스트의 `res.body.cancel()`과
        // 같게 본문을 버린다(연결 종료 → 구독 해제).
        let is_stream = headers
            .get(axum::http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| value.contains("text/event-stream"));
        let body = if is_stream {
            drop(response.into_body());
            Value::Null
        } else {
            let bytes = axum::body::to_bytes(response.into_body(), 8 * 1024 * 1024)
                .await
                .unwrap_or_default();
            serde_json::from_slice(&bytes).unwrap_or(Value::Null)
        };
        TestResponse { status, headers, body }
    }

    async fn get(&self, uri: &str) -> TestResponse {
        self.request(uri, RequestInit::get()).await
    }
}

#[derive(Clone)]
struct RequestInit {
    method: &'static str,
    headers: Vec<(String, String)>,
    body: Option<String>,
}

impl RequestInit {
    fn get() -> Self {
        Self { method: "GET", headers: Vec::new(), body: None }
    }

    /// TS의 `postJson` — 입력이 없으면 본문 자체를 비운다(logout 경로)
    fn post_json(input: Option<Value>) -> Self {
        Self {
            method: "POST",
            headers: vec![("Content-Type".into(), "application/json".into())],
            body: input.map(|value| value.to_string()),
        }
    }

    fn header(mut self, name: &str, value: impl Into<String>) -> Self {
        self.headers.push((name.to_owned(), value.into()));
        self
    }

    fn auth(self, token: &str) -> Self {
        self.header("Authorization", format!("Bearer {token}"))
    }
}

fn access_cookie_header(config: &BffConfig, token: &str) -> String {
    format!("{}={token}", config.access_cookie_name)
}

fn refresh_cookie_header(config: &BffConfig, token: &str) -> String {
    format!("{}={token}", config.refresh_cookie_name)
}

/// 쿼리 프로시저의 input은 URL 인코딩된 JSON으로 실린다
fn query_path(procedure: &str, input: &Value) -> String {
    let encoded: String = percent_encode(&input.to_string());
    format!("{}?input={encoded}", trpc_path(procedure))
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (byte as char).to_string()
            }
            _ => format!("%{byte:02X}"),
        })
        .collect()
}

struct SignedUp {
    response: TestResponse,
    user: tooday_shared::User,
    /// 액세스 JWT(Bearer 인증용)
    token: String,
    /// 회전용 불투명 토큰
    refresh_token: String,
}

async fn signup(app: &TestApp) -> SignedUp {
    signup_as(app, signup_body()).await
}

async fn signup_as(app: &TestApp, body: Value) -> SignedUp {
    let response = app.request(&trpc_path("auth.signup"), RequestInit::post_json(Some(body))).await;
    let auth: AuthResponse = response.data();
    SignedUp {
        response,
        user: auth.user,
        token: auth.access_token,
        refresh_token: auth.refresh_token,
    }
}

async fn signup_other(app: &TestApp) -> SignedUp {
    signup_as(
        app,
        json!({ "email": "other@tooday.app", "password": "password123", "name": "아더" }),
    )
    .await
}

// --- health ------------------------------------------------------------------

#[tokio::test]
async fn health_상태를_반환한다() {
    let app = setup();
    let response = app.get("/health").await;
    assert_eq!(response.status, StatusCode::OK);
    assert_eq!(response.body, json!({ "status": "ok" }));
}

// --- auth.signup -------------------------------------------------------------

#[tokio::test]
async fn signup_유저를_생성하고_쿠키와_토큰_쌍을_함께_내려준다() {
    let app = setup();
    let signed_up = signup(&app).await;

    assert_eq!(signed_up.response.status, StatusCode::OK);
    assert_eq!(signed_up.user.email, SIGNUP_EMAIL);
    assert_eq!(signed_up.user.name, SIGNUP_NAME);
    assert_eq!(signed_up.token.split('.').count(), 3, "액세스는 JWT");
    assert_eq!(signed_up.refresh_token.len(), 64, "리프레시는 불투명 토큰");

    let set_cookies = signed_up.response.set_cookies();
    assert!(set_cookies.contains(&serialize_access_cookie(&app.config, &signed_up.token)));
    assert!(set_cookies.contains(&serialize_refresh_cookie(&app.config, &signed_up.refresh_token)));
    assert_eq!(signed_up.response.header("cache-control").as_deref(), Some(PRIVATE_CACHE_CONTROL));
}

#[tokio::test]
async fn signup_중복_이메일이면_409를_반환한다() {
    let app = setup();
    signup(&app).await;
    let response =
        app.request(&trpc_path("auth.signup"), RequestInit::post_json(Some(signup_body()))).await;
    assert_eq!(response.status, StatusCode::CONFLICT);
}

#[tokio::test]
async fn signup_짧은_비밀번호는_400을_반환한다() {
    let app = setup();
    let body = json!({ "email": SIGNUP_EMAIL, "password": "short", "name": SIGNUP_NAME });
    let response = app.request(&trpc_path("auth.signup"), RequestInit::post_json(Some(body))).await;
    assert_eq!(response.status, StatusCode::BAD_REQUEST);
}

// --- auth.login --------------------------------------------------------------

#[tokio::test]
async fn login_올바른_자격증명이면_쿠키와_토큰_쌍을_내려준다() {
    let app = setup();
    signup(&app).await;

    let response = app
        .request(
            &trpc_path("auth.login"),
            RequestInit::post_json(Some(
                json!({ "email": SIGNUP_EMAIL, "password": SIGNUP_PASSWORD }),
            )),
        )
        .await;
    assert_eq!(response.status, StatusCode::OK);

    let auth: AuthResponse = response.data();
    let set_cookies = response.set_cookies();
    assert!(set_cookies.contains(&serialize_access_cookie(&app.config, &auth.access_token)));
    assert!(set_cookies.contains(&serialize_refresh_cookie(&app.config, &auth.refresh_token)));
}

#[tokio::test]
async fn login_비밀번호가_틀리면_401을_반환한다() {
    let app = setup();
    signup(&app).await;

    let response = app
        .request(
            &trpc_path("auth.login"),
            RequestInit::post_json(Some(
                json!({ "email": SIGNUP_EMAIL, "password": "wrong-password" }),
            )),
        )
        .await;
    assert_eq!(response.status, StatusCode::UNAUTHORIZED);
}

// --- user.me — 인증 (쿠키 + 헤더 이중 지원) ----------------------------------

#[tokio::test]
async fn me_쿠키_방식으로_접근할_수_있다() {
    let app = setup();
    let signed_up = signup(&app).await;

    let response = app
        .request(
            &trpc_path("user.me"),
            RequestInit::get().header("Cookie", access_cookie_header(&app.config, &signed_up.token)),
        )
        .await;
    assert_eq!(response.status, StatusCode::OK);
    let me: MeResponse = response.data();
    assert_eq!(me.user.map(|user| user.email).as_deref(), Some(SIGNUP_EMAIL));
}

#[tokio::test]
async fn me_authorization_bearer_헤더_방식으로_접근할_수_있다() {
    let app = setup();
    let signed_up = signup(&app).await;

    let response =
        app.request(&trpc_path("user.me"), RequestInit::get().auth(&signed_up.token)).await;
    assert_eq!(response.status, StatusCode::OK);
    let me: MeResponse = response.data();
    assert_eq!(me.user.map(|user| user.email).as_deref(), Some(SIGNUP_EMAIL));
}

#[tokio::test]
async fn me_헤더가_쿠키보다_우선한다() {
    let app = setup();
    let signed_up = signup(&app).await;

    let response = app
        .request(
            &trpc_path("user.me"),
            RequestInit::get()
                .auth("invalid-token")
                .header("Cookie", access_cookie_header(&app.config, &signed_up.token)),
        )
        .await;
    assert_eq!(response.status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn me_자격증명이_전혀_없으면_익명_200과_user_null을_반환한다() {
    let app = setup();
    let response = app.get(&trpc_path("user.me")).await;
    assert_eq!(response.status, StatusCode::OK);
    let me: MeResponse = response.data();
    assert_eq!(me.user, None);
}

#[tokio::test]
async fn me_리프레시_쿠키만_있고_액세스가_없으면_401을_반환한다() {
    let app = setup();
    let response = app
        .request(
            &trpc_path("user.me"),
            RequestInit::get()
                .header("Cookie", refresh_cookie_header(&app.config, "some-refresh-token")),
        )
        .await;
    assert_eq!(response.status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn me_만료된_액세스_토큰은_401을_반환한다() {
    let app = setup_with(|config| config.access_ttl_ms = -60_000);
    let signed_up = signup(&app).await;

    let response =
        app.request(&trpc_path("user.me"), RequestInit::get().auth(&signed_up.token)).await;
    assert_eq!(response.status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn me_프라이빗_응답이므로_캐시되지_않는다() {
    let app = setup();
    let signed_up = signup(&app).await;

    let response =
        app.request(&trpc_path("user.me"), RequestInit::get().auth(&signed_up.token)).await;
    assert_eq!(response.header("cache-control").as_deref(), Some(PRIVATE_CACHE_CONTROL));
}

// --- HTTP 캐시 정책 -----------------------------------------------------------

#[tokio::test]
async fn 캐시_pub_쿼리는_경로별_public_cache_control을_받는다() {
    let app = setup();
    let response = app.get(&trpc_path("pub.appConfig")).await;
    assert_eq!(response.status, StatusCode::OK);

    let directives = CACHE_DIRECTIVES_BY_PATH
        .iter()
        .find(|(path, _)| *path == "pub.appConfig")
        .map(|(_, directives)| *directives)
        .expect("pub.appConfig 지시자");
    assert_eq!(
        response.header("cache-control"),
        Some(serialize_public_cache_control(directives))
    );

    let config: tooday_shared::AppConfigResponse = response.data();
    assert!(!config.version.is_empty());
}

#[tokio::test]
async fn 캐시_pub_외_경로가_섞인_배치_요청은_캐시되지_않는다() {
    let app = setup();
    let signed_up = signup(&app).await;

    let response = app
        .request(
            &format!("{}?batch=1", trpc_path("pub.appConfig,user.me")),
            RequestInit::get().auth(&signed_up.token),
        )
        .await;
    assert_eq!(response.status, StatusCode::OK);
    assert_eq!(response.header("cache-control").as_deref(), Some(PRIVATE_CACHE_CONTROL));
}

#[tokio::test]
async fn 캐시_존재하지_않는_프로시저_에러_응답은_캐시되지_않는다() {
    let app = setup();
    let response = app.get(&trpc_path("pub.doesNotExist")).await;
    assert_eq!(response.status, StatusCode::NOT_FOUND);
    assert_eq!(response.header("cache-control").as_deref(), Some(PRIVATE_CACHE_CONTROL));
}

// --- task — 메인(오늘) 화면 데이터 --------------------------------------------

fn range_input() -> Value {
    json!({ "from": "2026-07-02", "to": "2026-07-08" })
}

fn task_input() -> Value {
    json!({
        "title": "디자인 토큰 정리",
        "projectId": null,
        "date": "2026-07-04",
        "startAt": "10:00",
        "durationMin": 90
    })
}

fn task_input_with(overrides: &[(&str, Value)]) -> Value {
    let mut input = task_input();
    for (key, value) in overrides {
        input[*key] = value.clone();
    }
    input
}

async fn fetch_range(app: &TestApp, token: &str) -> (TestResponse, TaskRangeResponse) {
    let response = app
        .request(&query_path("task.range", &range_input()), RequestInit::get().auth(token))
        .await;
    let data = response.data();
    (response, data)
}

async fn create_project(app: &TestApp, token: &str) -> Project {
    let response = app
        .request(
            &trpc_path("task.createProject"),
            RequestInit::post_json(Some(json!({ "name": "TooDay 앱", "color": "blue" })))
                .auth(token),
        )
        .await;
    response.data::<ProjectResponse>().project
}

async fn create_task(app: &TestApp, token: &str, input: Value) -> TestResponse {
    app.request(&trpc_path("task.create"), RequestInit::post_json(Some(input)).auth(token)).await
}

async fn update_task(app: &TestApp, token: &str, input: Value) -> TestResponse {
    app.request(&trpc_path("task.update"), RequestInit::post_json(Some(input)).auth(token)).await
}

#[tokio::test]
async fn task_인증_없이는_401을_반환한다() {
    let app = setup();
    let response = app.get(&query_path("task.range", &range_input())).await;
    assert_eq!(response.status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn task_새_유저의_범위_조회는_빈_목록이다() {
    let app = setup();
    let signed_up = signup(&app).await;

    let (response, data) = fetch_range(&app, &signed_up.token).await;
    assert_eq!(response.status, StatusCode::OK);
    assert_eq!(data, TaskRangeResponse { tasks: vec![], projects: vec![], cursor: 0 });
    assert_eq!(response.header("cache-control").as_deref(), Some(PRIVATE_CACHE_CONTROL));
}

#[tokio::test]
async fn task_범위_조회는_범위_밖을_제외하고_날짜_시작시각_순으로_내려온다() {
    let app = setup();
    let signed_up = signup(&app).await;
    let token = &signed_up.token;
    let project = create_project(&app, token).await;

    for overrides in [
        vec![
            ("title", json!("오후 작업")),
            ("projectId", json!(project.id)),
            ("startAt", json!("13:30")),
        ],
        vec![
            ("title", json!("아침 작업")),
            ("projectId", json!(project.id)),
            ("startAt", json!("07:30")),
        ],
        vec![("title", json!("전날 작업")), ("date", json!("2026-07-03"))],
        vec![("title", json!("범위 밖 작업")), ("date", json!("2026-07-20"))],
    ] {
        create_task(&app, token, task_input_with(&overrides)).await;
    }

    let (_, data) = fetch_range(&app, token).await;
    assert_eq!(data.projects, vec![project]);
    assert_eq!(
        data.tasks.iter().map(|task| task.title.as_str()).collect::<Vec<_>>(),
        vec!["전날 작업", "아침 작업", "오후 작업"]
    );
    assert!(data.tasks.iter().all(|task| task.status == TaskStatus::Todo));
}

#[tokio::test]
async fn task_update가_patch의_필드만_적용한다() {
    let app = setup();
    let signed_up = signup(&app).await;
    let token = &signed_up.token;

    let created = create_task(&app, token, task_input()).await;
    let task = created.data::<TaskResponse>().task;
    assert_eq!(task.version, 1);

    // 기기 A: 상태만 / 기기 B: 제목만 — 서로 덮지 않고 둘 다 반영된다
    let after_status = update_task(&app, token, json!({ "id": task.id, "patch": { "status": "done" } }))
        .await
        .data::<TaskResponse>()
        .task;
    assert_eq!(after_status, Task { status: TaskStatus::Done, version: 2, ..task.clone() });

    let after_title =
        update_task(&app, token, json!({ "id": task.id, "patch": { "title": "디자인 토큰 정리 v2" } }))
            .await
            .data::<TaskResponse>()
            .task;
    assert_eq!(
        after_title,
        Task {
            status: TaskStatus::Done,
            title: "디자인 토큰 정리 v2".into(),
            version: 3,
            ..task.clone()
        }
    );

    let (_, data) = fetch_range(&app, token).await;
    assert_eq!(data.tasks, vec![after_title]);
}

#[tokio::test]
async fn task_같은_필드의_경합은_나중_의도가_이긴다() {
    let app = setup();
    let signed_up = signup(&app).await;
    let token = &signed_up.token;
    let task = create_task(&app, token, task_input()).await.data::<TaskResponse>().task;

    let first = update_task(&app, token, json!({ "id": task.id, "patch": { "status": "done" } })).await;
    assert_eq!(first.status, StatusCode::OK);
    let second = update_task(&app, token, json!({ "id": task.id, "patch": { "status": "todo" } })).await;
    assert_eq!(second.status, StatusCode::OK);

    let (_, data) = fetch_range(&app, token).await;
    assert_eq!(data.tasks.first().map(|task| task.status), Some(TaskStatus::Todo));
}

#[tokio::test]
async fn task_빈_patch는_400을_반환한다() {
    let app = setup();
    let signed_up = signup(&app).await;
    let token = &signed_up.token;
    let task = create_task(&app, token, task_input()).await.data::<TaskResponse>().task;

    let response = update_task(&app, token, json!({ "id": task.id, "patch": {} })).await;
    assert_eq!(response.status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn task_다른_유저의_데이터는_보이지_않고_수정은_404다() {
    let app = setup();
    let signed_up = signup(&app).await;
    let task = create_task(&app, &signed_up.token, task_input()).await.data::<TaskResponse>().task;

    let other = signup_other(&app).await;
    let (_, data) = fetch_range(&app, &other.token).await;
    assert_eq!(data, TaskRangeResponse { tasks: vec![], projects: vec![], cursor: 0 });

    let response =
        update_task(&app, &other.token, json!({ "id": task.id, "patch": { "status": "done" } })).await;
    assert_eq!(response.status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn task_다른_유저의_프로젝트로는_태스크를_만들_수_없다() {
    let app = setup();
    let signed_up = signup(&app).await;
    let project = create_project(&app, &signed_up.token).await;

    let other = signup_other(&app).await;
    let response =
        create_task(&app, &other.token, task_input_with(&[("projectId", json!(project.id))])).await;
    assert_eq!(response.status, StatusCode::NOT_FOUND);
}

// --- 델타 동기화 --------------------------------------------------------------

async fn fetch_changes(app: &TestApp, token: &str, cursor: i64) -> SyncChangesResponse {
    app.request(
        &query_path("task.changes", &json!({ "cursor": cursor })),
        RequestInit::get().auth(token),
    )
    .await
    .data()
}

#[tokio::test]
async fn sync_쓰기마다_커서가_전진하고_커서_이후의_변경만_내려온다() {
    let app = setup();
    let signed_up = signup(&app).await;
    let token = &signed_up.token;

    let project = create_project(&app, token).await; // seq 1
    let task = create_task(&app, token, task_input_with(&[("projectId", json!(project.id))]))
        .await
        .data::<TaskResponse>()
        .task; // seq 2

    let (_, range) = fetch_range(&app, token).await;
    assert_eq!(range.cursor, 2);

    // 커서 시점 이후 변경이 없으면 빈 델타
    let empty = fetch_changes(&app, token, range.cursor).await;
    assert_eq!(
        empty,
        SyncChangesResponse { tasks: vec![], projects: vec![], cursor: range.cursor }
    );

    // 다른 기기의 수정 → 그 변경 하나만 내려온다
    update_task(&app, token, json!({ "id": task.id, "patch": { "status": "done" } })).await; // seq 3
    let delta = fetch_changes(&app, token, range.cursor).await;
    assert_eq!(delta.cursor, 3);
    assert_eq!(delta.projects, vec![]);
    assert_eq!(
        delta.tasks,
        vec![TaskChange {
            task: Task { status: TaskStatus::Done, version: 2, ..task },
            sync_seq: 3,
            deleted: false,
        }]
    );

    // 처음(커서 0)부터 당기면 전부 내려온다 — 새 기기 시나리오
    let full = fetch_changes(&app, token, 0).await;
    assert_eq!(full.tasks.len(), 1);
    assert_eq!(
        full.projects,
        vec![tooday_shared::ProjectChange { project, sync_seq: 1, deleted: false }]
    );
}

#[tokio::test]
async fn sync_유저별로_격리된다() {
    let app = setup();
    let signed_up = signup(&app).await;
    create_task(&app, &signed_up.token, task_input()).await;

    let other = signup_other(&app).await;
    let delta = fetch_changes(&app, &other.token, 0).await;
    assert_eq!(delta, SyncChangesResponse { tasks: vec![], projects: vec![], cursor: 0 });
}

#[tokio::test]
async fn sse_인증_필수이고_쓰기가_일어나면_구독자에게_신호가_간다() {
    use std::sync::atomic::{AtomicUsize, Ordering};

    let app = setup();
    let unauthorized = app.get(SYNC_EVENTS_PATH).await;
    assert_eq!(unauthorized.status, StatusCode::UNAUTHORIZED);

    let signed_up = signup(&app).await;
    let response = app.request(SYNC_EVENTS_PATH, RequestInit::get().auth(&signed_up.token)).await;
    assert_eq!(response.status, StatusCode::OK);
    assert!(response.header("content-type").unwrap_or_default().contains("text/event-stream"));

    let signals = Arc::new(AtomicUsize::new(0));
    let subscription = Arc::clone(&app.sync).subscribe(&signed_up.user.id, {
        let signals = Arc::clone(&signals);
        Arc::new(move || {
            signals.fetch_add(1, Ordering::SeqCst);
        })
    });
    create_task(&app, &signed_up.token, task_input()).await;
    assert_eq!(signals.load(Ordering::SeqCst), 1);
    drop(subscription);
}

// --- auth.refresh -------------------------------------------------------------

#[tokio::test]
async fn refresh_쿠키를_회전하고_옛_리프레시는_무효화된다() {
    let app = setup();
    let signed_up = signup(&app).await;

    async fn refresh_with(app: &TestApp, token: &str) -> TestResponse {
        app.request(
            &trpc_path("auth.refresh"),
            RequestInit::post_json(Some(json!({})))
                .header("Cookie", refresh_cookie_header(&app.config, token)),
        )
        .await
    }

    let response = refresh_with(&app, &signed_up.refresh_token).await;
    assert_eq!(response.status, StatusCode::OK);
    let tokens: TokenPair = response.data();
    assert_ne!(tokens.refresh_token, signed_up.refresh_token, "리프레시는 회전됨");
    // (액세스 JWT는 같은 초에 서명되면 byte-identical일 수 있으므로 값 비교하지 않는다)

    // 새 액세스로 인증된다
    let me = app.request(&trpc_path("user.me"), RequestInit::get().auth(&tokens.access_token)).await;
    assert_eq!(me.status, StatusCode::OK);

    // 옛 리프레시 재사용 = 탈취 신호 → 401 + 세션 전체 무효화(재사용 탐지)
    let reused = refresh_with(&app, &signed_up.refresh_token).await;
    assert_eq!(reused.status, StatusCode::UNAUTHORIZED);

    // 재사용 탐지로 방금 회전된 새 리프레시까지 함께 죽는다
    let after_reuse = refresh_with(&app, &tokens.refresh_token).await;
    assert_eq!(after_reuse.status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn refresh_토큰이_없으면_401을_반환한다() {
    let app = setup();
    let response =
        app.request(&trpc_path("auth.refresh"), RequestInit::post_json(Some(json!({})))).await;
    assert_eq!(response.status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn refresh_body의_토큰도_받는다() {
    let app = setup();
    let signed_up = signup(&app).await;

    let response = app
        .request(
            &trpc_path("auth.refresh"),
            RequestInit::post_json(Some(json!({ "refreshToken": signed_up.refresh_token }))),
        )
        .await;
    assert_eq!(response.status, StatusCode::OK);
}

// --- auth.logout --------------------------------------------------------------

#[tokio::test]
async fn logout_리프레시를_폐기하고_쿠키를_삭제한다() {
    let app = setup();
    let signed_up = signup(&app).await;

    let cookies = format!(
        "{}; {}",
        access_cookie_header(&app.config, &signed_up.token),
        refresh_cookie_header(&app.config, &signed_up.refresh_token)
    );
    let logout = app
        .request(&trpc_path("auth.logout"), RequestInit::post_json(None).header("Cookie", cookies))
        .await;
    assert_eq!(logout.status, StatusCode::OK);
    for removal in serialize_auth_cookie_removals(&app.config) {
        assert!(logout.set_cookies().contains(&removal), "{removal}");
    }

    // 세션이 폐기되어 재발급(회전) 경로가 막힌다.
    let refresh = app
        .request(
            &trpc_path("auth.refresh"),
            RequestInit::post_json(Some(json!({})))
                .header("Cookie", refresh_cookie_header(&app.config, &signed_up.refresh_token)),
        )
        .await;
    assert_eq!(refresh.status, StatusCode::UNAUTHORIZED);

    // 즉시 무효화: 아직 만료 안 된 액세스 토큰도 세션 라이브니스 체크에서 곧바로 거부된다.
    let me = app.request(&trpc_path("user.me"), RequestInit::get().auth(&signed_up.token)).await;
    assert_eq!(me.status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn logout_재사용_탐지가_세션을_죽이면_그_세션의_액세스도_즉시_무효화된다() {
    let app = setup();
    let signed_up = signup(&app).await;

    // 1) 정상 회전 → 새 액세스/리프레시
    let rotate = app
        .request(
            &trpc_path("auth.refresh"),
            RequestInit::post_json(Some(json!({})))
                .header("Cookie", refresh_cookie_header(&app.config, &signed_up.refresh_token)),
        )
        .await;
    let tokens: TokenPair = rotate.data();
    let me_ok =
        app.request(&trpc_path("user.me"), RequestInit::get().auth(&tokens.access_token)).await;
    assert_eq!(me_ok.status, StatusCode::OK);

    // 2) 옛 리프레시 재사용 = 탈취 신호 → 세션 전체 무효화
    app.request(
        &trpc_path("auth.refresh"),
        RequestInit::post_json(Some(json!({})))
            .header("Cookie", refresh_cookie_header(&app.config, &signed_up.refresh_token)),
    )
    .await;

    // 3) 방금까지 멀쩡하던 액세스도 세션 라이브니스 체크로 즉시 401
    let me = app.request(&trpc_path("user.me"), RequestInit::get().auth(&tokens.access_token)).await;
    assert_eq!(me.status, StatusCode::UNAUTHORIZED);
}
