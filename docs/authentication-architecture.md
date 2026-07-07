# 인증 아키텍처 설계

## 전체 아키텍처

```
[웹뷰 앱 (TanStack Start)]
        ↓ tRPC (React Query)
[BFF (Hono + tRPC)]
        ↓ HTTP (인증 헤더 주입)
[API 서버]
```

- 웹뷰 전용 앱 (SEO 불필요)
- TanStack Start는 클라이언트 중심 SSR 프레임워크로 사용
- BFF가 인증의 관문 역할을 담당
- Start의 서버 함수는 최소한으로 사용

## 역할 분리

### TanStack Start

- SSR: 첫 화면을 빠르게 띄우는 용도
- beforeLoad: 인증 여부 확인 → 미인증 시 redirect (이것만)
- 서버 함수: 보안 또는 꼭 필요한 상황 아니면 사용하지 않음

### BFF (Hono + tRPC)

- 로그인/로그아웃 처리 (Set-Cookie)
- 쿠키 파싱 → 세션 검증 → 인증 헤더 주입
- 모든 데이터 API 프록시
- 필요 시 데이터 어그리게이션 (여러 API 합성)

### API 서버

- 비즈니스 로직 및 데이터 처리
- BFF로부터 인증 헤더를 받아 유저 식별

## 토큰 모델 (액세스 / 리프레시)

세션을 단일 불투명 토큰이 아니라 **성질이 다른 두 토큰**으로 나눈다.

| | 액세스 토큰 | 리프레시 토큰 |
|--|-----------|-------------|
| 형태 | JWT (HS256, `hono/jwt`) | 불투명 랜덤 문자열 |
| 저장 | **저장 안 함**(무상태) | Redis/DB에 해시로 저장 |
| 내용 | `userId(sub)` + `sid` + `exp` | 없음(키일 뿐) |
| 검증 | 서명·만료(무상태) + 세션 라이브니스 1회 | 저장소 조회 |
| 수명 | 짧다 (기본 15분) | idle 14일(슬라이딩) / absolute 90일(하드캡) |
| 쓰임 | 매 요청 인증 | 액세스 만료 시 재발급 |

- **핫패스가 유저 조회를 안 탄다** — 매 요청은 액세스 JWT 서명·만료 검증(`AccessTokenService`)
  + 세션 라이브니스 체크 1회(아래)만 한다. 유저 프로필은 JWT에 담지 않고 `user.me`에서만
  지연 조회한다(프로필 변경이 토큰 만료까지 지연되지 않게).
- **두 토큰 모두 httpOnly 쿠키**(`tooday_access`, `tooday_refresh`)로 내려 SSR 인증이 쿠키
  포워딩으로 그대로 동작한다. 네이티브/웹뷰 브릿지는 쿠키를 못 쓰므로 body의 토큰을
  `Authorization: Bearer`로 싣는다.

### 만료 두 축 — 슬라이딩 idle + absolute 하드캡

"짧게 가져가되 활성 유저는 안 끊긴다"를 동시에 만족시키는 표준. 이 두 축은 **리프레시 토큰**에 붙는다(액세스는 그냥 짧게 만료).

- **idle(슬라이딩)**: 회전할 때마다 `now+idle`로 리셋. 활성 유저는 15분마다 회전하니 계속 살아있고, 방치하면 idle 안에 죽는다.
- **absolute(하드캡)**: 로그인 시 박히고 회전해도 안 늘어난다. 90일이 지나면 아무리 활발해도 재로그인.

### 회전(rotation) + 재사용 탐지 — OAuth 2.0 BCP

- 리프레시를 쓸 때마다 **새 토큰으로 교체**하고 옛 토큰은 `superseded` 마킹(만료까지 보존).
- 같은 세션(`session_id`)을 공유한다. **이미 회전된(superseded) 토큰이 다시 제시되면 탈취 신호**로 보고 세션 전체를 무효화한다 — 탈취범이 회전시킨 뒤 정당 사용자(또는 그 반대)가 옛 토큰을 쓰는 순간 세션 전체가 죽어 피해가 제한된다.

### 즉시 무효화 — 세션 라이브니스 체크 (session liveness)

무상태 JWT는 그 자체로는 만료 전 무효화가 불가하다. 그래서 액세스 JWT에 **`sid`(OIDC
세션 id 클레임)**를 심고, 매 요청 서명·만료 검증 뒤 **세션이 살아있는지 한 번 확인**한다
(`session-liveness.ts`의 `verifyLiveSession` — tRPC 컨텍스트와 SSE 미들웨어가 공유). 로그아웃·
재사용 탐지가 세션을 폐기하면 아직 만료 안 된 액세스도 **다음 요청에서 곧바로 거부**된다.

- **세션 = 리프레시 회전 계보.** 자기 리프레시 토큰으로 존재하며, 폐기되면 사라진다
  (`isSessionLive(sid)`). 조회처는 Redis `EXISTS`(인메모리, 1ms 미만) 또는 DB 인덱스 조회.
- **fail-closed**: 라이브니스 저장소가 응답하지 못하면 거부한다(가용성보다 보안 우선).
- 트레이드오프: 핫패스가 "조회 0"이 아니라 라이브니스 조회 1회를 탄다.

#### 규모별 선택 (왜 이 방식인가)

즉시 무효화 vs 매 요청 조회 비용은 규모로 갈린다:

- **초대형 서비스**: 매 요청 중앙 조회의 지연·의존성이 부담이라, 라이브니스 체크를 생략하고
  **짧은 액세스 TTL로 무효화 창을 좁히는**(즉시성 포기) 쪽을 택하기도 한다.
- **중소 규모**: 라이브니스 체크(Redis 1회)로 **정확성(즉시 무효화)과 성능**을 함께 챙긴다.
  TooDay는 이쪽 — Redis 인메모리 조회라 비용이 작다.

## 로그인 플로우

```
1. 사용자 → 로그인 폼 (클라이언트 컴포넌트)
2. → tRPC mutation (auth.login) 호출
3. → BFF가 자격 증명 검증
4. → 리프레시 토큰 발급(Redis/DB 저장) + 액세스 JWT 서명
5. → Set-Cookie로 액세스·리프레시를 httpOnly 쿠키에 설정 + body에 토큰 쌍(브릿지용)
6. → 클라이언트에 성공 응답
```

### 재발급 플로우 (액세스 만료 시)

```
1. 요청이 401 (액세스 JWT 만료)
2. → 클라이언트가 auth.refresh 호출 (리프레시 쿠키)  ← 웹은 single-flight로 한 번만
3. → BFF가 리프레시 회전: 옛 토큰 supersede, 새 토큰 발급(idle 슬라이딩, absolute 캡)
4. → 새 액세스·리프레시 쿠키 Set-Cookie
5. → 클라이언트가 원요청 재시도
```

클라이언트 인터셉터(`apps/web/src/app/trpc.ts`)는 동시 401이 refresh를 한 번만 내보내도록
single-flight로 묶고, `auth.refresh/login/signup` 경로는 제외(재귀·오작동 방지)한다. SSR은
쿠키를 브라우저로 되돌릴 수 없어 refresh하지 않고 beforeLoad가 로그인 리다이렉트로 처리한다.

## 인증 상태 확인 (beforeLoad)

### 원칙

- beforeLoad는 "게이트키퍼" 역할만 수행
- `queryClient.ensureQueryData`를 사용하여 캐시 우선 활용
- 캐시에 데이터가 있으면 (stale이든 아니든) 그대로 반환, 없을 때만 fetch

### 동작

```
최초 방문:
  beforeLoad → ensureQueryData → 캐시 없음 → BFF 호출 → 캐시 저장 → 통과

클라이언트 네비게이션:
  beforeLoad → ensureQueryData → 캐시 있음 → 즉시 반환 → 통과
  (네트워크 안 탐, 네비게이션 블로킹 제로)
```

### context 사용 범위

- beforeLoad에서 유저 정보를 context에 넣되, **loader까지만** 사용
- 컴포넌트는 context를 사용하지 않음 — React Query(tRPC)로 직접 조회

```
beforeLoad: 인증 확인 → 유저 정보를 context에 넣음
loader: context.user를 받아서 필요 시 사용 (예: userId로 추가 쿼리)
component: context 안 씀. React Query(tRPC)로 직접 가져옴
```

## 데이터 페칭 전략

### 3계층 구조

| 계층 | 위치 | 기준 | 비고 |
|------|------|------|------|
| 1층 (SSR 동기) | loader에서 await | 이 데이터 없이 화면 레이아웃을 그릴 수 없음 | 네비게이션 블로킹 감수 |
| 2층 (SSR 비동기) | loader에서 promise 반환 | 화면은 그릴 수 있지만 빨리 보여주면 좋음 | Suspense로 품 |
| 3층 (클라이언트 전용) | 컴포넌트에서 React Query | 대부분의 데이터 | 서버 부하 제로 |

### 판단 기준

```
이 데이터 없이 화면 레이아웃을 그릴 수 있는가?
  → YES → 컴포넌트에서 React Query로 (로더 안 탐)
  → NO  → 이 데이터를 기다리는 동안 스켈레톤이라도 보여줄 수 있는가?
            → YES → loader에서 promise로 내려주고 Suspense
            → NO  → loader에서 await (네비게이션 블로킹 감수)
```

### 로더 성능 주의사항

- beforeLoad는 라우트 트리 상위부터 순차 실행
- 모든 beforeLoad 완료 후, 매칭된 라우트들의 loader가 병렬 실행
- 모든 loader 완료 후 컴포넌트 렌더
- **loader에 API 호출이 많으면 네비게이션이 블로킹되어 빈 화면이 길어짐**
- loader에는 화면 구성에 필수적인 최소한의 데이터만, 나머지는 컴포넌트에서 React Query로

## 데이터 흐름 (tRPC + React Query)

```
컴포넌트
  → trpc.user.me.useQuery()          (React Query 훅)
    → tRPC 클라이언트                  (직렬화 + 타입 안전성)
      → fetch (credentials: include)  (HTTP 레이어)
        → BFF (Hono + tRPC 서버)      (쿠키 파싱 + 헤더 주입)
          → API 서버
```

- tRPC는 fetching 레이어 (타입 안전한 fetch)
- React Query가 캐시와 상태 관리의 단일 출처 (single source of truth)
- @trpc/react-query가 둘을 통합

## 캐시 조작 전략

### ensureQueryData를 소비하는 쪽 (beforeLoad)

| API | 용도 | 사용 시점 |
|-----|------|-----------|
| `refetchQueries` | 명시적으로 캐시를 갱신 | 유저 정보 수정 후 |
| `removeQueries` | 캐시에서 완전 삭제 | 로그아웃 시 |

### useQuery / useSuspenseQuery를 소비하는 쪽 (컴포넌트)

| API | 용도 | 사용 시점 |
|-----|------|-----------|
| `invalidateQueries` | stale 마킹 → 활성 옵저버가 자동 리페치 | 목록 갱신 등 |

### 왜 이렇게 구분하는가

```
invalidateQueries → stale 마킹
  → useQuery가 바라보고 있으면 자동 리페치 (옵저버가 있으니까)
  → ensureQueryData는 stale이든 아니든 캐시 반환 (옵저버 개념이 없음)

refetchQueries → 즉시 fetch 실행
  → 옵저버 유무 상관없이 캐시가 갱신됨
  → ensureQueryData가 다음에 읽을 때 갱신된 값을 반환
```

- `invalidateQueries`는 "누군가 지켜보고 있을 때" 의미가 있음 (useQuery)
- `ensureQueryData`는 "한 번 읽고 끝"이므로 invalidate가 의미 없음

### 로그아웃 시

```
1. queryClient.removeQueries({ queryKey: ['user', 'me'] })  // 캐시 완전 삭제
2. redirect('/login')
3. 다음 인증 라우트 접근 시 → ensureQueryData → 캐시 없음 → BFF 호출 → 세션 없음 → redirect
```

### 유저 정보 수정 시

```
1. await queryClient.refetchQueries({ queryKey: ['user', 'me'] })  // 즉시 fetch
2. 캐시가 갱신된 상태
3. 다음 beforeLoad의 ensureQueryData가 갱신된 캐시를 반환
```

## tRPC 전송 / HTTP 캐시 정책

### 이중 인증 (쿠키 + 헤더)

- BFF는 **액세스 토큰**을 두 경로로 받는다: `Authorization: Bearer <jwt>` 헤더(우선), httpOnly 액세스 쿠키(폴백)
- 로그인/회원가입 응답은 Set-Cookie(웹용)와 body의 `accessToken`/`refreshToken`(네이티브/웹뷰 브릿지용)을 함께 내려준다
- tRPC 컨텍스트가 요청마다 액세스 JWT를 검증하고 세션 라이브니스(`sid`)를 확인해 `ctx.userId`를 채운다 — 유저 프로필 조회는 안 탄다

### 노배치가 기본

- tRPC의 HTTP 캐시 문제는 배칭에서 온다: 여러 쿼리가 한 URL로 합쳐져 캐시 키가 불안정해짐
- 클라이언트는 `httpBatchLink` 대신 `httpLink`를 기본으로 사용 → 쿼리가 GET + 단일 경로 URL로 나가 URL이 그대로 캐시 키가 된다
- 배칭이 꼭 필요한 곳이 생기면 `splitLink`로 명시적으로만 허용

### 캐시 정책 (서버가 경로 기준으로 강제)

| 네임스페이스 | 용도 | Cache-Control |
|--------------|------|---------------|
| `pub.*` | 유저와 무관한 공개 데이터 | `public, max-age, s-maxage, stale-while-revalidate` |
| `auth.*`, `user.*` 등 나머지 | 프라이빗 (유저 데이터, 인증) | `private, no-store` |

- 규칙: `pub.*` 프로시저는 `ctx.user`를 절대 참조하지 않는다 (공유 캐시 오염 방지)
- 뮤테이션, 에러 응답, `pub.*` 외 경로가 섞인 배치 요청은 전부 `no-store`
- 경로별 TTL 오버라이드는 `apps/bff/src/trpc/cache.ts`에서 관리

## 근거 출처

- TanStack Start 공식 문서 (authentication-overview.md, authentication.md, middleware.md, server-functions.md)
- React Query 공식 문서 (ensureQueryData, invalidateQueries, removeQueries 동작)
- tRPC + React Query 통합 (@trpc/react-query 공식 가이드)
