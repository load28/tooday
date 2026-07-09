import { type MouseEvent, type ReactNode, useId } from 'react';
import { css, cva, cx, type RecipeVariantProps } from 'styled-system/css';
import { BaseButton, type BaseButtonProps } from '@/shared/ui/base-button';
import { Spinner } from '@/shared/ui/spinner';

// 버튼 룩(tone/shape/size)은 베이스가 아니라 여기 산다 — cva(utilities)라 baseButton(recipes 층)을 결정적으로 덮는다.
const buttonStyle = cva({
  base: { gap: 'md' },
  variants: {
    tone: {
      ghost: { color: 'text', _press: { bg: 'pressedStrong' } },
      // 텍스트 링크 룩 — asChild <Link>에 브랜드 색 + 인터랙션 계약을 입힐 때 쓴다.
      brandGhost: { color: 'textBrand', _press: { bg: 'primarySofter' } },
      // _on = ToggleGroup.Item asChild로 꽂혔을 때의 선택 룩. 다른 tone도 토글로 쓰이면 _on을 추가한다.
      subtle: {
        bg: 'surfaceMuted',
        color: 'textSecondary',
        _press: { bg: 'surfaceSoft' },
        _on: { bg: 'primary', color: 'onPrimary', _press: { bg: 'primaryPressed' } },
      },
      brand: { bg: 'primary', color: 'onPrimary', _press: { bg: 'primaryPressed' } },
      brandSoft: { bg: 'primarySoft', color: 'primary', _press: { bg: 'primarySofter' } },
      danger: { bg: 'danger', color: 'textInverse', _press: { bg: 'dangerPressed' } },
      dangerSoft: { bg: 'dangerSoft', color: 'danger', _press: { bg: 'dangerSoft', filter: 'brightness(0.96)' } },
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

export function Button({ loading, loadingText, spinner, className, children, onClick, ...rest }: ButtonProps) {
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

  return (
    <BaseButton
      data-loading={isLoading || undefined}
      aria-disabled={isLoading || undefined}
      aria-labelledby={isLoading ? `${labelId} ${loadingLabelId}` : undefined}
      {...baseProps}
      onClick={handleClick}
      className={cx(buttonStyle(variantProps), isLoading && loadingCursorCls, className)}
    >
      {isLoading ? (
        <span className={loadingStackCls}>
          <span id={labelId} className={cx(loadingLayerCls, loadingHiddenCls)}>
            {children}
          </span>
          <span className={loadingLayerCls}>
            <span id={loadingLabelId} className={srOnlyCls}>
              로딩 중
            </span>
            {spinner ?? <Spinner aria-hidden />}
            {loadingText}
          </span>
        </span>
      ) : (
        children
      )}
    </BaseButton>
  );
}

export type { ButtonProps };
