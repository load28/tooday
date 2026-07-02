import { publicProcedure, router } from '../init';

/**
 * HTTP 캐시(공유 캐시 포함) 대상 라우터.
 * 규칙: 유저/세션에 따라 달라지는 데이터를 절대 반환하지 않는다 (ctx.user 참조 금지).
 * 캐시 TTL은 trpc/cache.ts의 정책이 경로 기준으로 부여한다.
 */
export const pubRouter = router({
  appConfig: publicProcedure.query(() => ({
    version: '0.0.0',
    minSupportedAppVersion: '0.0.0',
    features: {
      projects: true,
      timeline: true,
    },
  })),
});
