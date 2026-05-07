export const TOKENS = {
  color: {
    bg: '#f5f6f8',
    bgWarm: '#f7f8fa',
    surface: '#ffffff',
    surfaceMuted: '#f9fafb',
    surfaceSoft: '#f2f4f6',
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
    primarySofter: '#f4f9ff',

    success: '#00b8a3',
    successSoft: '#e8f8f4',
    warning: '#f9b811',
    warningSoft: '#fff7e0',
    danger: '#f04452',
    dangerSoft: '#feeaec',

    overlay: 'rgba(15, 19, 36, 0.45)',

    projectBlue: '#3182f6',
    projectMint: '#00c2a8',
    projectViolet: '#6a5af9',
    projectAmber: '#ff9f43',
    projectPink: '#ff5d8f',
    projectGray: '#8b95a1',
  },
  font: {
    body: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif",
  },
  shadow: {
    sm: '0 1px 2px rgba(15, 19, 36, 0.04)',
    md: '0 4px 12px rgba(15, 19, 36, 0.05)',
    card: '0 1px 3px rgba(15, 19, 36, 0.04), 0 4px 12px rgba(15, 19, 36, 0.04)',
    lg: '0 12px 32px rgba(15, 19, 36, 0.10)',
    fab: '0 8px 20px rgba(49, 130, 246, 0.35), 0 2px 6px rgba(49, 130, 246, 0.25)',
  },
};

export type ProjectColor = 'blue' | 'mint' | 'violet' | 'amber' | 'pink' | 'gray';

export const PROJECT_COLOR_HEX: Record<ProjectColor, string> = {
  blue: TOKENS.color.projectBlue,
  mint: TOKENS.color.projectMint,
  violet: TOKENS.color.projectViolet,
  amber: TOKENS.color.projectAmber,
  pink: TOKENS.color.projectPink,
  gray: TOKENS.color.projectGray,
};

export const PROJECT_COLOR_SOFT: Record<ProjectColor, string> = {
  blue: '#e8f3ff',
  mint: '#dff7f2',
  violet: '#ecebff',
  amber: '#fff1de',
  pink: '#ffe7ee',
  gray: '#eef0f3',
};
