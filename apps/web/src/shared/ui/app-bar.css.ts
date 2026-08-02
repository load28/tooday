import { recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { textStyles } from '@/styles/text-styles';
import { vars } from '@/styles/theme.css';

export const appBarRoot = recipe({
  base: rec({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBlock: vars.space.appBarPadY,
    paddingInline: vars.space.appBarPadX,
    gap: vars.space.appBarGap,
    minHeight: vars.size.appBar,
  }),
});

export const appBarLeading = recipe({
  base: rec({ display: 'flex', alignItems: 'center', gap: vars.space.xs, flex: '0 0 auto' }),
});

export const appBarTitle = recipe({
  base: rec({
    flex: 1,
    minWidth: 0,
    ...textStyles.subtitle,
    color: vars.color.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
});

export const appBarTrailing = recipe({
  base: rec({ display: 'flex', alignItems: 'center', gap: vars.space.xs, flex: '0 0 auto' }),
});
