import { defineRecipe } from '@pandacss/dev';

export const progressTrack = defineRecipe({
  className: 'progressTrack',
  base: {
    height: 'xs',
    borderRadius: 'pill',
    bg: 'surfaceSoft',
    overflow: 'hidden',
  },
});

export const progressFill = defineRecipe({
  className: 'progressFill',
  base: {
    height: '100%',
    borderRadius: 'pill',
    transition: 'width {durations.slow} {easings.standard}',
  },
  variants: {
    // tone 이름은 Dot과 동일하다 — 팔레트 accent는 프로젝트 색 이름과 1:1로 일치한다
    tone: {
      primary: { bg: 'primary' },
      success: { bg: 'success' },
      warning: { bg: 'warning' },
      danger: { bg: 'danger' },
      blue: { bg: 'brand.500' },
      mint: { bg: 'mint.500' },
      violet: { bg: 'violet.500' },
      amber: { bg: 'amber.500' },
      pink: { bg: 'rose.500' },
      gray: { bg: 'cool.500' },
    },
  },
  defaultVariants: { tone: 'primary' },
});
