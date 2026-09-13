import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { Stack } from '@/shared/ui/stack';
import { Text } from '@/shared/ui/text';
import type { FlexSx, TextSx } from '@/styles/sx';
import { anim, color, layer, radii, shadow, size as sizeVars, space } from '@/styles/tokens.stylex';

const styles = stylex.create({
  positioner: {
    position: 'fixed',
    inset: 0,
    zIndex: layer.overlay,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: layer.overlay,
    backgroundColor: color.overlay,
    animationName: 'toodayFadeIn',
    animationDuration: anim.durationBase,
    animationTimingFunction: anim.easingStandard,
  },
  surface: {
    position: 'relative',
    width: '100%',
    backgroundColor: color.surface,
    borderTopLeftRadius: radii['3xl'],
    borderTopRightRadius: radii['3xl'],
    paddingTop: space.sheetHandleTop,
    paddingInline: space.sheetPadX,
    paddingBottom: space.sheetPadBottom,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sheetGap,
    boxShadow: shadow.sheet,
    animationName: 'toodaySlideUp',
    animationDuration: anim.durationSlow,
    animationTimingFunction: anim.easingStandard,
    maxHeight: '85%',
    overflowY: 'auto',
  },
  handle: {
    width: sizeVars.handle,
    height: sizeVars.xs,
    borderRadius: radii.pill,
    backgroundColor: color.borderStrong,
    alignSelf: 'center',
    marginBottom: space.xs,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  },
});

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children?: ReactNode;
};

type BottomSheetSlotProps<Sx> = {
  children?: ReactNode;
  sx?: Sx;
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
        <Dialog.Backdrop {...stylex.props(styles.backdrop)} />
        <Dialog.Positioner {...stylex.props(styles.positioner)}>
          <Dialog.Content {...stylex.props(styles.surface)} aria-label={ariaLabel}>
            <div {...stylex.props(styles.handle)} aria-hidden="true" />
            {children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function BottomSheetHeader({ children, sx }: BottomSheetSlotProps<FlexSx>) {
  return (
    <Stack gap="xs" sx={sx}>
      {children}
    </Stack>
  );
}

function BottomSheetTitle({ children, sx }: BottomSheetSlotProps<TextSx>) {
  return (
    <Dialog.Title asChild>
      <Text as="h2" variant="title" sx={sx}>
        {children}
      </Text>
    </Dialog.Title>
  );
}

function BottomSheetDescription({ children, sx }: BottomSheetSlotProps<TextSx>) {
  return (
    <Dialog.Description asChild>
      <Text as="p" variant="bodySm" tone="tertiary" sx={sx}>
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
