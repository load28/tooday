import * as v from 'valibot';
import { userSchema } from './user';

export const MIN_PASSWORD_LENGTH = 8;

// 스키마는 검증 규칙(계약)만 정의한다. 사용자향 문구는 각 화면이 발생 가능한
// issue 타입(v.InferIssue)으로 매핑해 소유한다 — docs/research/2026-07-04-validation-message-separation.md
export const signupRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
  password: v.pipe(v.string(), v.minLength(MIN_PASSWORD_LENGTH)),
  name: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

export const loginRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.minLength(1)),
  password: v.pipe(v.string(), v.minLength(1)),
});

/** token은 Set-Cookie(웹)와 body(헤더 방식 클라이언트) 양쪽으로 전달된다 */
export const authResponseSchema = v.object({
  user: userSchema,
  token: v.string(),
});

export type SignupRequest = v.InferOutput<typeof signupRequestSchema>;
export type LoginRequest = v.InferOutput<typeof loginRequestSchema>;
export type AuthResponse = v.InferOutput<typeof authResponseSchema>;
