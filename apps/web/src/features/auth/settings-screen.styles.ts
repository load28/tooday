import * as stylex from '@stylexjs/stylex';
import { space } from '@/styles/tokens.stylex';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    paddingInline: space.pageX,
    paddingTop: space['2xl'],
    paddingBottom: space['4xl'],
    gap: space['2xl'],
  },
  // 파괴적 로그아웃은 하단(엄지 도달)에 둔다 — 계정 정보는 위, 버튼은 뷰포트 바닥으로 민다.
  logoutSlot: { marginTop: 'auto' },
  sheetActions: { paddingTop: space.lg },
});
