import { Field as ArkField } from '@ark-ui/react/field';
import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithRef } from 'react';
import type { ControlSx } from '@/styles/sx';
import { text } from '@/styles/text.styles';
import { anim, color, radii, size as sizeVars, space, tracking } from '@/styles/tokens.stylex';

// Field 안에서는 Ark가 data-invalid를, 단독 사용 시엔 컨트롤이 aria-invalid를 설정한다 —
// 둘 다 같은 셀렉터로 스타일링된다.
const INVALID = ':is([data-invalid], [aria-invalid="true"])';
const DISABLED = ':is(:disabled, [disabled], [data-disabled])';
const FOCUS = ':is(:focus, [data-focus])';

const base = stylex.create({
  root: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    appearance: 'none',
    borderStyle: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: { default: color.text, [DISABLED]: color.disabledText },
    fontFamily: 'inherit',
    outline: 'none',
    '::placeholder': { color: color.textPlaceholder },
    // 비활성 = 중립 채움으로 교체 (opacity로 흐리지 않는다 — 버튼과 동일 원칙, 테두리 없이).
    cursor: { default: null, [DISABLED]: 'not-allowed' },
  },
  // 박스형 필드 — 테두리·배경·포커스 링을 갖는 기본 룩
  box: {
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: { default: 'transparent', [FOCUS]: color.primary, [INVALID]: color.danger },
    borderRadius: radii.lg,
    backgroundColor: { default: color.surfaceSoft, [FOCUS]: color.surface, [DISABLED]: color.disabledSurface },
    letterSpacing: tracking.tight,
    fontWeight: 500,
    // 16px 미만이면 iOS 웹뷰가 포커스 시 화면을 자동 확대한다
    fontSize: '16px',
    transitionProperty: 'border-color, background-color',
    transitionDuration: anim.durationFast,
    transitionTimingFunction: anim.easingExit,
  },
  // 테두리 없는 인라인 입력 — 화면 타이틀을 display 타이포 그대로 편집한다.
  inline: {
    height: 'auto',
    paddingInline: space['2xs'],
    borderRadius: 0,
    backgroundColor: { default: 'transparent', [DISABLED]: color.disabledSurface },
  },
});

// 메트릭은 박스형 기준 — inline은 size를 쓰지 않는다
const sizes = stylex.create({
  sm: { height: sizeVars.controlSm, paddingInline: space.xl, borderRadius: radii.md },
  md: { height: sizeVars.tap, paddingInline: space.xl },
  lg: { height: sizeVars.tapLg, paddingInline: space['2xl'] },
  xl: { height: sizeVars.tapXl, paddingInline: space['2xl'] },
});

export type InputSize = keyof typeof sizes;
export type InputVariant = 'box' | 'inline';

type InputOwnProps = {
  /** box(기본) = 박스형 필드, inline = 테두리 없는 타이틀 입력 (size 무시) */
  variant?: InputVariant;
  size?: InputSize;
  sx?: ControlSx;
};

type InputProps = InputOwnProps & Omit<ComponentPropsWithRef<'input'>, keyof InputOwnProps | 'style' | 'className'>;

/** Field 컨텍스트가 있으면 id·aria 배선을 물려받고, 없으면 일반 input으로 동작한다. */
export function Input({ variant = 'box', size = 'md', sx, ...rest }: InputProps) {
  const look = variant === 'inline' ? [text.display, base.inline] : [base.box, sizes[size]];
  return <ArkField.Input {...rest} {...stylex.props(base.root, ...look, sx)} />;
}
