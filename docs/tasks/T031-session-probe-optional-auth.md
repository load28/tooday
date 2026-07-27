# T031 — 세션 프로브(user.me)를 optional-auth로 — 익명은 200+null, 무효는 401

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-27
- 완료: 2026-07-27

## 배경

회원가입/로그인 페이지(`_public`) 진입 시 게이트가 `user.me`를 호출하는데, 비로그인
방문자에게 **401**이 돌아온다. 그 결과 짧은 시간에 `user.me`+`auth.refresh`가 3쌍(총 6요청)
찍힌다. 원인은 두 가지가 겹친 것:

1. **401은 에러라 캐시에 데이터로 남지 않는다.** `fetchSessionUser`의 `ensureQueryData`는
   성공 데이터만 `SESSION_STALE_MS`(15분) 캐시하는데(`apps/web/src/app/trpc.ts:136-151`),
   401은 매 beforeLoad 실행(SSR → 하이드레이션 → intent preload/네비게이션,
   `defaultPreloadStaleTime: 0` `apps/web/src/router.tsx:25`)마다 다시 나간다.
2. **에러는 SSR dehydrate에서도 제외된다.** TanStack Query 기본 `shouldDehydrateQuery`는
   성공 쿼리만 직렬화하므로, SSR에서 맞은 401은 클라이언트로 전달되지 않고 하이드레이션이
   처음부터 다시 요청한다.
3. 401이라 `fetchWithRefresh`(`apps/web/src/app/trpc.ts:68-85`)가 설계대로 `auth.refresh`를
   1회 시도 → 리프레시 쿠키도 없으니 또 401. 즉 `user.me` 1회당 `auth.refresh` 1회가 딸려온다.

### 근거 조사 (기술 문서 스킬)

- **RFC 9110 §15.5.2 (401 Unauthorized)**: "요청에 유효한 인증 자격증명이 **없어서**
  적용되지 않았다"이며 클라이언트가 "새 자격증명으로 **재시도**하라"는 챌린지다(서버는
  `WWW-Authenticate`를 MUST로 보내야 함). → 보호된 데이터 프로시저(task.* 등)의 401은
  정확히 이 의미(refresh 후 재시도)라 그대로 둔다.
- **§15.3.1 (200 OK)**: "요청이 성공했고 콘텐츠는 대상 리소스의 표현." 세션 프로브에
  "익명"은 정상 답변이므로 200 + `{ user: null }`이 맞다.
- **NextAuth `GET /api/auth/session`**은 비로그인 시 에러가 아니라 빈 객체를 반환한다.
- **일반 원칙**: 인증이 선택적인 엔드포인트는 401이 아니라 200 + null/공백 데이터.

### 핵심 — "무조건 200+null"의 함정

`fetchSessionUser`는 `_public`뿐 아니라 `_app`(보호 라우트, `apps/web/src/routes/_app/route.tsx`)
게이트도 쓴다. 무조건 200+null로 바꾸면 **액세스만 만료되고 리프레시(14/90일)는 살아있는
사용자**가 보호 페이지 진입 시 401 대신 200 `{user:null}`을 받아 refresh 계기가 사라지고,
게이트가 살아있는 세션을 `/login`으로 쫓아낸다(회귀). 그래서 자격증명 **부재**와 **무효**를
구분해야 한다.

- 액세스 쿠키는 JWT와 같은 TTL로 만료돼 브라우저가 함께 폐기한다(`cookies.ts:29-31`).
  따라서 "만료된 액세스 + 살아있는 리프레시" 웹 사용자는 액세스 쿠키 없이 **리프레시 쿠키만**
  실어 보낸다.
- 네이티브/웹뷰는 쿠키 대신 `Authorization: Bearer`로 액세스를 싣는다. 만료돼도 헤더 자체는
  실려 온다(네이티브는 만료를 401 받고서야 안다).

→ 두 경우를 아우르는 신호: **요청에 자격증명이 실렸는가**
  = 액세스 토큰(헤더/쿠키) 존재 **또는** 리프레시 쿠키 존재.

## 작업 내용

`user.me`를 protected에서 optional-auth로 바꿔 3분기한다:

| 상태 | 조건 | 응답 |
| --- | --- | --- |
| 인증됨 | `ctx.userId` 있음 | `200 { user }` |
| 무효(만료·폐기) | `userId` 없음 + 자격증명 실림 | `401` (refresh 챌린지 — 기존 복구 경로 유지) |
| 익명 | `userId` 없음 + 자격증명 없음 | `200 { user: null }` |

웹/모바일 공통 — BFF 한 곳에서 갈리므로 두 클라이언트가 함께 커버된다.

**기각한 대안**: `user.me`를 그대로 두고 별도 `auth.session` 프로브 엔드포인트 신설 →
엔드포인트·쿼리키가 하나 늘고, 게이트는 이미 결과를 nullable로 다루므로 이득 없음. 단일
엔드포인트 수정이 코드베이스 미니멀리즘에 맞다.

### 변경 지점

1. `packages/shared/src/user.ts` — `meResponseSchema.user`를 `v.nullable(userSchema)`로.
2. `apps/bff/src/trpc/context.ts` — 컨텍스트에 `hasCredential: boolean` 추가
   (액세스 토큰 또는 리프레시 쿠키 존재).
3. `apps/bff/src/modules/user/router.ts` — `protectedProcedure` → `publicProcedure`로
   바꾸고 위 3분기 구현.
4. `apps/bff/src/app.test.ts` — "인증 정보 없음 → 401" 테스트를 "→ 200 + user null"로
   교체하고, "리프레시 쿠키만 있으면 401" 케이스를 추가.
5. 웹은 코드 변경 불필요 — 계약(`User | null`)이 `fetchSessionUser`로 그대로 흐르고,
   200이면 `fetchWithRefresh`가 refresh를 안 쏜다.

SSE 가드(`requireAuth`)는 프로브가 아니라 보호 스트림이므로 401 유지(변경 없음).

## 완료 기준

- [x] 익명(자격증명 없음) `user.me` → `200 { user: null }`
- [x] 만료/폐기(자격증명 실림) `user.me` → `401` 유지
- [x] 리프레시 쿠키만 있고 액세스 없음 → `401` (웹 복구 경로)
- [x] `bun run typecheck` 통과 (4/4 패키지)
- [x] `bun test`(@tooday/bff) 통과 (96 pass, 0 fail)

## 대화 기록

> **Minyoung**: 지금 보니깐 회원가입페이지에 진입할때 user.me, auth.refresh 를 3번씩
> 요청해 401 응답인데, 그냥 깔끔하게 retry를 0으로 하는게 맞을까? (이전 세션)
>
> **Claude**: retry: 0은 답이 아니다 — 이미 `retry: false`이고 `auth.refresh`는 React
> Query 쿼리가 아니라 raw fetch라 retry 영향권 밖. 3번 반복은 "비로그인"을 401 에러로
> 모델링한 구조 때문. 표준(NextAuth 세션 엔드포인트)은 비로그인 시 401이 아니라 빈 객체를
> 반환한다. `user.me`를 200 + null 반환 optional-auth로 바꾸는 게 근본 해결. (이전 세션)

> **Minyoung**: 그럼 정말로 401로 응답을 주는게맞을까? 그리고 바꾸면 3번 요청하는게
> 개선이되?
>
> **Claude**: (RFC 9110 원문 + TanStack Query dehydrate 문서로 검증) ① "비로그인이면 무조건
> 401"은 프로브 용도에 안 맞다. 하지만 "무조건 200+null"도 안 된다 — 그대로 바꾸면
> `_app` 게이트에서 액세스만 만료된 세션을 로그인으로 쫓아내는 회귀가 생긴다. 올바른 규칙은
> 자격증명 **부재 → 200+null**, **존재하나 무효 → 401**. ② 개선된다 — 에러는 캐시·dehydrate
> 양쪽에서 제외되므로 200 성공이 되면 3×user.me + 3×refresh가 1×user.me + 0×refresh로 수렴.

> **Minyoung**: 그럼 너가 조사한대로 작업을 진행하자 결국 웹/모바일 둘다 로그인 자체가 안된
> 경우 빈 객체로 주고 로그인했다가 무효화 되었을때에는 401로 주는거지?
>
> **Claude**: 정확히 그 규칙. 네이티브는 Bearer로 같은 BFF 경로를 타므로 BFF에서 한 번
> 구분하면 웹/모바일 둘 다 커버된다. 태스크 T031로 착수.

## 작업 로그

- 2026-07-27: 태스크 생성. `meResponseSchema.user`를 nullable로, 컨텍스트에
  `hasCredential` 추가, `user.me`를 `publicProcedure` 3분기로 전환. app.test.ts에서
  "인증 없음 → 401"을 "→ 200+null"로 교체하고 "리프레시 쿠키만 → 401" 케이스 추가.
  검증: `bun run typecheck` 4/4 통과, `bun test`(@tooday/bff) 96 pass 0 fail,
  변경 파일 biome check 통과.
