import type { ProjectColor } from '@tooday/shared';
import { token } from 'styled-system/tokens';

/** 프로젝트 색 이름(계약) → 디자인 토큰 색상값. 프로젝트가 없는 태스크는 gray를 쓴다. */
export const PROJECT_COLOR: Record<ProjectColor, string> = {
  blue: token('colors.brand.500'),
  mint: token('colors.mint.500'),
  violet: token('colors.violet.500'),
  amber: token('colors.amber.500'),
  pink: token('colors.rose.500'),
  gray: token('colors.cool.500'),
};
