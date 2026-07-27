import * as v from 'valibot';

export const userSchema = v.object({
  id: v.string(),
  email: v.string(),
  name: v.string(),
});

// 세션 프로브 — 익명 방문자는 user: null(200). 자격증명이 실렸는데 무효면 BFF가 401을 던진다.
export const meResponseSchema = v.object({
  user: v.nullable(userSchema),
});

export type User = v.InferOutput<typeof userSchema>;
export type MeResponse = v.InferOutput<typeof meResponseSchema>;
