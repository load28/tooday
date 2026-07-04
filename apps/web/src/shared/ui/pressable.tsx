import { type ComponentPropsWithoutRef, type MouseEvent, type ReactNode, useId } from 'react';
import { css, cva, cx } from 'styled-system/css';
import { Spinner } from '@/shared/ui/spinner';

const pressableRecipe = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'md',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'text',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'left',
    minWidth: 0,
    transition:
      'background-color {durations.fast} {easings.exit}, transform {durations.fast} {easings.exit}, color {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
    _disabled: {
      cursor: 'not-allowed',
      opacity: 0.5,
    },
    _focusVisible: {
      outline: 'none',
      boxShadow: 'focus',
    },
  },
  variants: {
    tone: {
      ghost: {
        color: 'text',
        _press: { bg: 'pressedStrong' },
      },
      subtle: {
        bg: 'surfaceMuted',
        color: 'textSecondary',
        _press: { bg: 'surfaceSoft' },
      },
      brand: {
        bg: 'primary',
        color: 'onPrimary',
        _press: { bg: 'primaryPressed' },
      },
      brandSoft: {
        bg: 'primarySoft',
        color: 'primary',
        _press: { bg: 'primarySofter' },
      },
      danger: {
        bg: 'danger',
        color: 'textInverse',
        _press: { bg: 'dangerPressed' },
      },
      dangerSoft: {
        bg: 'dangerSoft',
        color: 'danger',
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
    pressed: {
      true: { transform: 'scale(0.96)' },
    },
    loading: {
      true: { cursor: 'wait' },
    },
  },
  defaultVariants: {
    tone: 'ghost',
    shape: 'rounded',
    size: 'md',
  },
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
const srOnlyCls = css({ srOnly: true });

type PressableVariants = NonNullable<Parameters<typeof pressableRecipe>[0]>;

type PressableProps = PressableVariants &
  Omit<ComponentPropsWithoutRef<'button'>, keyof PressableVariants> & {
    children?: ReactNode;
    /** 로딩 상태. 클릭·제출이 차단되고 라벨 자리에 스피너가 표시된다. 포커스는 유지된다. */
    loading?: boolean;
    /** 로딩 중 스피너 옆에 보여줄 텍스트. 없으면 스피너만 라벨 자리를 덮는다. */
    loadingText?: ReactNode;
    /** 기본 스피너를 교체한다. */
    spinner?: ReactNode;
  };

export function Pressable({
  tone,
  shape,
  size,
  pressed,
  loading,
  loadingText,
  spinner,
  className,
  children,
  type,
  onClick,
  ...rest
}: PressableProps) {
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
    <button
      type={type ?? 'button'}
      data-pressable=""
      data-loading={isLoading || undefined}
      aria-disabled={isLoading || undefined}
      aria-labelledby={isLoading ? `${labelId} ${loadingLabelId}` : undefined}
      {...rest}
      onClick={handleClick}
      className={cx(pressableRecipe({ tone, shape, size, pressed, loading: isLoading }), className)}
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
    </button>
  );
}
