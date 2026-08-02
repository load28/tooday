import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const progressTrack = recipe({
  base: rec({
    height: vars.size.xs,
    borderRadius: vars.radii.pill,
    background: vars.color.surfaceSoft,
    overflow: 'hidden',
  }),
});

export const progressFill = recipe({
  base: rec({
    height: '100%',
    borderRadius: vars.radii.pill,
    transition: `width ${vars.duration.slow} ${vars.easing.standard}`,
  }),
  variants: {
    // tone 이름은 Dot과 동일하다 — 팔레트 accent는 프로젝트 색 이름과 1:1로 일치한다
    tone: {
      primary: rec({ background: vars.color.primary }),
      success: rec({ background: vars.color.success }),
      warning: rec({ background: vars.color.warning }),
      danger: rec({ background: vars.color.danger }),
      blue: rec({ background: vars.color.brand[500] }),
      mint: rec({ background: vars.color.mint[500] }),
      violet: rec({ background: vars.color.violet[500] }),
      amber: rec({ background: vars.color.amber[500] }),
      pink: rec({ background: vars.color.rose[500] }),
      gray: rec({ background: vars.color.cool[500] }),
    },
  },
  defaultVariants: { tone: 'primary' },
});

export type ProgressFillVariantProps = NonNullable<RecipeVariants<typeof progressFill>>;
