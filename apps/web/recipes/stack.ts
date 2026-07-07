import { defineRecipe } from '@pandacss/dev';

// config recipe(빌드 전용). 근거: docs/conventions/ui-styling.md.
// Stack/HStack: 원래 동적 css()였으나 gap 사용값이 전부 스케일 토큰이라 variant로 열었다.
// alignItems가 두 variant에서 겹치지 않도록 direction은 flexDirection만, alignItems는
// align variant만 담당한다(정렬 기본값은 컴포넌트가 align에 넣어 넘긴다).
export const stack = defineRecipe({
  className: 'stack',
  base: { display: 'flex', minWidth: 0 },
  variants: {
    direction: {
      row: { flexDirection: 'row' },
      column: { flexDirection: 'column' },
    },
    gap: {
      '0': { gap: '0' },
      '2xs': { gap: '2xs' },
      xs: { gap: 'xs' },
      sm: { gap: 'sm' },
      md: { gap: 'md' },
      lg: { gap: 'lg' },
      xl: { gap: 'xl' },
      '2xl': { gap: '2xl' },
      '3xl': { gap: '3xl' },
      '4xl': { gap: '4xl' },
    },
    align: {
      start: { alignItems: 'flex-start' },
      center: { alignItems: 'center' },
      end: { alignItems: 'flex-end' },
      stretch: { alignItems: 'stretch' },
      baseline: { alignItems: 'baseline' },
    },
    justify: {
      start: { justifyContent: 'flex-start' },
      center: { justifyContent: 'center' },
      end: { justifyContent: 'flex-end' },
      between: { justifyContent: 'space-between' },
      around: { justifyContent: 'space-around' },
      evenly: { justifyContent: 'space-evenly' },
    },
    wrap: {
      true: { flexWrap: 'wrap' },
      false: { flexWrap: 'nowrap' },
    },
    inline: {
      true: { display: 'inline-flex' },
      false: { display: 'flex' },
    },
  },
});

export const spacer = defineRecipe({
  className: 'spacer',
  base: { flexShrink: 0, alignSelf: 'stretch' },
  variants: {
    // 고정 크기(size≠auto)는 컴포넌트가 style.flexBasis로 준다
    grow: {
      true: { flexGrow: 1, flexBasis: 0 },
      false: { flexGrow: 0 },
    },
  },
});
