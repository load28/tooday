export type { AuthResponse, LoginRequest, MeResponse, SignupRequest, User } from './schemas';
export {
  authResponseSchema,
  loginRequestSchema,
  MIN_PASSWORD_LENGTH,
  meResponseSchema,
  signupRequestSchema,
  userSchema,
} from './schemas';

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
