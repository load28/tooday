import { defineRecipe } from '@pandacss/dev';

// config recipe(빌드 전용). 근거: docs/conventions/ui-styling.md.
export const dot = defineRecipe({
  className: 'dot',
  base: { display: 'inline-block', flexShrink: 0, borderRadius: 'full' },
  variants: {
    size: {
      xs: { width: 'xs', height: 'xs' },
      sm: { width: 'sm', height: 'sm' },
      md: { width: 'md', height: 'md' },
      lg: { width: 'lg', height: 'lg' },
    },
    tone: {
      // 시맨틱 색
      primary: { bg: 'primary' },
      success: { bg: 'success' },
      warning: { bg: 'warning' },
      danger: { bg: 'danger' },
      neutral: { bg: 'borderStrong' },
      muted: { bg: 'border' },
      // 팔레트 accent 색(도메인 무관) — 프로젝트 색 이름과 1:1로 일치한다
      blue: { bg: 'brand.500' },
      mint: { bg: 'mint.500' },
      violet: { bg: 'violet.500' },
      amber: { bg: 'amber.500' },
      pink: { bg: 'rose.500' },
      gray: { bg: 'cool.500' },
    },
  },
  defaultVariants: { size: 'sm', tone: 'neutral' },
});
