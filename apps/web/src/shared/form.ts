import { TRPCClientError } from '@trpc/client';
import type * as v from 'valibot';

/** BFF가 DomainError를 tRPC로 매핑해 내려주는 전송 코드 중 화면이 분기하는 것들 */
export const TRPC_ERROR_CODES = {
  conflict: 'CONFLICT',
  unauthorized: 'UNAUTHORIZED',
} as const;

export type TrpcErrorCode = (typeof TRPC_ERROR_CODES)[keyof typeof TRPC_ERROR_CODES];

export function hasTrpcErrorCode(error: unknown, code: TrpcErrorCode): boolean {
  return error instanceof TRPCClientError && error.data?.code === code;
}

export type FieldMessage = string | Partial<Record<string, string>>;

/**
 * 화면 소유 검증 문구 맵. 필드 키와 각 필드의 issue 타입 키가 스키마에서 추론되므로
 * 오타나 그 필드에서 발생할 수 없는 issue 타입은 컴파일 에러가 된다.
 */
export type FormMessages<TSchema extends { entries: v.ObjectEntries }> = {
  [K in keyof TSchema['entries']]?: string | Partial<Record<v.InferIssue<TSchema['entries'][K]>['type'], string>>;
};

/**
 * TanStack Form 필드 에러에서 표시할 문구를 고른다.
 * 서버 매핑 문자열(onSubmitAsync fields) > 화면 소유 문구(단일/issue 타입별) > issue 기본 문구 순.
 */
export function fieldErrorMessage(errors: ReadonlyArray<unknown>, message?: FieldMessage): string | undefined {
  const first = errors[0];
  if (first == null) return undefined;
  if (typeof first === 'string') return first;
  if (typeof message === 'string') return message;
  if (typeof first === 'object') {
    const kind = 'type' in first && typeof first.type === 'string' ? first.type : undefined;
    const mapped = kind ? message?.[kind] : undefined;
    if (mapped) return mapped;
    if ('message' in first) return String(first.message);
  }
  return undefined;
}
