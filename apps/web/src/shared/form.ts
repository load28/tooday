import { TRPCClientError } from '@trpc/client';

/** BFF가 DomainError를 tRPC로 매핑해 내려주는 전송 코드 중 화면이 분기하는 것들 */
export const TRPC_ERROR_CODES = {
  conflict: 'CONFLICT',
  unauthorized: 'UNAUTHORIZED',
} as const;

export type TrpcErrorCode = (typeof TRPC_ERROR_CODES)[keyof typeof TRPC_ERROR_CODES];

/** 도메인 에러(서버 판정) 사용자 문구. zod locale은 입력 검증 문구만 다루므로 서버 에러 문구는 여기서 소유한다. */
export const SERVER_ERROR_MESSAGES = {
  emailTaken: '이미 가입된 이메일입니다.',
  invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
  fallback: '잠시 후 다시 시도해 주세요.',
} as const;

export function hasTrpcErrorCode(error: unknown, code: TrpcErrorCode): boolean {
  return error instanceof TRPCClientError && error.data?.code === code;
}

/** TanStack Form 필드 에러(스키마 issue 객체 또는 서버 매핑 문자열)에서 표시할 첫 메시지를 꺼낸다 */
export function firstErrorMessage(errors: ReadonlyArray<unknown>): string | undefined {
  const first = errors[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'message' in first) return String(first.message);
  return undefined;
}
