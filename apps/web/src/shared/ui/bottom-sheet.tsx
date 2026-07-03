import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import type { ReactNode } from 'react';
import { css } from 'styled-system/css';
import { Stack } from '@/shared/ui/stack';
import { Text } from '@/shared/ui/text';

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
  paddingTop: 'sheetHandleTop',
  paddingX: 'sheetPadX',
  paddingBottom: 'sheetPadBottom',
  display: 'flex',
  flexDirection: 'column',
  gap: 'sheetGap',
  boxShadow: 'sheet',
  animation: 'toodaySlideUp {durations.slow} {easings.standard}',
  maxHeight: '85%',
  overflowY: 'auto',
});

const handleCls = css({
  width: 'handle',
  height: 'xs',
  borderRadius: 'pill',
  bg: 'borderStrong',
  alignSelf: 'center',
  marginBottom: 'xs',
  flex: '0 0 auto',
});

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children?: ReactNode;
};

type BottomSheetSlotProps = {
  children?: ReactNode;
  className?: string;
};

function BottomSheetRoot({ open, onClose, ariaLabel, children }: BottomSheetProps) {
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
          <Dialog.Content className={sheetCls} aria-label={ariaLabel}>
            <div className={handleCls} aria-hidden="true" />
            {children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function BottomSheetHeader({ children, className }: BottomSheetSlotProps) {
  return (
    <Stack gap="xs" className={className}>
      {children}
    </Stack>
  );
}

function BottomSheetTitle({ children, className }: BottomSheetSlotProps) {
  return (
    <Dialog.Title asChild>
      <Text as="h2" variant="title" className={className}>
        {children}
      </Text>
    </Dialog.Title>
  );
}

function BottomSheetDescription({ children, className }: BottomSheetSlotProps) {
  return (
    <Dialog.Description asChild>
      <Text as="p" variant="bodySm" tone="tertiary" className={className}>
        {children}
      </Text>
    </Dialog.Description>
  );
}

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Header: BottomSheetHeader,
  Title: BottomSheetTitle,
  Description: BottomSheetDescription,
});
