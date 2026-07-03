import { cva, cx } from 'styled-system/css';

const dividerRecipe = cva({
  base: {
    border: 'none',
    background: 'divider',
    flexShrink: 0,
  },
  variants: {
    orientation: {
      horizontal: { width: '100%', height: '1px' },
      vertical: { height: 'auto', alignSelf: 'stretch', width: '1px' },
    },
    tone: {
      subtle: { background: 'divider' },
      strong: { background: 'border' },
    },
    inset: {
      none: { marginInline: '0' },
      content: { marginInline: 'pageX' },
      leading: { marginInlineStart: 'dividerLeadingInset' },
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
    tone: 'subtle',
    inset: 'none',
  },
});

type DividerVariants = NonNullable<Parameters<typeof dividerRecipe>[0]>;

type DividerProps = DividerVariants & {
  className?: string;
};

export function Divider({ orientation, tone, inset, className }: DividerProps) {
  return (
    <hr aria-orientation={orientation ?? 'horizontal'} className={cx(dividerRecipe({ orientation, tone, inset }), className)} />
  );
}
