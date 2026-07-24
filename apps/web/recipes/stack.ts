import { defineRecipe } from '@pandacss/dev';

// alignItems 충돌을 피하려 direction은 flexDirection만, alignItems는 align variant만 맡는다
// (정렬 기본값은 컴포넌트가 align에 넣어 넘긴다).
export const tStack = defineRecipe({
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

export const tSpacer = defineRecipe({
  className: 'spacer',
  base: { flexShrink: 0, alignSelf: 'stretch' },
  variants: {
    // auto=남는 공간 채움, 나머지는 스페이싱 스케일 고정 크기(sizes 토큰 = 스페이싱 스케일 포함)
    size: {
      auto: { flexGrow: 1, flexBasis: 0 },
      '2xs': { flexGrow: 0, flexBasis: '2xs' },
      xs: { flexGrow: 0, flexBasis: 'xs' },
      sm: { flexGrow: 0, flexBasis: 'sm' },
      md: { flexGrow: 0, flexBasis: 'md' },
      lg: { flexGrow: 0, flexBasis: 'lg' },
      xl: { flexGrow: 0, flexBasis: 'xl' },
      '2xl': { flexGrow: 0, flexBasis: '2xl' },
      '3xl': { flexGrow: 0, flexBasis: '3xl' },
      '4xl': { flexGrow: 0, flexBasis: '4xl' },
    },
  },
  defaultVariants: { size: 'auto' },
});
