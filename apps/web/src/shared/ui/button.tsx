import { type HTMLMotionProps, motion } from 'framer-motion';
import { type MouseEvent, type ReactNode, useId } from 'react';
import { css, cva, cx, type RecipeVariantProps } from 'styled-system/css';
import { baseButton } from 'styled-system/recipes';
import { useT } from '@/shared/i18n';
import { BaseButton, type BaseButtonProps } from '@/shared/ui/base-button';
import { Spinner } from '@/shared/ui/spinner';

// TDS식 press — 눌렀다 뗄 때 살짝 튕기는 스프링(물리). 축소는 Button(진짜 버튼)에만, 리스트/카드엔 안 준다.
const PRESS_SPRING = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const;
const PRESS_SCALE = 0.97;

// 버튼 룩(tone/shape/size)은 베이스가 아니라 여기 산다 — cva(utilities)라 baseButton(recipes 층)을 결정적으로 덮는다.
const buttonStyle = cva({
  base: {
    gap: 'md',
    // 비활성 = tone 무관 중립 채움으로 collapse (활성색을 opacity로 흐리지 않는다). 테두리 없이 채움만 쓴다.
    // cva(utilities)라 baseButton(recipes)의 &:disabled opacity를 결정적으로 덮는다 — opacity는 1로 되돌린다.
    '&:disabled': { opacity: 1, bg: 'disabledSurface', color: 'disabledText' },
  },
  variants: {
    // hover와 press는 같은 색을 쓰고(TDS식), press가 축소를 더한다. hover는 포인터 기기에서만(_hover 조건).
    tone: {
      // 채움 없는 tone은 비활성에도 배경 없이 텍스트만 저강조로 둔다. 중립이라 hover/press 2단.
      ghost: { color: 'text', _hover: { bg: 'stateHover' }, _press: { bg: 'statePressed' }, '&:disabled': { bg: 'transparent' } },
      // 텍스트 링크 룩 — asChild <Link>에 브랜드 색 + 인터랙션 계약을 입힐 때 쓴다.
      brandGhost: {
        color: 'textBrand',
        _hover: { bg: 'primarySofter' },
        _press: { bg: 'primarySofter' },
        '&:disabled': { bg: 'transparent' },
      },
      // _on = ToggleGroup.Item asChild로 꽂혔을 때의 선택 룩. 다른 tone도 토글로 쓰이면 _on을 추가한다.
      subtle: {
        bg: 'surfaceMuted',
        color: 'textSecondary',
        _hover: { bg: 'surfaceSoft' },
        _press: { bg: 'surfaceSoft' },
        _on: { bg: 'primary', color: 'onPrimary', _hover: { bg: 'primaryPressed' }, _press: { bg: 'primaryPressed' } },
      },
      brand: { bg: 'primary', color: 'onPrimary', _hover: { bg: 'primaryPressed' }, _press: { bg: 'primaryPressed' } },
      brandSoft: { bg: 'primarySoft', color: 'primary', _hover: { bg: 'primarySofter' }, _press: { bg: 'primarySofter' } },
      danger: { bg: 'danger', color: 'textInverse', _hover: { bg: 'dangerPressed' }, _press: { bg: 'dangerPressed' } },
      dangerSoft: {
        bg: 'dangerSoft',
        color: 'danger',
        _hover: { bg: 'dangerSoft', filter: 'brightness(0.96)' },
        _press: { bg: 'dangerSoft', filter: 'brightness(0.96)' },
      },
    },
    shape: {
      square: { borderRadius: 'md' },
      rounded: { borderRadius: 'lg' },
      pill: { borderRadius: 'pill' },
      circle: { borderRadius: 'full', aspectRatio: '1 / 1' },
    },
    size: {
      sm: { height: 'controlSm', paddingX: 'xl', textStyle: 'bodySm' },
      md: { height: 'tap', paddingX: '2xl', textStyle: 'body' },
      lg: { height: 'tapLg', paddingX: '3xl', textStyle: 'bodyLg' },
      xl: { height: 'tapXl', paddingX: '3xl', textStyle: 'bodyLgStrong' },
      icon: { height: 'tap', width: 'tap', paddingX: '0' },
      iconLg: { height: 'tapLg', width: 'tapLg', paddingX: '0' },
    },
    fullWidth: {
      true: { width: '100%' },
    },
  },
  defaultVariants: { tone: 'ghost', shape: 'rounded', size: 'md' },
});

// 라벨과 스피너를 같은 grid 셀에 겹쳐 어느 쪽이 크든 버튼 너비가 변하지 않는다.
const loadingStackCls = css({ display: 'inline-grid', placeItems: 'center', minWidth: 0 });
const loadingLayerCls = css({
  gridArea: '1 / 1',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'md',
  minWidth: 0,
});
// visibility/display로 숨기면 접근성 트리에서 빠지므로 opacity로 숨긴다.
const loadingHiddenCls = css({ opacity: 0 });
const loadingCursorCls = css({ cursor: 'wait' });
const srOnlyCls = css({ srOnly: true });

type ButtonProps = BaseButtonProps &
  RecipeVariantProps<typeof buttonStyle> & {
    /** 로딩 상태. 클릭·제출이 차단되고 라벨 자리에 스피너가 표시된다. 포커스는 유지된다. */
    loading?: boolean;
    /** 로딩 중 스피너 옆에 보여줄 텍스트. 없으면 스피너만 라벨 자리를 덮는다. */
    loadingText?: ReactNode;
    /** 기본 스피너를 교체한다. */
    spinner?: ReactNode;
  };

export function Button({ loading, loadingText, spinner, className, children, onClick, asChild, type, ...rest }: ButtonProps) {
  const t = useT();
  const [variantProps, baseProps] = buttonStyle.splitVariantProps(rest);
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
