---
name: verify
description: TooDay 웹+BFF를 실제로 띄워 변경사항을 E2E로 관찰하는 레시피. 웹 화면/BFF 라우터 변경을 커밋 전에 검증할 때 사용.
---

# TooDay 검증 레시피

## 서버 띄우기 (둘 다 백그라운드)

```bash
# BFF (port 3002) — DB는 임시 PGlite 디렉토리로 격리 (DATABASE_URL을 주면 실 Postgres)
cd apps/bff && BFF_PGLITE_DIR=/tmp/verify-pg bun run dev

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

- 테스트 계정 이메일은 `u${Date.now()}@example.com`처럼 실행마다 고유하게. PGlite 데이터
  디렉토리를 지워도 실행 중인 BFF에는 이전 상태가 남아 있을 수 있다 — 초기화는 디렉토리 삭제 후 BFF 재시작.
- 인증 플로우: 비로그인 → `/_public`(login/signup), 로그인 상태로 public 경로 접근 시 `/`(→/today) 리다이렉트.
- BFF 요청 로그가 background task output 파일에 남는다 — 4xx/5xx 확인에 유용.
- 웹 dev 서버를 재시작할 때 이전 프로세스의 자식이 3000 포트를 물고 남을 수 있다.
  새 서버가 3001로 뜨면 E2E가 좀비(옛 코드) 서버를 치게 된다 — 재시작 후 반드시
  task output에서 `Local: http://localhost:3000` 인지 확인하고, 아니면 `fuser -k 3000/tcp`.
