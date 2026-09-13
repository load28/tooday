import { ark } from '@ark-ui/react/factory';
import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { anim, shadow } from '@/styles/tokens.stylex';

const styles = stylex.create({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    appearance: 'none',
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'left',
    minWidth: 0,
    cursor: { default: 'pointer', ':disabled': 'not-allowed' },
    opacity: { default: null, ':disabled': 0.5 },
    transitionProperty: 'background-color, color',
    transitionDuration: anim.durationFast,
    transitionTimingFunction: anim.easingExit,
    outline: { default: null, ':is(:focus-visible, [data-focus-visible])': 'none' },
    boxShadow: { default: null, ':is(:focus-visible, [data-focus-visible])': shadow.focus },
  },
});

type BaseButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'style'> & {
  children?: ReactNode;
  /**
   * children 엘리먼트에 버튼 스타일·props를 병합해 렌더한다(예: <Link>). Ark factory가 처리.
   * ⚠️ asChild 자식 sx에는 배치(margin/flex 등)만 — 시각 스타일은 감싸는 컴포넌트
   * (Button 등)의 variant prop으로 지정한다.
   */
  asChild?: boolean;
  /**
   * 베이스 뒤에 병합되는 스타일 — 겹치는 속성은 이쪽이 이긴다.
   * BaseButton은 파생 컴포넌트(Button·TabBar·ColorSwatch·WeekStrip)가 룩을 얹는 조립 지점이라
   * 속성을 좁히지 않는다. 사용처가 직접 쓰는 컴포넌트의 sx는 styles/sx.ts로 좁힌다.
   */
  sx?: stylex.StyleXStyles;
};

/** 모든 클릭 가능한 엘리먼트의 토대 — 리셋 + 인터랙션만. 버튼처럼 보여야 하면 Button을 쓴다. */
export function BaseButton({ asChild, className, sx, children, type, ...rest }: BaseButtonProps) {
  const { className: sxClassName, style } = stylex.props(styles.root, sx);
  return (
    <ark.button
      asChild={asChild}
      // asChild로 <a>/<Link>가 되면 type="button"은 부적절하므로 네이티브 button일 때만 준다
      type={asChild ? undefined : (type ?? 'button')}
      data-base-button=""
      {...rest}
      className={className ? `${sxClassName} ${className}` : sxClassName}
      style={style}
    >
      {children}
    </ark.button>
  );
}

export { styles as baseButtonStyles };
export type { BaseButtonProps };
