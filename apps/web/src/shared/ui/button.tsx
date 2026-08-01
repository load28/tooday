import { type HTMLMotionProps, motion } from 'framer-motion';
import { type MouseEvent, type ReactNode, useId } from 'react';
import { useT } from '@/shared/i18n';
import { BaseButton, type BaseButtonProps } from '@/shared/ui/base-button';
import { baseButton } from '@/shared/ui/base-button.css';
import {
  type ButtonVariantProps,
  buttonStyle,
  loadingCursorCls,
  loadingHiddenCls,
  loadingLayerCls,
  loadingStackCls,
  srOnlyCls,
} from '@/shared/ui/button.css';
import { Spinner } from '@/shared/ui/spinner';
import { cx } from '@/styles/cx';
import { splitVariantProps } from '@/styles/split';

// TDS식 press — 눌렀다 뗄 때 살짝 튕기는 스프링(물리). 축소는 Button(진짜 버튼)에만, 리스트/카드엔 안 준다.
const PRESS_SPRING = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const;
const PRESS_SCALE = 0.97;

type ButtonProps = BaseButtonProps &
  ButtonVariantProps & {
    /** 로딩 상태. 클릭·제출이 차단되고 라벨 자리에 스피너가 표시된다. 포커스는 유지된다. */
    loading?: boolean;
    /** 로딩 중 스피너 옆에 보여줄 텍스트. 없으면 스피너만 라벨 자리를 덮는다. */
    loadingText?: ReactNode;
    /** 기본 스피너를 교체한다. */
    spinner?: ReactNode;
  };

export function Button({ loading, loadingText, spinner, className, children, onClick, asChild, type, ...rest }: ButtonProps) {
  const t = useT();
  const [variantProps, baseProps] = splitVariantProps(buttonStyle, rest);
  const labelId = useId();
  const loadingLabelId = useId();
  const isLoading = Boolean(loading);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  const content = isLoading ? (
    <span className={loadingStackCls}>
      <span id={labelId} className={cx(loadingLayerCls, loadingHiddenCls)}>
        {children}
      </span>
      <span className={loadingLayerCls}>
        <span id={loadingLabelId} className={srOnlyCls}>
          {t.common.loading}
        </span>
        {spinner ?? <Spinner aria-hidden />}
        {loadingText}
      </span>
    </span>
  ) : (
    children
  );

  const shared = {
    'data-loading': isLoading || undefined,
    'aria-disabled': isLoading || undefined,
    'aria-labelledby': isLoading ? `${labelId} ${loadingLabelId}` : undefined,
    onClick: handleClick,
    className: cx(buttonStyle(variantProps), isLoading && loadingCursorCls, className),
  } as const;

  // asChild(<Link> 등)는 Ark BaseButton으로 — 링크엔 tap 축소가 부적절하므로 모션 없이 둔다.
  if (asChild) {
    return (
      <BaseButton asChild {...baseProps} {...shared}>
        {content}
      </BaseButton>
    );
  }

  // 일반 버튼 — Framer Motion으로 tap 시 spring 축소(TDS 방식). baseButton 리셋 클래스를 함께 얹고,
  // 색·hover/press 틴트는 CSS(:active/_hover)가 그대로 담당한다.
  return (
    <motion.button
      type={type ?? 'button'}
      data-base-button=""
      whileTap={isLoading ? undefined : { scale: PRESS_SCALE }}
      transition={PRESS_SPRING}
      {...(baseProps as unknown as HTMLMotionProps<'button'>)}
      {...shared}
      className={cx(baseButton(), shared.className)}
    >
      {content}
    </motion.button>
  );
}

export type { ButtonProps };
