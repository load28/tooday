import { TRPCClientError } from '@trpc/client';

/** TanStack Form 필드 에러(스키마 issue 객체 또는 서버 매핑 문자열)에서 표시할 첫 메시지를 꺼낸다 */
export function firstErrorMessage(errors: ReadonlyArray<unknown>): string | undefined {
  const first = errors[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'message' in first) return String(first.message);
  return undefined;
}

/** tRPC 에러의 전송 코드(CONFLICT, UNAUTHORIZED 등)를 꺼낸다. 사용자향 문구는 화면이 코드 기반으로 소유한다. */
export function trpcErrorCode(error: unknown): string | undefined {
  return error instanceof TRPCClientError ? error.data?.code : undefined;
}
