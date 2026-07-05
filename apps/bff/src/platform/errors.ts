export const DOMAIN_ERROR_CODES = {
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
} as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[keyof typeof DOMAIN_ERROR_CODES];

const DOMAIN_ERROR_MESSAGES: Record<DomainErrorCode, string> = {
  EMAIL_TAKEN: '이미 가입된 이메일입니다.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  UNAUTHENTICATED: '인증이 필요합니다.',
  PROJECT_NOT_FOUND: '프로젝트를 찾을 수 없습니다.',
  TASK_NOT_FOUND: '작업을 찾을 수 없습니다.',
};

/** 도메인 계층(스토어, 라우터)이 던지는 유일한 에러 타입. 전송 계층 매핑은 trpc/init.ts가 담당한다. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string = DOMAIN_ERROR_MESSAGES[code],
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function findDomainError(error: unknown): DomainError | null {
  if (error instanceof DomainError) return error;
  if (error instanceof Error && error.cause !== undefined) return findDomainError(error.cause);
  return null;
}
