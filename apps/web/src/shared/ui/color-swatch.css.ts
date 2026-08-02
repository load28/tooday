import { style } from '@vanilla-extract/css';
import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { ON } from '@/styles/conditions';
import { vars } from '@/styles/theme.css';

export const rootCls = style({ display: 'flex', flexWrap: 'wrap', gap: vars.space.md });

export const swatchItem = recipe({
  base: {
    width: vars.size.tap,
    height: vars.size.tap,
    borderRadius: vars.radii.full,
    // 배경·선택 링이 같은 색을 공유하도록 tone은 CSS 변수 하나만 바꾼다
    background: 'var(--swatch-color)',
    color: vars.color.textInverse,
    transition: `transform ${vars.duration.fast} ${vars.easing.standard}, box-shadow ${vars.duration.fast} ${vars.easing.standard}`,
    selectors: {
      [ON]: {
        boxShadow: `0 0 0 2px ${vars.color.surface}, 0 0 0 4px var(--swatch-color)`,
        transform: 'scale(1.04)',
      },
    },
  },
  variants: {
    // 팔레트 accent 색(도메인 무관) — Dot의 accent tone·프로젝트 색 이름과 1:1로 일치한다
    tone: {
      blue: { vars: { '--swatch-color': vars.color.brand[500] } },
      mint: { vars: { '--swatch-color': vars.color.mint[500] } },
      violet: { vars: { '--swatch-color': vars.color.violet[500] } },
      amber: { vars: { '--swatch-color': vars.color.amber[500] } },
      pink: { vars: { '--swatch-color': vars.color.rose[500] } },
      gray: { vars: { '--swatch-color': vars.color.cool[500] } },
    },
  },
  defaultVariants: { tone: 'gray' },
});

export type SwatchItemVariantProps = NonNullable<RecipeVariants<typeof swatchItem>>;

// 선택된 아이템에서만 드러나는 표시 슬롯 — 상태는 aria-pressed가 전달하므로 시각 전용이다
export const indicatorCls = style({
  display: 'inline-flex',
  opacity: 0,
  transition: `opacity ${vars.duration.fast} ${vars.easing.standard}`,
  selectors: { '[data-state="on"] &': { opacity: 1 } },
});
