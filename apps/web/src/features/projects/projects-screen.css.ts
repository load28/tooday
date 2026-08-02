import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const heroCls = style({ paddingInline: vars.space.pageX, paddingTop: vars.space.md, paddingBottom: vars.space.lg });

export const listCls = style({ paddingInline: vars.space.pageX, paddingBottom: vars.space['4xl'] });

export const cardCls = style({ display: 'flex', flexDirection: 'column', gap: vars.space.md, width: '100%', textAlign: 'left' });

export const emptyCls = style({ paddingBlock: vars.space.emptyStateY, paddingInline: vars.space['4xl'] });
