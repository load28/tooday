import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const surface = recipe({
  base: rec({ minWidth: 0, transition: `background-color ${vars.duration.fast} ${vars.easing.standard}` }),
  variants: {
    tone: {
      canvas: rec({ background: vars.color.bg }),
      canvasWarm: rec({ background: vars.color.bgWarm }),
      surface: rec({ background: vars.color.surface }),
      muted: rec({ background: vars.color.surfaceMuted }),
      soft: rec({ background: vars.color.surfaceSoft }),
      inverse: rec({ background: vars.color.surfaceInverse, color: vars.color.textInverse }),
      brandSoft: rec({ background: vars.color.primarySoft, color: vars.color.primary }),
      successSoft: rec({ background: vars.color.successSoft, color: vars.color.success }),
      warningSoft: rec({ background: vars.color.warningSoft, color: vars.color.warning }),
      dangerSoft: rec({ background: vars.color.dangerSoft, color: vars.color.danger }),
      transparent: rec({ background: 'transparent' }),
    },
    bordered: {
      none: rec({}),
      hairline: rec({ border: `1px solid ${vars.color.border}` }),
      strong: rec({ border: `1px solid ${vars.color.borderStrong}` }),
    },
    radius: {
      none: rec({ borderRadius: '0' }),
      sm: rec({ borderRadius: vars.radii.sm }),
      md: rec({ borderRadius: vars.radii.md }),
      lg: rec({ borderRadius: vars.radii.lg }),
      xl: rec({ borderRadius: vars.radii.xl }),
      '2xl': rec({ borderRadius: vars.radii['2xl'] }),
      '3xl': rec({ borderRadius: vars.radii['3xl'] }),
      pill: rec({ borderRadius: vars.radii.pill }),
    },
    elevation: {
      none: rec({ boxShadow: 'none' }),
      xs: rec({ boxShadow: vars.shadow.xs }),
      sm: rec({ boxShadow: vars.shadow.sm }),
      md: rec({ boxShadow: vars.shadow.md }),
      card: rec({ boxShadow: vars.shadow.card }),
      lg: rec({ boxShadow: vars.shadow.lg }),
    },
    padding: {
      none: rec({ padding: '0' }),
      sm: rec({ padding: vars.space.cardPadSm }),
      md: rec({ padding: vars.space.cardPadMd }),
      lg: rec({ padding: vars.space.cardPadLg }),
    },
    inset: {
      none: rec({ padding: '0' }),
      x: rec({ paddingInline: vars.space.pageX }),
      y: rec({ paddingBlock: vars.space.xl }),
    },
  },
  defaultVariants: { tone: 'surface', radius: 'none', elevation: 'none', bordered: 'none' },
});

export type SurfaceVariantProps = NonNullable<RecipeVariants<typeof surface>>;
