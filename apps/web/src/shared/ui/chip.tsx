import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { text } from '@/styles/text.styles';
import { color, radii, space } from '@/styles/tokens.stylex';

const base = stylex.create({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    paddingInline: space.md,
    paddingBlock: space['2xs'],
    borderRadius: radii.pill,
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
});

const tones = stylex.create({
  neutral: { backgroundColor: color.surfaceSoft, color: color.textSecondary },
  brand: { backgroundColor: color.primarySoft, color: color.primary },
  success: { backgroundColor: color.successSoft, color: color.success },
  warning: { backgroundColor: color.warningSoft, color: color.warning },
  danger: { backgroundColor: color.dangerSoft, color: color.danger },
  outline: {
    backgroundColor: 'transparent',
    color: color.textSecondary,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
  },
});

const sizes = stylex.create({
  sm: { paddingBlock: 0 },
  md: {},
  lg: { paddingBlock: space.xs, paddingInline: space.xl },
});

const SIZE_TEXT = { sm: text.micro, md: text.caption, lg: text.bodySm } as const;

type ChipProps = {
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  leading?: ReactNode;
  trailing?: ReactNode;
  sx?: stylex.StyleXStyles;
  className?: string;
  children?: ReactNode;
};

export function Chip({ tone = 'neutral', size = 'md', leading, trailing, sx, className, children }: ChipProps) {
  const { className: sxClassName, style } = stylex.props(base.root, text.caption, tones[tone], SIZE_TEXT[size], sizes[size], sx);
  return (
    <span className={className ? `${sxClassName} ${className}` : sxClassName} style={style}>
      {leading}
      {children}
      {trailing}
    </span>
  );
}
