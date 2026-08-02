import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const pageCls = style({ paddingBottom: vars.space['4xl'] });

// 패딩은 Card의 padding variant로 준다 — 여기서 padding을 덮으면 recipe 기본값(p_0)과 충돌한다
export const heroCls = style({
  marginTop: vars.space.xs,
  marginInline: vars.space.pageX,
  marginBottom: vars.space['2xl'],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xl,
});

export const timelineCls = style({
  paddingInline: vars.space['2xl'],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.lg,
});

export const rowCls = style({
  display: 'grid',
  gridTemplateColumns: `${vars.size.timeCol} 1fr`,
  gap: vars.space.xl,
  alignItems: 'stretch',
});

export const timeColCls = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: vars.space['2xs'],
  // 카드 패딩(cardPadMd)에서 numeric(18px)·subtitle(22px) lineHeight 차의 절반을 당겨 첫 줄을 광학 정렬한다
  paddingTop: `calc(${vars.space.cardPadMd} - 2px)`,
});

export const emptyCls = style({ paddingBlock: vars.space.emptyStateY, paddingInline: vars.space['4xl'] });
