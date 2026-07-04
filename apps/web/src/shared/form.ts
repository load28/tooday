import { TRPCClientError } from '@trpc/client';
import type * as z from 'zod';

/** BFF가 DomainError를 tRPC로 매핑해 내려주는 전송 코드 중 화면이 분기하는 것들 */
export const TRPC_ERROR_CODES = {
  conflict: 'CONFLICT',
  unauthorized: 'UNAUTHORIZED',
} as const;

export type TrpcErrorCode = (typeof TRPC_ERROR_CODES)[keyof typeof TRPC_ERROR_CODES];

export function hasTrpcErrorCode(error: unknown, code: TrpcErrorCode): boolean {
  return error instanceof TRPCClientError && error.data?.code === code;
}

type ZodIssueCode = z.core.$ZodIssue['code'];

/** 필드 하나의 문구: 단일 문자열(규칙이 하나일 때) 또는 issue code별 매핑 */
export type FieldMessage = string | Partial<Record<ZodIssueCode, string>>;

/** 스키마 추론 타입의 필드 이름을 키로 강제하는 화면 소유 문구 맵 — 키 오타는 컴파일 에러 */
export type FormMessages<TValues> = Partial<Record<Extract<keyof TValues, string>, FieldMessage>>;

/**
 * TanStack Form 필드 에러에서 표시할 문구를 고른다.
 * 서버 매핑 문자열(onSubmitAsync fields) > 화면 소유 문구 > issue의 기본 문구(ko locale) 순.
 */
export function fieldErrorMessage(errors: ReadonlyArray<unknown>, message?: FieldMessage): string | undefined {
  const first = errors[0];
  if (first == null) return undefined;
  if (typeof first === 'string') return first;
  if (typeof message === 'string') return message;
  if (typeof first === 'object') {
    const code = 'code' in first && typeof first.code === 'string' ? (first.code as ZodIssueCode) : undefined;
    const mapped = code ? message?.[code] : undefined;
    if (mapped) return mapped;
    if ('message' in first) return String(first.message);
  }
  return undefined;
}
