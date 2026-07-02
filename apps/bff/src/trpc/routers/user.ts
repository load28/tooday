import type { MeResponse } from '@tooday/shared';
import { protectedProcedure, router } from '../init';

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }): MeResponse => ({ user: ctx.user })),
});
