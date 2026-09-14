import * as stylex from '@stylexjs/stylex';
import { space } from '@/styles/tokens.stylex';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['2xl'],
    paddingInline: space.pageX,
    paddingTop: space.lg,
    paddingBottom: space['4xl'],
  },
});
