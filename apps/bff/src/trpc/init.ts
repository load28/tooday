import { initTRPC, TRPCError } from '@trpc/server';
import type { TrpcContext } from './context';

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** 쿠키 또는 Bearer 헤더로 인증된 유저가 있어야 통과. 응답은 항상 private, no-store. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.sessionToken) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' });
  }
  return next({ ctx: { user: ctx.user, sessionToken: ctx.sessionToken } });
});
