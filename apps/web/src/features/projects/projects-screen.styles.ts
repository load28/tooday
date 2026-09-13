import * as stylex from '@stylexjs/stylex';
import { color, space } from '@/styles/tokens.stylex';

export const styles = stylex.create({
  emptyIcon: { color: color.borderStrong },
  hero: { paddingInline: space.pageX, paddingTop: space.md, paddingBottom: space.lg },
  list: { paddingInline: space.pageX, paddingBottom: space['4xl'] },
  card: { display: 'flex', flexDirection: 'column', gap: space.md, width: '100%', textAlign: 'left' },
  empty: { paddingBlock: space.emptyStateY, paddingInline: space['4xl'] },
});
