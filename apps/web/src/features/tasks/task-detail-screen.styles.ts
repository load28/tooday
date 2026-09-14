import * as stylex from '@stylexjs/stylex';
import { radii, space } from '@/styles/tokens.stylex';

export const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['2xl'],
    paddingInline: space.pageX,
    paddingTop: space.lg,
    paddingBottom: space['4xl'],
  },
  // 상태 알약을 감싸는 탭 타깃 — 리셋·포커스 링은 BaseButton이, 색은 Chip이 tone으로 관리한다
  statusButton: { alignSelf: 'flex-start', borderRadius: radii.pill },
});
