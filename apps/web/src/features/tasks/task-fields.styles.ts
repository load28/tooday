import * as stylex from '@stylexjs/stylex';
import { color, space } from '@/styles/tokens.stylex';

export const styles = stylex.create({
  chevron: { color: color.textPlaceholder },
  value: { display: 'inline-flex', alignItems: 'center', gap: space.sm, minWidth: 0 },
  check: { color: color.primary, flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  durationRow: { display: 'flex', flexWrap: 'wrap', gap: space.sm },
});
