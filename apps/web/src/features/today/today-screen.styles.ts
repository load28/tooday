import * as stylex from '@stylexjs/stylex';
import { color, size as sizeVars, space } from '@/styles/tokens.stylex';

export const styles = stylex.create({
  emptyIcon: { color: color.borderStrong },
  page: { paddingBottom: space['4xl'] },
  // 패딩은 Card의 padding variant로 준다 — 여기서 padding을 덮으면 기본값과 충돌한다
  hero: {
    marginTop: space.xs,
    marginInline: space.pageX,
    marginBottom: space['2xl'],
    display: 'flex',
    flexDirection: 'column',
    gap: space.xl,
  },
  timeline: { paddingInline: space['2xl'], display: 'flex', flexDirection: 'column', gap: space.lg },
  row: { display: 'grid', gridTemplateColumns: `${sizeVars.timeCol} 1fr`, gap: space.xl, alignItems: 'stretch' },
  timeCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: space['2xs'],
    // 카드 패딩(cardPadMd)에서 numeric(18px)·subtitle(22px) lineHeight 차의 절반을 당겨 첫 줄을 광학 정렬한다
    paddingTop: `calc(${space.cardPadMd} - 2px)`,
  },
  empty: { paddingBlock: space.emptyStateY, paddingInline: space['4xl'] },
});
