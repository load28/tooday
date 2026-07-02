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

## 세션 관리

- httpOnly 쿠키 기반
- 쿠키 파싱은 클라이언트에서 불가 (보안)
- BFF가 서버 사이드에서 쿠키를 파싱하여 API 서버 요청 시 인증 헤더에 주입
- tRPC 클라이언트는 `credentials: 'include'` 설정 필수

## 로그인 플로우

```
1. 사용자 → 로그인 폼 (클라이언트 컴포넌트)
2. → tRPC mutation (login) 호출
3. → BFF가 API 서버에 인증 요청
4. → API 서버가 인증 성공 시 세션 ID 반환
5. → BFF가 Set-Cookie로 세션 ID를 httpOnly 쿠키에 설정
6. → 클라이언트에 성공 응답
```

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

- BFF는 세션 토큰을 두 경로로 받는다: `Authorization: Bearer <token>` 헤더(우선), httpOnly 쿠키(폴백)
- 로그인/회원가입 응답은 Set-Cookie(웹용)와 body의 `token`(네이티브/웹뷰 브릿지용)을 함께 내려준다
- tRPC 컨텍스트가 요청마다 토큰을 파싱해 `ctx.user`를 채운다

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
