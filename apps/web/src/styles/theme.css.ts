import { createGlobalTheme } from '@vanilla-extract/css';

// Panda 토큰 + semanticTokens를 CSS 변수 계약으로 방출한다. semanticTokens는 참조를
// 최종 리터럴 값으로 해석해 단일 계약으로 평탄화한다(다크모드 등 조건 분기가 없어 동작 동일).
export const vars = createGlobalTheme(':root', {
  color: {
    white: '#ffffff',

    brand: {
      50: '#f4f9ff',
      100: '#e8f3ff',
      200: '#cfe5ff',
      300: '#a8cfff',
      400: '#6ba9fa',
      500: '#3182f6',
      600: '#2272eb',
      700: '#1e63cf',
      800: '#1a52a8',
      900: '#163f80',
    },
    cool: {
      50: '#f9fafb',
      100: '#f2f4f6',
      200: '#e5e8eb',
      300: '#d1d6db',
      400: '#b0b8c1',
      500: '#8b95a1',
      600: '#6b7684',
      700: '#4e5968',
      800: '#333d4b',
      900: '#191f28',
    },
    mint: { 100: '#dff7f2', 500: '#00c2a8', 600: '#00b8a3' },
    violet: { 100: '#ecebff', 500: '#6a5af9' },
    amber: { 100: '#fff1de', 500: '#ff9f43' },
    rose: { 100: '#ffe7ee', 500: '#ff5d8f' },
    ruby: { 100: '#feeaec', 500: '#f04452' },
    sun: { 100: '#fff7e0', 500: '#f9b811' },

    // semantic (참조를 리터럴로 해석)
    bg: '#f5f6f8',
    bgWarm: '#f7f8fa',

    surface: '#ffffff', // white
    surfaceMuted: '#f9fafb', // cool.50
    surfaceSoft: '#f2f4f6', // cool.100
    surfaceInverse: '#191f28', // cool.900

    border: '#e5e8eb', // cool.200
    borderStrong: '#d1d6db', // cool.300
    divider: '#f2f4f6', // cool.100

    text: '#191f28', // cool.900
    textSecondary: '#4e5968', // cool.700
    textTertiary: '#8b95a1', // cool.500
    textPlaceholder: '#b0b8c1', // cool.400
    textInverse: '#ffffff', // white
    textBrand: '#3182f6', // brand.500

    primary: '#3182f6', // brand.500
    primarySoft: '#e8f3ff', // brand.100
    primarySofter: '#f4f9ff', // brand.50
    onPrimary: '#ffffff', // white
    onPrimaryMuted: 'rgba(255, 255, 255, 0.6)',

    disabledSurface: '#d1d6db', // cool.300 (borderStrong)
    disabledText: '#8b95a1', // cool.500 (textTertiary)

    success: '#00b8a3', // mint.600
    successSoft: '#dff7f2', // mint.100
    warning: '#f9b811', // sun.500
    warningSoft: '#fff7e0', // sun.100
    danger: '#f04452', // ruby.500
    dangerSoft: '#feeaec', // ruby.100

    overlay: 'rgba(15, 19, 36, 0.45)',
    stateHover: 'color-mix(in srgb, #191f28 5%, transparent)', // text 5%
    statePressed: 'color-mix(in srgb, #191f28 10%, transparent)', // text 10%
    primaryPressed: '#1e63cf', // brand.700
    dangerPressed: '#d63845',
  },

  space: {
    0: '0',
    '2xs': '0.125rem',
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.625rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.25rem',
    '4xl': '1.5rem',

    // semantic spacing
    pageX: '1rem', // spacing.2xl
    appBarPadX: '0.75rem', // spacing.xl
    appBarPadY: '0.375rem', // spacing.sm
    appBarGap: '0.5rem', // spacing.md
    cardPadSm: '0.75rem', // spacing.xl
    cardPadMd: '1rem', // spacing.2xl
    cardPadLg: '1.25rem', // spacing.3xl
    sheetPadX: '1.25rem', // spacing.3xl
    sheetPadBottom: '1.5rem', // spacing.4xl
    sheetGap: '1rem', // spacing.2xl
    sheetHandleTop: '0.625rem', // spacing.lg
    dividerLeadingInset: '3rem',
    emptyStateY: '60px',
  },

  size: {
    0: '0',
    '2xs': '0.125rem',
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.625rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.25rem',
    '4xl': '1.5rem',
    controlSm: '32px',
    controlMd: '36px',
    tap: '40px',
    tapLg: '48px',
    tapXl: '56px',
    fab: '56px',
    handle: '36px',
    appBar: '52px',
    tabBar: '60px',
    timeCol: '52px',
    icon: '20px',
    iconLg: '24px',
  },

  radii: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '14px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    pill: '999px',
    full: '9999px',
  },

  shadow: {
    xs: '0 1px 2px rgba(15, 19, 36, 0.04)',
    sm: '0 1px 2px rgba(15, 19, 36, 0.04)',
    md: '0 4px 12px rgba(15, 19, 36, 0.05)',
    card: '0 1px 3px rgba(15, 19, 36, 0.04), 0 4px 12px rgba(15, 19, 36, 0.04)',
    lg: '0 12px 32px rgba(15, 19, 36, 0.10)',
    sheet: '0 -8px 32px rgba(15, 19, 36, 0.16)',
    fab: '0 8px 20px rgba(49, 130, 246, 0.35), 0 2px 6px rgba(49, 130, 246, 0.25)',
    focus: '0 0 0 3px rgba(49, 130, 246, 0.30)',
  },

  duration: {
    fast: '120ms',
    base: '180ms',
    slow: '280ms',
  },

  easing: {
    standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },

  letterSpacing: {
    tight: '-0.01em',
    tighter: '-0.02em',
    tightest: '-0.03em',
  },

  font: {
    sans: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif",
  },

  zIndex: {
    overlay: '60',
  },
});
