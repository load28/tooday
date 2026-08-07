//! tRPC 밖의 라우트(SSE 등)용 인증 가드는 `app::sync_events`가 직접 조립한다 —
//! `session_liveness::verify_live_session`을 protectedProcedure와 공유하므로
//! 인증 로직이 두 벌로 갈라지지 않는다. TS에서 이 파일이 갖던 Hono 미들웨어 래퍼는
//! axum에서 핸들러 안의 추출로 자연스럽게 표현돼 따로 둘 층이 없다.
