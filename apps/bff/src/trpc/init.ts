import { initTRPC, TRPCError } from '@trpc/server';
import type { DomainErrorCode } from '../errors';
import { DomainError, findDomainError } from '../errors';
import type { TrpcContext } from './context';

const t = initTRPC.context<TrpcContext>().create();

const TRPC_CODE_BY_DOMAIN_CODE = {
  EMAIL_TAKEN: 'CONFLICT',
  INVALID_CREDENTIALS: 'UNAUTHORIZED',
  UNAUTHENTICATED: 'UNAUTHORIZED',
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
    throw new DomainError('UNAUTHENTICATED');
  }
  return next({ ctx: { user: ctx.user, sessionToken: ctx.sessionToken } });
});
