import { protectedProcedure, router } from '@bff/trpc/init';
import type { MeResponse } from '@tooday/shared';

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }): MeResponse => ({ user: ctx.user })),
});
