import { style } from '@vanilla-extract/css';

export const container = style({
  padding: '2rem',
  fontFamily: 'system-ui, sans-serif',
});

export const title = style({
  fontSize: '2rem',
  fontWeight: 700,
  margin: 0,
});

export const description = style({
  marginTop: '1rem',
  fontSize: '1.125rem',
});
