import * as stylex from '@stylexjs/stylex';

export const color = stylex.defineVars({
  white: '#ffffff',

  brand50: '#f4f9ff',
  brand100: '#e8f3ff',
  brand200: '#cfe5ff',
  brand300: '#a8cfff',
  brand400: '#6ba9fa',
  brand500: '#3182f6',
  brand600: '#2272eb',
  brand700: '#1e63cf',
  brand800: '#1a52a8',
  brand900: '#163f80',

  cool50: '#f9fafb',
  cool100: '#f2f4f6',
  cool200: '#e5e8eb',
  cool300: '#d1d6db',
  cool400: '#b0b8c1',
  cool500: '#8b95a1',
  cool600: '#6b7684',
  cool700: '#4e5968',
  cool800: '#333d4b',
  cool900: '#191f28',

  mint100: '#dff7f2',
  mint500: '#00c2a8',
  mint600: '#00b8a3',
  violet100: '#ecebff',
  violet500: '#6a5af9',
  amber100: '#fff1de',
  amber500: '#ff9f43',
  rose100: '#ffe7ee',
  rose500: '#ff5d8f',
  ruby100: '#feeaec',
  ruby500: '#f04452',
  sun100: '#fff7e0',
  sun500: '#f9b811',

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
});

export const space = stylex.defineVars({
  none: '0',
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
});

export const size = stylex.defineVars({
  none: '0',
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
});

export const radii = stylex.defineVars({
  xs: '6px',
  sm: '8px',
  md: '12px',
  lg: '14px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  pill: '999px',
  full: '9999px',
});

export const shadow = stylex.defineVars({
  xs: '0 1px 2px rgba(15, 19, 36, 0.04)',
  sm: '0 1px 2px rgba(15, 19, 36, 0.04)',
  md: '0 4px 12px rgba(15, 19, 36, 0.05)',
  card: '0 1px 3px rgba(15, 19, 36, 0.04), 0 4px 12px rgba(15, 19, 36, 0.04)',
  lg: '0 12px 32px rgba(15, 19, 36, 0.10)',
  sheet: '0 -8px 32px rgba(15, 19, 36, 0.16)',
  fab: '0 8px 20px rgba(49, 130, 246, 0.35), 0 2px 6px rgba(49, 130, 246, 0.25)',
  focus: '0 0 0 3px rgba(49, 130, 246, 0.30)',
});

export const anim = stylex.defineVars({
  durationFast: '120ms',
  durationBase: '180ms',
  durationSlow: '280ms',
  easingStandard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  easingEnter: 'cubic-bezier(0, 0, 0.2, 1)',
  easingExit: 'cubic-bezier(0.4, 0, 1, 1)',
});

export const tracking = stylex.defineVars({
  tight: '-0.01em',
  tighter: '-0.02em',
  tightest: '-0.03em',
});

export const font = stylex.defineVars({
  sans: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif",
});

export const layer = stylex.defineVars({
  overlay: '60',
});
