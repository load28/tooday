import { publicProcedure, router } from '@bff/trpc/init';
import type { AppConfigResponse } from '@tooday/shared';

/** 공유 캐시 대상 — 유저별로 달라지는 데이터 금지 (ctx.user 참조 금지) */
export const pubRouter = router({
  appConfig: publicProcedure.query(
    (): AppConfigResponse => ({
      version: '0.0.0',
      minSupportedAppVersion: '0.0.0',
      features: {
        projects: true,
        timeline: true,
      },
    }),
  ),
});
