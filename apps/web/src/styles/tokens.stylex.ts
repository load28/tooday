import * as stylex from '@stylexjs/stylex';

export const color = stylex.defineVars({
  text: '#191f28',
  textInverse: '#ffffff',
  textBrand: '#3182f6',
  textSecondary: '#4e5968',
  surfaceMuted: '#f9fafb',
  surfaceSoft: '#f2f4f6',
  primary: '#3182f6',
  primarySoft: '#e8f3ff',
  primarySofter: '#f4f9ff',
  primaryPressed: '#1e63cf',
  onPrimary: '#ffffff',
  danger: '#f04452',
  dangerSoft: '#feeaec',
  dangerPressed: '#d63845',
  disabledSurface: '#d1d6db',
  disabledText: '#8b95a1',
  stateHover: 'color-mix(in srgb, #191f28 5%, transparent)',
  statePressed: 'color-mix(in srgb, #191f28 10%, transparent)',
});

export const space = stylex.defineVars({
  md: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.25rem',
});

export const size = stylex.defineVars({
  controlSm: '32px',
  controlMd: '36px',
  tap: '40px',
  tapLg: '48px',
});

export const radii = stylex.defineVars({
  md: '12px',
  lg: '14px',
  pill: '999px',
  full: '9999px',
});

export const shadow = stylex.defineVars({
  focus: '0 0 0 3px rgba(49, 130, 246, 0.30)',
});

export const anim = stylex.defineVars({
  durationFast: '120ms',
  easingExit: 'cubic-bezier(0.4, 0, 1, 1)',
});
