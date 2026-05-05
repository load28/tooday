import { type ReactNode, useEffect } from 'react';
import { css, cx } from 'styled-system/css';
import { Stack } from './stack';
import { Text } from './text';

const wrapCls = css({
  position: 'absolute',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
});

const backdropCls = css({
  position: 'absolute',
  inset: 0,
  background: 'overlay',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  animation: 'toodayFadeIn {durations.base} {easings.standard}',
});

const sheetCls = css({
  position: 'relative',
  width: '100%',
  bg: 'surface',
  borderTopLeftRadius: '3xl',
  borderTopRightRadius: '3xl',
  paddingTop: '2.5',
  paddingX: '5',
  paddingBottom: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
  boxShadow: 'sheet',
  animation: 'toodaySlideUp {durations.slow} {easings.standard}',
  maxHeight: '85%',
  overflowY: 'auto',
});

const handleCls = css({
  width: 'handle',
  height: '1',
  borderRadius: 'pill',
  bg: 'borderStrong',
  alignSelf: 'center',
  marginBottom: '1',
  flex: '0 0 auto',
});

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  ariaLabel?: string;
};

export function BottomSheet({ open, onClose, title, description, children, ariaLabel }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const labelText = ariaLabel ?? (typeof title === 'string' ? title : undefined);

  return (
    <div className={wrapCls}>
      <button type="button" className={backdropCls} aria-label="닫기" onClick={onClose} />
      <div className={sheetCls} role="dialog" aria-modal="true" aria-label={labelText}>
        <div className={handleCls} aria-hidden="true" />
        {title != null || description != null ? (
          <Stack gap="1">
            {typeof title === 'string' ? <Text variant="title">{title}</Text> : title}
            {typeof description === 'string' ? (
              <Text variant="bodySm" tone="tertiary">
                {description}
              </Text>
            ) : (
              description
            )}
          </Stack>
        ) : null}
        <div className={cx(css({ display: 'flex', flexDirection: 'column', gap: '3' }))}>{children}</div>
      </div>
    </div>
  );
}
