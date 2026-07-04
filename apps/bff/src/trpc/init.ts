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
  [DOMAIN_ERROR_CODES.TASK_VERSION_CONFLICT]: 'CONFLICT',
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
  if (!ctx.user || !ctx.sessionToken) {
    throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
  }
  return next({ ctx: { user: ctx.user, sessionToken: ctx.sessionToken } });
});
