import type { StyleRule } from '@vanilla-extract/css';

// Panda의 textStyles를 그대로 스타일 객체로 옮긴다. 사용처에서 `...textStyles.body`로 펼친다.
export const textStyles = {
  display: { fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: '30px' },
  title: { fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: '24px' },
  subtitle: { fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: '22px' },
  bodyLg: { fontSize: '16px', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: '24px' },
  bodyLgStrong: { fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: '24px' },
  body: { fontSize: '14px', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: '22px' },
  bodyStrong: { fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: '22px' },
  bodySm: { fontSize: '13px', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: '20px' },
  label: { fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: '18px' },
  caption: { fontSize: '12px', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: '16px' },
  captionStrong: { fontSize: '12px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: '16px' },
  micro: { fontSize: '11px', fontWeight: 600, letterSpacing: '0', lineHeight: '14px' },
  overline: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    lineHeight: '18px',
    textTransform: 'uppercase',
  },
  numeric: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: '18px',
    fontFeatureSettings: '"tnum" 1',
  },
  numericLg: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: '20px',
    fontFeatureSettings: '"tnum" 1',
  },
} satisfies Record<string, StyleRule>;

export type TextStyleName = keyof typeof textStyles;
