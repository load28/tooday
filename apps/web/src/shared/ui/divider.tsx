import * as stylex from '@stylexjs/stylex';
import type { SlotSx } from '@/styles/sx';
import { color, space } from '@/styles/tokens.stylex';

const base = stylex.create({
  root: { borderStyle: 'none', borderWidth: 0, backgroundColor: color.divider, flexShrink: 0 },
});

const orientations = stylex.create({
  horizontal: { width: '100%', height: '1px' },
  vertical: { height: 'auto', alignSelf: 'stretch', width: '1px' },
});

const tones = stylex.create({
  subtle: { backgroundColor: color.divider },
  strong: { backgroundColor: color.border },
});

const insets = stylex.create({
  none: { marginInline: 0 },
  content: { marginInline: space.pageX },
  leading: { marginInlineStart: space.dividerLeadingInset },
});

type DividerProps = {
  orientation?: keyof typeof orientations;
  tone?: keyof typeof tones;
  inset?: keyof typeof insets;
  sx?: SlotSx;
};

export function Divider({ orientation = 'horizontal', tone = 'subtle', inset = 'none', sx }: DividerProps) {
  return (
    <hr aria-orientation={orientation} {...stylex.props(base.root, orientations[orientation], tones[tone], insets[inset], sx)} />
  );
}
