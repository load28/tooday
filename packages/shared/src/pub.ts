import * as v from 'valibot';

/** 앱 부트스트랩 시 클라이언트가 읽는 공개 설정 — 유저별로 달라지지 않는다(공유 캐시 대상). */
export const appConfigResponseSchema = v.object({
  version: v.string(),
  minSupportedAppVersion: v.string(),
  features: v.object({
    projects: v.boolean(),
    timeline: v.boolean(),
  }),
});

export type AppConfigResponse = v.InferOutput<typeof appConfigResponseSchema>;
