import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const valueCls = style({ display: 'inline-flex', alignItems: 'center', gap: vars.space.sm, minWidth: 0 });
export const checkCls = style({ color: vars.color.primary, flex: '0 0 auto' });
export const durationRowCls = style({ display: 'flex', flexWrap: 'wrap', gap: vars.space.sm });
