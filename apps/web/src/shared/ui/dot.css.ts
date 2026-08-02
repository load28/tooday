import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const dot = recipe({
  base: rec({ display: 'inline-block', flexShrink: 0, borderRadius: vars.radii.full }),
  variants: {
    size: {
      xs: rec({ width: vars.size.xs, height: vars.size.xs }),
      sm: rec({ width: vars.size.sm, height: vars.size.sm }),
      md: rec({ width: vars.size.md, height: vars.size.md }),
      lg: rec({ width: vars.size.lg, height: vars.size.lg }),
    },
    tone: {
      // 시맨틱 색
      primary: rec({ background: vars.color.primary }),
      success: rec({ background: vars.color.success }),
      warning: rec({ background: vars.color.warning }),
      danger: rec({ background: vars.color.danger }),
      neutral: rec({ background: vars.color.borderStrong }),
      muted: rec({ background: vars.color.border }),
      // 팔레트 accent 색(도메인 무관) — 프로젝트 색 이름과 1:1로 일치한다
      blue: rec({ background: vars.color.brand[500] }),
      mint: rec({ background: vars.color.mint[500] }),
      violet: rec({ background: vars.color.violet[500] }),
      amber: rec({ background: vars.color.amber[500] }),
      pink: rec({ background: vars.color.rose[500] }),
      gray: rec({ background: vars.color.cool[500] }),
    },
  },
  defaultVariants: { size: 'sm', tone: 'neutral' },
});

export type DotVariantProps = NonNullable<RecipeVariants<typeof dot>>;
