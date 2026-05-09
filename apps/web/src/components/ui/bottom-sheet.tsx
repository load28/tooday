import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import type { ReactNode } from 'react';
import { css } from 'styled-system/css';
import { Stack } from './stack';
import { Text } from './text';

const positionerCls = css({
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
});

const backdropCls = css({
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  background: 'overlay',
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

const contentBodyCls = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
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
  const contentAriaLabel = typeof title === 'string' ? undefined : ariaLabel;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop className={backdropCls} />
        <Dialog.Positioner className={positionerCls}>
          <Dialog.Content className={sheetCls} aria-label={contentAriaLabel}>
            <div className={handleCls} aria-hidden="true" />
            {title != null || description != null ? (
              <Stack gap="1">
                {typeof title === 'string' ? (
                  <Dialog.Title asChild>
                    <Text as="h2" variant="title">
                      {title}
                    </Text>
                  </Dialog.Title>
                ) : (
                  title
                )}
                {typeof description === 'string' ? (
                  <Dialog.Description asChild>
                    <Text as="p" variant="bodySm" tone="tertiary">
                      {description}
                    </Text>
                  </Dialog.Description>
                ) : (
                  description
                )}
              </Stack>
            ) : null}
            <div className={contentBodyCls}>{children}</div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
