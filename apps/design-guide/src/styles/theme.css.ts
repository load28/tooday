import { createGlobalTheme } from '@vanilla-extract/css';

export const tokens = createGlobalTheme(':root', {
  color: {
    bg: '#f5f6f8',
    surface: '#ffffff',
    surfaceMuted: '#f9fafb',
    border: '#e5e8eb',
    borderStrong: '#d1d6db',
    divider: '#f2f4f6',

    textPrimary: '#191f28',
    textSecondary: '#4e5968',
    textTertiary: '#8b95a1',
    textPlaceholder: '#b0b8c1',
    textInverse: '#ffffff',

    primary: '#3182f6',
    primaryHover: '#2272eb',
    primarySoft: '#e8f3ff',

    success: '#00b8a3',
    successSoft: '#e8f8f4',
    warning: '#f9b811',
    warningSoft: '#fff7e0',
    danger: '#f04452',
    dangerSoft: '#feeaec',

    overlay: 'rgba(0, 0, 0, 0.45)',

    projectBlue: '#3182f6',
    projectMint: '#00c2a8',
    projectViolet: '#6a5af9',
    projectAmber: '#ff9f43',
    projectPink: '#ff5d8f',
    projectGray: '#8b95a1',
  },

  font: {
    body: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif",
  },

  fontSize: {
    xs: '11px',
    sm: '12px',
    md: '14px',
    lg: '15px',
    xl: '17px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '28px',
    display: '32px',
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.2',
    base: '1.4',
    relaxed: '1.6',
  },

  space: {
    '0': '0',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '7': '32px',
    '8': '40px',
    '9': '48px',
    '10': '64px',
  },

  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    pill: '999px',
  },

  shadow: {
    none: 'none',
    sm: '0 1px 2px rgba(15, 19, 36, 0.04)',
    md: '0 4px 12px rgba(15, 19, 36, 0.06)',
    lg: '0 12px 32px rgba(15, 19, 36, 0.10)',
  },

  zIndex: {
    base: '0',
    sticky: '10',
    overlay: '50',
    modal: '60',
    toast: '70',
  },
});
