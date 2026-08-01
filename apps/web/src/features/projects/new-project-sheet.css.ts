import { style } from '@vanilla-extract/css';
import { util } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const colorRowCls = style(util({ paddingBlock: vars.space['2xs'], paddingInline: vars.space['2xs'] }));
