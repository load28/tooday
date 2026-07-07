import { ark } from '@ark-ui/react/factory';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { type PressableVariantProps, pressable } from 'styled-system/recipes';

// 스타일 recipe는 panda.config.ts의 config recipe(`pressable`)로 옮겼다 — cva(atomic)가 아니다.
// config recipe는 `@layer recipe`에 깔려 css() override(@layer utilities)에 항상 지므로,
// asChild 자식이나 사용처 className의 override가 예측 가능하게 이긴다(비결정적 순서 승부 제거).
// 자세한 근거: docs/conventions/ui-styling.md.

type PressableProps = PressableVariantProps &
  Omit<ComponentPropsWithoutRef<'button'>, keyof PressableVariantProps> & {
    children?: ReactNode;
    /**
     * children 엘리먼트에 버튼 스타일·props를 병합해 렌더한다(예: <Link>). Ark factory가 처리.
     * ⚠️ asChild 자식 className에는 배치(margin/flex 등)만 — tone/size/shape/색은 이 컴포넌트의
     * variant prop으로 지정한다. 자식이 recipe 관리 속성을 덮으면(=footgun) 규칙 위반이다.
     */
    asChild?: boolean;
  };

export function Pressable({ asChild, className, children, type, ...rest }: PressableProps) {
  const [variantProps, htmlProps] = pressable.splitVariantProps(rest);
  return (
    <ark.button
      asChild={asChild}
      // asChild로 <a>/<Link>가 되면 type="button"은 부적절하므로 네이티브 button일 때만 준다
      type={asChild ? undefined : (type ?? 'button')}
      data-pressable=""
      {...htmlProps}
      className={cx(pressable(variantProps), className)}
    >
      {children}
    </ark.button>
  );
}

export type { PressableProps };
