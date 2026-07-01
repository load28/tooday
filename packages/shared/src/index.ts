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

/**
 * 로그인/회원가입 성공 응답.
 * 세션 토큰은 httpOnly 쿠키(Set-Cookie)로도 내려가고,
 * 헤더 방식 클라이언트(네이티브 등)를 위해 body의 token으로도 내려간다.
 */
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
