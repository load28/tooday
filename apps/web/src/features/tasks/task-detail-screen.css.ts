import { style } from '@vanilla-extract/css';
import { util } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const pageCls = style(
  util({
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space['2xl'],
    paddingInline: vars.space.pageX,
    paddingTop: vars.space.lg,
    paddingBottom: vars.space['4xl'],
  }),
);

// 상태 알약을 감싸는 탭 타깃 — 리셋·포커스 링은 BaseButton이, 색은 Chip이 tone으로 관리한다
export const statusButtonCls = style(util({ alignSelf: 'flex-start', borderRadius: vars.radii.pill }));
