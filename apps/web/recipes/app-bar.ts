import { defineRecipe } from '@pandacss/dev';

export const appBarRoot = defineRecipe({
  className: 'appBarRoot',
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBlock: 'appBarPadY',
    paddingInline: 'appBarPadX',
    gap: 'appBarGap',
    minHeight: 'appBar',
  },
});

export const appBarLeading = defineRecipe({
  className: 'appBarLeading',
  base: { display: 'flex', alignItems: 'center', gap: 'xs', flex: '0 0 auto' },
});

export const appBarTitle = defineRecipe({
  className: 'appBarTitle',
  base: {
    flex: 1,
    minWidth: 0,
    textStyle: 'subtitle',
    color: 'text',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

export const appBarTrailing = defineRecipe({
  className: 'appBarTrailing',
  base: { display: 'flex', alignItems: 'center', gap: 'xs', flex: '0 0 auto' },
});
