import { recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

// alignItems 충돌을 피하려 direction은 flexDirection만, alignItems는 align variant만 맡는다.
export const tStack = recipe({
  base: rec({ display: 'flex', minWidth: 0 }),
  variants: {
    direction: {
      row: rec({ flexDirection: 'row' }),
      column: rec({ flexDirection: 'column' }),
    },
    gap: {
      '0': rec({ gap: '0' }),
      '2xs': rec({ gap: vars.space['2xs'] }),
      xs: rec({ gap: vars.space.xs }),
      sm: rec({ gap: vars.space.sm }),
      md: rec({ gap: vars.space.md }),
      lg: rec({ gap: vars.space.lg }),
      xl: rec({ gap: vars.space.xl }),
      '2xl': rec({ gap: vars.space['2xl'] }),
      '3xl': rec({ gap: vars.space['3xl'] }),
      '4xl': rec({ gap: vars.space['4xl'] }),
    },
    align: {
      start: rec({ alignItems: 'flex-start' }),
      center: rec({ alignItems: 'center' }),
      end: rec({ alignItems: 'flex-end' }),
      stretch: rec({ alignItems: 'stretch' }),
      baseline: rec({ alignItems: 'baseline' }),
    },
    justify: {
      start: rec({ justifyContent: 'flex-start' }),
      center: rec({ justifyContent: 'center' }),
      end: rec({ justifyContent: 'flex-end' }),
      between: rec({ justifyContent: 'space-between' }),
      around: rec({ justifyContent: 'space-around' }),
      evenly: rec({ justifyContent: 'space-evenly' }),
    },
    wrap: {
      true: rec({ flexWrap: 'wrap' }),
      false: rec({ flexWrap: 'nowrap' }),
    },
    inline: {
      true: rec({ display: 'inline-flex' }),
      false: rec({ display: 'flex' }),
    },
  },
});

export const tSpacer = recipe({
  base: rec({ flexShrink: 0, alignSelf: 'stretch' }),
  variants: {
    // auto=남는 공간 채움, 나머지는 스페이싱 스케일 고정 크기(sizes 토큰 = 스페이싱 스케일 포함)
    size: {
      auto: rec({ flexGrow: 1, flexBasis: 0 }),
      '2xs': rec({ flexGrow: 0, flexBasis: vars.size['2xs'] }),
      xs: rec({ flexGrow: 0, flexBasis: vars.size.xs }),
      sm: rec({ flexGrow: 0, flexBasis: vars.size.sm }),
      md: rec({ flexGrow: 0, flexBasis: vars.size.md }),
      lg: rec({ flexGrow: 0, flexBasis: vars.size.lg }),
      xl: rec({ flexGrow: 0, flexBasis: vars.size.xl }),
      '2xl': rec({ flexGrow: 0, flexBasis: vars.size['2xl'] }),
      '3xl': rec({ flexGrow: 0, flexBasis: vars.size['3xl'] }),
      '4xl': rec({ flexGrow: 0, flexBasis: vars.size['4xl'] }),
    },
  },
  defaultVariants: { size: 'auto' },
});
