import { z } from 'zod';
import { userSchema } from './user';

export const MIN_PASSWORD_LENGTH = 8;

export const signupRequestSchema = z.object({
  email: z.email('올바른 이메일이 아닙니다.'),
  password: z.string().min(MIN_PASSWORD_LENGTH, `password는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`),
  name: z.string().trim().min(1, 'name이 필요합니다.'),
});

export const loginRequestSchema = z.object({
  email: z.string().trim().min(1, 'email이 필요합니다.'),
  password: z.string().min(1, 'password가 필요합니다.'),
});

/** token은 Set-Cookie(웹)와 body(헤더 방식 클라이언트) 양쪽으로 전달된다 */
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string(),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
