import { style } from '@vanilla-extract/css';
import { util } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const valueCls = style(util({ display: 'inline-flex', alignItems: 'center', gap: vars.space.sm, minWidth: 0 }));
export const checkCls = style(util({ color: vars.color.primary, flex: '0 0 auto' }));
export const durationRowCls = style(util({ display: 'flex', flexWrap: 'wrap', gap: vars.space.sm }));
