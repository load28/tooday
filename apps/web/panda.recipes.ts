import { defineRecipe } from '@pandacss/dev';

// shared/ui 프리미티브의 스타일 recipe를 한곳에 모은다.
//
// 왜 컴포넌트 안 cva가 아니라 config recipe인가:
// cva(atomic recipe)는 `@layer utilities`에 깔린다 — 사용처의 css() override와 같은 층이라
// 특이도가 같고, 승자가 "스타일 생성 순서"라는 눈에 안 보이는 값에 좌우된다(비결정적).
// defineRecipe(config recipe)는 `@layer recipes`에 깔리고 레이어 우선순위가
// `recipes < utilities`라, 사용처/자식(asChild) override가 항상 예측 가능하게 이긴다.
// 이는 override를 *결정적*으로 만들 뿐 *권장*하는 것은 아니다(변형은 variant prop 우선).
// 배경: docs/conventions/ui-styling.md.
//
// 모든 variant CSS 생성은 panda.config.ts의 staticCss로 강제한다 — variant가 동적으로
// 전달돼(정적 추출 불가) CSS가 누락되는 것을 막기 위해(cva의 "정의된 variant 전부 생성"과 동일).

const pressable = defineRecipe({
  className: 'pressable',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'md',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'text',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'left',
    minWidth: 0,
    transition:
      'background-color {durations.fast} {easings.exit}, transform {durations.fast} {easings.exit}, color {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
    // _disabled는 aria-disabled까지 매칭하므로 네이티브 disabled에만 한정한다
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.5,
    },
    _focusVisible: {
      outline: 'none',
      boxShadow: 'focus',
    },
  },
  variants: {
    tone: {
      ghost: { color: 'text', _press: { bg: 'pressedStrong' } },
      subtle: { bg: 'surfaceMuted', color: 'textSecondary', _press: { bg: 'surfaceSoft' } },
      brand: { bg: 'primary', color: 'onPrimary', _press: { bg: 'primaryPressed' } },
      brandSoft: { bg: 'primarySoft', color: 'primary', _press: { bg: 'primarySofter' } },
      danger: { bg: 'danger', color: 'textInverse', _press: { bg: 'dangerPressed' } },
      dangerSoft: { bg: 'dangerSoft', color: 'danger', _press: { bg: 'dangerSoft', filter: 'brightness(0.96)' } },
    },
    shape: {
      square: { borderRadius: 'md' },
      rounded: { borderRadius: 'lg' },
      pill: { borderRadius: 'pill' },
      circle: { borderRadius: 'full', aspectRatio: '1 / 1' },
    },
    size: {
      sm: { height: 'controlSm', paddingX: 'xl', textStyle: 'bodySm' },
      md: { height: 'tap', paddingX: '2xl', textStyle: 'body' },
      lg: { height: 'tapLg', paddingX: '3xl', textStyle: 'bodyLg' },
      xl: { height: 'tapXl', paddingX: '3xl', textStyle: 'bodyLgStrong' },
      icon: { height: 'tap', width: 'tap', paddingX: '0' },
      iconLg: { height: 'tapLg', width: 'tapLg', paddingX: '0' },
    },
    pressed: {
      true: { transform: 'scale(0.96)' },
    },
  },
  defaultVariants: { tone: 'ghost', shape: 'rounded', size: 'md' },
});

const card = defineRecipe({
  className: 'card',
  base: {
    bg: 'surface',
    borderRadius: 'xl',
    overflow: 'hidden',
    minWidth: 0,
    color: 'text',
    transition: 'box-shadow {durations.fast} {easings.exit}, transform {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
  },
  variants: {
    elevation: {
      flat: { boxShadow: 'none', border: '1px solid {colors.border}' },
      raised: { boxShadow: 'card' },
      floating: { boxShadow: 'lg' },
    },
    radius: {
      md: { borderRadius: 'md' },
      lg: { borderRadius: 'lg' },
      xl: { borderRadius: 'xl' },
      '2xl': { borderRadius: '2xl' },
    },
    padding: {
      none: { padding: '0' },
      sm: { padding: 'cardPadSm' },
      md: { padding: 'cardPadMd' },
      lg: { padding: 'cardPadLg' },
    },
    interactive: {
      true: {
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        _press: { transform: 'scale(0.99)' },
      },
    },
    selected: {
      true: { boxShadow: '0 0 0 2px {colors.primary}, {shadows.card}' },
    },
  },
  defaultVariants: { elevation: 'raised', radius: 'xl', padding: 'none' },
});

const chip = defineRecipe({
  className: 'chip',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'sm',
    paddingInline: 'md',
    paddingBlock: '2xs',
    borderRadius: 'pill',
    textStyle: 'caption',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  variants: {
    tone: {
      neutral: { bg: 'surfaceSoft', color: 'textSecondary' },
      brand: { bg: 'primarySoft', color: 'primary' },
      success: { bg: 'successSoft', color: 'success' },
      warning: { bg: 'warningSoft', color: 'warning' },
      danger: { bg: 'dangerSoft', color: 'danger' },
      outline: { bg: 'transparent', color: 'textSecondary', border: '1px solid {colors.border}' },
    },
    size: {
      sm: { textStyle: 'micro', paddingBlock: '0' },
      md: { textStyle: 'caption' },
      lg: { textStyle: 'bodySm', paddingBlock: 'xs', paddingInline: 'xl' },
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});

const text = defineRecipe({
  className: 'text',
  base: { margin: 0, minWidth: 0 },
  variants: {
    variant: {
      display: { textStyle: 'display' },
      title: { textStyle: 'title' },
      subtitle: { textStyle: 'subtitle' },
      bodyLg: { textStyle: 'bodyLg' },
      bodyLgStrong: { textStyle: 'bodyLgStrong' },
      body: { textStyle: 'body' },
      bodyStrong: { textStyle: 'bodyStrong' },
      bodySm: { textStyle: 'bodySm' },
      label: { textStyle: 'label' },
      caption: { textStyle: 'caption' },
      captionStrong: { textStyle: 'captionStrong' },
      micro: { textStyle: 'micro' },
      overline: { textStyle: 'overline' },
      numeric: { textStyle: 'numeric' },
    },
    tone: {
      default: { color: 'text' },
      secondary: { color: 'textSecondary' },
      tertiary: { color: 'textTertiary' },
      placeholder: { color: 'textPlaceholder' },
      inverse: { color: 'textInverse' },
      brand: { color: 'textBrand' },
      success: { color: 'success' },
      warning: { color: 'warning' },
      danger: { color: 'danger' },
    },
    truncate: {
      true: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    },
    align: {
      start: { textAlign: 'start' },
      center: { textAlign: 'center' },
      end: { textAlign: 'end' },
    },
  },
  defaultVariants: { variant: 'body', tone: 'default' },
});

const surface = defineRecipe({
  className: 'surface',
  base: { minWidth: 0, transition: 'background-color {durations.fast} {easings.standard}' },
  variants: {
    tone: {
      canvas: { bg: 'bg' },
      canvasWarm: { bg: 'bgWarm' },
      surface: { bg: 'surface' },
      muted: { bg: 'surfaceMuted' },
      soft: { bg: 'surfaceSoft' },
      inverse: { bg: 'surfaceInverse', color: 'textInverse' },
      brandSoft: { bg: 'primarySoft', color: 'primary' },
      successSoft: { bg: 'successSoft', color: 'success' },
      warningSoft: { bg: 'warningSoft', color: 'warning' },
      dangerSoft: { bg: 'dangerSoft', color: 'danger' },
      transparent: { bg: 'transparent' },
    },
    bordered: {
      none: {},
      hairline: { border: '1px solid {colors.border}' },
      strong: { border: '1px solid {colors.borderStrong}' },
    },
    radius: {
      none: { borderRadius: '0' },
      sm: { borderRadius: 'sm' },
      md: { borderRadius: 'md' },
      lg: { borderRadius: 'lg' },
      xl: { borderRadius: 'xl' },
      '2xl': { borderRadius: '2xl' },
      '3xl': { borderRadius: '3xl' },
      pill: { borderRadius: 'pill' },
    },
    elevation: {
      none: { boxShadow: 'none' },
      xs: { boxShadow: 'xs' },
      sm: { boxShadow: 'sm' },
      md: { boxShadow: 'md' },
      card: { boxShadow: 'card' },
      lg: { boxShadow: 'lg' },
    },
    padding: {
      none: { padding: '0' },
      sm: { padding: 'cardPadSm' },
      md: { padding: 'cardPadMd' },
      lg: { padding: 'cardPadLg' },
    },
    inset: {
      none: { padding: '0' },
      x: { paddingX: 'pageX' },
      y: { paddingY: 'xl' },
    },
  },
  defaultVariants: { tone: 'surface', radius: 'none', elevation: 'none', bordered: 'none' },
});

const dot = defineRecipe({
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
      primary: { bg: 'primary' },
      success: { bg: 'success' },
      warning: { bg: 'warning' },
      danger: { bg: 'danger' },
      neutral: { bg: 'borderStrong' },
      muted: { bg: 'border' },
    },
  },
  defaultVariants: { size: 'sm', tone: 'neutral' },
});

const divider = defineRecipe({
  className: 'divider',
  base: { border: 'none', background: 'divider', flexShrink: 0 },
  variants: {
    orientation: {
      horizontal: { width: '100%', height: '1px' },
      vertical: { height: 'auto', alignSelf: 'stretch', width: '1px' },
    },
    tone: {
      subtle: { background: 'divider' },
      strong: { background: 'border' },
    },
    inset: {
      none: { marginInline: '0' },
      content: { marginInline: 'pageX' },
      leading: { marginInlineStart: 'dividerLeadingInset' },
    },
  },
  defaultVariants: { orientation: 'horizontal', tone: 'subtle', inset: 'none' },
});

const spinner = defineRecipe({
  className: 'spinner',
  base: {
    display: 'inline-block',
    flexShrink: 0,
    width: '1em',
    height: '1em',
    borderRadius: 'full',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'currentcolor',
    borderBottomColor: 'transparent',
    animation: 'toodaySpin 0.6s linear infinite',
  },
});

const row = defineRecipe({
  className: 'row',
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: 'xl',
    minWidth: 0,
    width: '100%',
    color: 'text',
    textAlign: 'left',
    transition: 'background-color {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
  },
  variants: {
    density: {
      compact: { paddingX: 'xl', paddingY: 'md', minHeight: 'tap' },
      comfortable: { paddingX: '2xl', paddingY: 'xl', minHeight: 'tapLg' },
      spacious: { paddingX: '2xl', paddingY: '2xl', minHeight: 'tapXl' },
    },
    align: {
      center: { alignItems: 'center' },
      start: { alignItems: 'flex-start' },
    },
    interactive: {
      true: {
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        _press: { bg: 'pressedStrong' },
      },
    },
    inset: {
      none: {},
      flush: { paddingX: '0' },
    },
  },
  defaultVariants: { density: 'comfortable', align: 'center', inset: 'none' },
});

const input = defineRecipe({
  className: 'input',
  base: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    appearance: 'none',
    border: '1.5px solid transparent',
    borderRadius: 'lg',
    bg: 'surfaceSoft',
    color: 'text',
    fontFamily: 'inherit',
    letterSpacing: 'tight',
    fontWeight: '500',
    // 16px 미만이면 iOS 웹뷰가 포커스 시 화면을 자동 확대한다
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color {durations.fast} {easings.exit}, background-color {durations.fast} {easings.exit}',
    _placeholder: { color: 'textPlaceholder' },
    _focus: { bg: 'surface', borderColor: 'primary' },
    _disabled: { cursor: 'not-allowed', opacity: 0.5 },
    '&[data-invalid], &[aria-invalid="true"]': { borderColor: 'danger' },
  },
  variants: {
    size: {
      sm: { height: 'controlSm', paddingX: 'xl', borderRadius: 'md' },
      md: { height: 'tap', paddingX: 'xl' },
      lg: { height: 'tapLg', paddingX: '2xl' },
      xl: { height: 'tapXl', paddingX: '2xl' },
    },
  },
  defaultVariants: { size: 'md' },
});

const tabBarItem = defineRecipe({
  className: 'tabBarItem',
  base: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2xs',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textStyle: 'micro',
    padding: 0,
    transition: 'color {durations.base} {easings.standard}',
    _focusVisible: { outline: 'none', boxShadow: 'focus' },
  },
  variants: {
    active: {
      true: { color: 'primary', fontWeight: 700 },
      false: { color: 'textTertiary' },
    },
  },
});

const tabBarIconWrap = defineRecipe({
  className: 'tabBarIconWrap',
  base: {
    width: 'tapXl',
    height: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'pill',
    transition: 'background {durations.slow} {easings.standard}',
  },
  variants: {
    active: {
      true: { bg: 'primarySoft' },
      false: {},
    },
  },
});

export const uiRecipes = {
  pressable,
  card,
  chip,
  text,
  surface,
  dot,
  divider,
  spinner,
  row,
  input,
  tabBarItem,
  tabBarIconWrap,
};
