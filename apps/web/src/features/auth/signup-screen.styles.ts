import * as stylex from '@stylexjs/stylex';
import { space } from '@/styles/tokens.stylex';

export const styles = stylex.create({
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '420px',
    minHeight: '100%',
    marginInline: 'auto',
    paddingInline: space.pageX,
    paddingTop: 'clamp(48px, 16dvh, 140px)',
    paddingBottom: space['4xl'],
    gap: space['4xl'],
  },
});
