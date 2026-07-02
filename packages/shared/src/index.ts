export interface User {
  id: string;
  email: string;
  name: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** token은 Set-Cookie(웹)와 body(헤더 방식 클라이언트) 양쪽으로 전달된다 */
export interface AuthResponse {
  user: User;
  token: string;
}

export interface MeResponse {
  user: User;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
