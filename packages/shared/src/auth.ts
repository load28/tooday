import { z } from 'zod';
import { userSchema } from './user';

export const MIN_PASSWORD_LENGTH = 8;

// 스키마는 검증 규칙(계약)만 정의한다. 사용자향 문구는 프레젠테이션 계층이
// issue code/path 기반으로 매핑한다 — docs/research/2026-07-04-validation-message-separation.md
export const signupRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  name: z.string().trim().min(1),
});

export const loginRequestSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

/** token은 Set-Cookie(웹)와 body(헤더 방식 클라이언트) 양쪽으로 전달된다 */
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string(),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
