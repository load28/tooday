import { style } from '@vanilla-extract/css';
import { util } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const pageCls = style(
  util({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    paddingInline: vars.space.pageX,
    paddingTop: vars.space['2xl'],
    paddingBottom: vars.space['4xl'],
    gap: vars.space['2xl'],
  }),
);

// 파괴적 로그아웃은 하단(엄지 도달)에 둔다 — 계정 정보는 위, 버튼은 뷰포트 바닥으로 민다.
export const logoutSlotCls = style(util({ marginTop: 'auto' }));

export const sheetActionsCls = style(util({ paddingTop: vars.space.lg }));
