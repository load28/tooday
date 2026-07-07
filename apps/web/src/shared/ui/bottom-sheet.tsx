import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import type { ReactNode } from 'react';
import { sheetBackdrop, sheetHandle, sheetPositioner, sheetSurface } from 'styled-system/recipes';
import { Stack } from '@/shared/ui/stack';
import { Text } from '@/shared/ui/text';

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
        <Dialog.Backdrop className={sheetBackdrop()} />
        <Dialog.Positioner className={sheetPositioner()}>
          <Dialog.Content className={sheetSurface()} aria-label={ariaLabel}>
            <div className={sheetHandle()} aria-hidden="true" />
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
