import type { MeResponse } from '@tooday/shared';
import { protectedProcedure, router } from '../init';

/** 유저 데이터 라우터. 프라이빗 영역 → 항상 private, no-store. */
export const userRouter = router({
  me: protectedProcedure.query(({ ctx }): MeResponse => ({ user: ctx.user })),
});
