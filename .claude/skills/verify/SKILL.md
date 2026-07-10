---
name: verify
description: TooDay 웹+BFF+러스트 API를 실제로 띄워 변경사항을 E2E로 관찰하는 레시피. 웹 화면/BFF 라우터/API 변경을 커밋 전에 검증할 때 사용.
---

# TooDay 검증 레시피

## 서버 띄우기 (셋 다 백그라운드)

```bash
# PostgreSQL — apps/api 필수. docker가 되면 `bun run infra:up`.
# docker가 없는 샌드박스에서는 로컬 postgres 바이너리로 임시 인스턴스를 띄운다:
#   su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/verify-data -U tooday --auth=trust"
#   su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/verify-data -o '-p 5433' start"
#   su postgres -c "/usr/lib/postgresql/16/bin/createdb -p 5433 -h localhost -U tooday tooday"

# 러스트 API (port 3003) — DATABASE_URL 미설정 시 compose 기본값(localhost:5432)으로 붙는다
cd apps/api && cargo run   # 로컬 5433 postgres면 DATABASE_URL=postgres://tooday@localhost:5433/tooday

# BFF (port 3002) — API_URL 미설정 시 http://localhost:3003
cd apps/bff && bun run dev

# 웹 (port 3000)
cd apps/web && bun run dev
```

준비 확인: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` → 200.

## Playwright로 드라이브

- Chromium: `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`, 스크립트는 `bun <script>.mjs`로 실행.
- **주의: SSR + React 하이드레이션 때문에 `page.fill()`은 React 상태에 반영되지 않는다.**
  `locator.click()` 후 `pressSequentially(text, { delay: 15 })`로 실제 키 입력을 보내야 한다.
  페이지 로드 후 하이드레이션 대기(~2초)도 필요하다.
- 필드 비우기: click → `ControlOrMeta+a` → `Backspace`.
- 하이드레이션 mismatch 콘솔 에러(`style={{}}`)는 기존부터 있는 노이즈다.
- 기존 값에 `pressSequentially`로 덧붙일 때 커서가 맨 앞일 수 있다('short'+'123' → '123short').
  항상 clear 후 전체를 다시 입력하라.

## 가라앉기 쉬운 함정

- 테스트 계정 이메일은 `u${Date.now()}@example.com`처럼 실행마다 고유하게. 데이터 초기화는
  postgres의 tooday DB를 drop/recreate 후 API 재시작(부팅 시 sqlx 마이그레이션이 다시 적용된다).
- 인증 플로우: 비로그인 → `/_public`(login/signup), 로그인 상태로 public 경로 접근 시 `/`(→/today) 리다이렉트.
- BFF 요청 로그가 background task output 파일에 남는다 — 4xx/5xx 확인에 유용.
- 웹 dev 서버를 재시작할 때 이전 프로세스의 자식이 3000 포트를 물고 남을 수 있다.
  새 서버가 3001로 뜨면 E2E가 좀비(옛 코드) 서버를 치게 된다 — 재시작 후 반드시
  task output에서 `Local: http://localhost:3000` 인지 확인하고, 아니면 `fuser -k 3000/tcp`.
