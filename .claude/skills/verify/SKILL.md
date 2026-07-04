---
name: verify
description: TooDay 웹+BFF를 실제로 띄워 변경사항을 E2E로 관찰하는 레시피. 웹 화면/BFF 라우터 변경을 커밋 전에 검증할 때 사용.
---

# TooDay 검증 레시피

## 서버 띄우기 (둘 다 백그라운드)

```bash
# BFF (port 3002) — DB는 임시 경로로 격리
cd apps/bff && BFF_DATABASE_PATH=/tmp/verify.sqlite bun run dev

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

## 가라앉기 쉬운 함정

- 테스트 계정 이메일은 `u${Date.now()}@example.com`처럼 실행마다 고유하게. sqlite 파일을 지워도
  실행 중인 BFF는 열린 inode를 계속 쓰므로 이전 데이터가 살아있다.
- 인증 플로우: 비로그인 → `/_public`(login/signup), 로그인 상태로 public 경로 접근 시 `/`(→/today) 리다이렉트.
- BFF 요청 로그가 background task output 파일에 남는다 — 4xx/5xx 확인에 유용.
