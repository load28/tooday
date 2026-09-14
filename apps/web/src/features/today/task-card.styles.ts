import * as stylex from '@stylexjs/stylex';
import { anim, color, radii, size as sizeVars, space } from '@/styles/tokens.stylex';

const FOCUS_VISIBLE = ':is(:focus-visible, [data-focus-visible])';

export const styles = stylex.create({
  // 패딩은 Card의 padding variant로 준다 — 여기서 padding을 덮으면 기본값과 충돌한다
  card: { display: 'flex', alignItems: 'flex-start', gap: space.xl },
  // 리셋·포커스 링은 BaseButton이 제공 — 여기는 본문 레이아웃만 얹는다.
  body: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: space.sm,
    borderRadius: { default: null, [FOCUS_VISIBLE]: radii.xs },
  },
  check: {
    width: sizeVars['4xl'],
    height: sizeVars['4xl'],
    borderRadius: radii.sm,
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    transitionProperty: 'all',
    transitionDuration: anim.durationBase,
    transitionTimingFunction: anim.easingStandard,
  },
});

export const checkStatus = stylex.create({
  todo: {},
  doing: { backgroundColor: color.primarySoft, borderColor: color.primary, color: color.primary },
  done: { backgroundColor: color.success, borderColor: color.success, color: color.textInverse },
});
