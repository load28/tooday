import { type MouseEvent, type ReactNode, useId } from 'react';
import { css, cx } from 'styled-system/css';
import { Pressable, type PressableProps } from '@/shared/ui/pressable';
import { Spinner } from '@/shared/ui/spinner';

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

type ButtonProps = PressableProps & {
  /** 로딩 상태. 클릭·제출이 차단되고 라벨 자리에 스피너가 표시된다. 포커스는 유지된다. */
  loading?: boolean;
  /** 로딩 중 스피너 옆에 보여줄 텍스트. 없으면 스피너만 라벨 자리를 덮는다. */
  loadingText?: ReactNode;
  /** 기본 스피너를 교체한다. */
  spinner?: ReactNode;
};

export function Button({ loading, loadingText, spinner, className, children, onClick, ...rest }: ButtonProps) {
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
    <Pressable
      data-loading={isLoading || undefined}
      aria-disabled={isLoading || undefined}
      aria-labelledby={isLoading ? `${labelId} ${loadingLabelId}` : undefined}
      {...rest}
      onClick={handleClick}
      className={cx(isLoading && loadingCursorCls, className)}
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
    </Pressable>
  );
}
