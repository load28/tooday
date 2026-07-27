import type { DomainErrorCode } from '@bff/platform/errors';
import { DOMAIN_ERROR_CODES, DomainError, findDomainError } from '@bff/platform/errors';
import type { TrpcContext } from '@bff/trpc/context';
import { initTRPC, TRPCError } from '@trpc/server';

const t = initTRPC.context<TrpcContext>().create();

const TRPC_CODE_BY_DOMAIN_CODE = {
  [DOMAIN_ERROR_CODES.EMAIL_TAKEN]: 'CONFLICT',
  [DOMAIN_ERROR_CODES.INVALID_CREDENTIALS]: 'UNAUTHORIZED',
  [DOMAIN_ERROR_CODES.UNAUTHENTICATED]: 'UNAUTHORIZED',
  [DOMAIN_ERROR_CODES.PROJECT_NOT_FOUND]: 'NOT_FOUND',
  [DOMAIN_ERROR_CODES.TASK_NOT_FOUND]: 'NOT_FOUND',
} as const satisfies Record<DomainErrorCode, TRPCError['code']>;

/** DomainError를 tRPC 에러(HTTP 상태)로 변환하는 유일한 지점 */
const domainErrorMapper = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok) {
    const domainError = findDomainError(result.error);
    if (domainError) {
      throw new TRPCError({
        code: TRPC_CODE_BY_DOMAIN_CODE[domainError.code],
        message: domainError.message,
        cause: domainError,
      });
    }
  }
  return result;
});

export const router = t.router;
export const publicProcedure = t.procedure.use(domainErrorMapper);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
  }
  return next({ ctx: { userId: ctx.userId } });
});

/**
 * 세션 프로브 — "너 누구냐"를 인증 강제 없이 묻는다. 무효 자격증명(만료·폐기)은
 * 401로 거르되, 자격증명이 아예 없으면(익명) userId=null로 통과시킨다. 그래서 리졸버의
 * `!ctx.userId`는 "무효"가 아니라 "익명"만 뜻한다. 응답이 요청자에 따라 달라지므로
 * pub.*(공유 캐시)로 두면 안 되고 private 네임스페이스에서만 쓴다.
 */
export const sessionProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId && ctx.hasCredential) {
    throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
  }
  return next();
});
