import { ark } from '@ark-ui/react/factory';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { type BaseButtonVariantProps, baseButton } from '@/shared/ui/base-button.css';
import { cx } from '@/styles/cx';
import { splitVariantProps } from '@/styles/split';

type BaseButtonProps = BaseButtonVariantProps &
  Omit<ComponentPropsWithoutRef<'button'>, keyof BaseButtonVariantProps> & {
    children?: ReactNode;
    /**
     * children 엘리먼트에 버튼 스타일·props를 병합해 렌더한다(예: <Link>). Ark factory가 처리.
     * ⚠️ asChild 자식 className에는 배치(margin/flex 등)만 — 시각 스타일은 감싸는 컴포넌트
     * (Button 등)의 variant prop으로 지정한다. 자식이 recipe 관리 속성을 덮으면(=footgun) 규칙 위반이다.
     */
    asChild?: boolean;
  };

/** 모든 클릭 가능한 엘리먼트의 토대 — 리셋 + 인터랙션만. 버튼처럼 보여야 하면 Button을 쓴다. */
export function BaseButton({ asChild, className, children, type, ...rest }: BaseButtonProps) {
  const [variantProps, htmlProps] = splitVariantProps(baseButton, rest);
  return (
    <ark.button
      asChild={asChild}
      // asChild로 <a>/<Link>가 되면 type="button"은 부적절하므로 네이티브 button일 때만 준다
      type={asChild ? undefined : (type ?? 'button')}
      data-base-button=""
      {...htmlProps}
      className={cx(baseButton(variantProps), className)}
    >
      {children}
    </ark.button>
  );
}

export type { BaseButtonProps };
