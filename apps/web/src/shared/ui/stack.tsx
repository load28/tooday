import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import type { FlexSx } from '@/styles/sx';
import { size as sizeVars, space } from '@/styles/tokens.stylex';

const base = stylex.create({
  root: { display: 'flex', minWidth: 0 },
  inline: { display: 'inline-flex' },
  column: { flexDirection: 'column' },
  row: { flexDirection: 'row' },
  wrap: { flexWrap: 'wrap' },
  nowrap: { flexWrap: 'nowrap' },
});

const gaps = stylex.create({
  '0': { gap: 0 },
  '2xs': { gap: space['2xs'] },
  xs: { gap: space.xs },
  sm: { gap: space.sm },
  md: { gap: space.md },
  lg: { gap: space.lg },
  xl: { gap: space.xl },
  '2xl': { gap: space['2xl'] },
  '3xl': { gap: space['3xl'] },
  '4xl': { gap: space['4xl'] },
});

const aligns = stylex.create({
  start: { alignItems: 'flex-start' },
  center: { alignItems: 'center' },
  end: { alignItems: 'flex-end' },
  stretch: { alignItems: 'stretch' },
  baseline: { alignItems: 'baseline' },
});

const justifies = stylex.create({
  start: { justifyContent: 'flex-start' },
  center: { justifyContent: 'center' },
  end: { justifyContent: 'flex-end' },
  between: { justifyContent: 'space-between' },
  around: { justifyContent: 'space-around' },
  evenly: { justifyContent: 'space-evenly' },
});

const spacers = stylex.create({
  root: { flexShrink: 0, alignSelf: 'stretch' },
  // auto=남는 공간 채움, 나머지는 스페이싱 스케일 고정 크기(sizes 토큰 = 스페이싱 스케일 포함)
  auto: { flexGrow: 1, flexBasis: 0 },
  '2xs': { flexGrow: 0, flexBasis: sizeVars['2xs'] },
  xs: { flexGrow: 0, flexBasis: sizeVars.xs },
  sm: { flexGrow: 0, flexBasis: sizeVars.sm },
  md: { flexGrow: 0, flexBasis: sizeVars.md },
  lg: { flexGrow: 0, flexBasis: sizeVars.lg },
  xl: { flexGrow: 0, flexBasis: sizeVars.xl },
  '2xl': { flexGrow: 0, flexBasis: sizeVars['2xl'] },
  '3xl': { flexGrow: 0, flexBasis: sizeVars['3xl'] },
  '4xl': { flexGrow: 0, flexBasis: sizeVars['4xl'] },
});

type AlignToken = keyof typeof aligns;
type JustifyToken = keyof typeof justifies;
type GapToken = keyof typeof gaps;

type StackBase = {
  gap?: GapToken;
  align?: AlignToken;
  justify?: JustifyToken;
  wrap?: boolean;
  inline?: boolean;
  sx?: FlexSx;
  children?: ReactNode;
};

type StackProps<T extends ElementType> = StackBase & { as?: T } & Omit<
    ComponentPropsWithoutRef<T>,
    keyof StackBase | 'as' | 'className'
  >;

// alignItems 충돌을 피하려 direction은 flexDirection만, alignItems는 align variant만 맡는다.
function stackProps(
  direction: 'row' | 'column',
  { gap, align, justify, wrap, inline, sx }: Required<Pick<StackBase, 'gap' | 'align' | 'justify'>> & StackBase,
) {
  return stylex.props(
    base.root,
    inline ? base.inline : null,
    base[direction],
    gaps[gap],
    aligns[align],
    justifies[justify],
    wrap ? base.wrap : base.nowrap,
    sx,
  );
}

export function Stack<T extends ElementType = 'div'>(props: StackProps<T>) {
  const { as, gap = 'xl', align, justify, wrap, inline, sx, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  const { className: sxClassName, style } = stackProps('column', {
    gap,
    align: align ?? 'stretch',
    justify: justify ?? 'start',
    wrap,
    inline,
    sx,
  });
  return (
    <Tag {...rest} className={sxClassName} style={style}>
      {children}
    </Tag>
  );
}

export function HStack<T extends ElementType = 'div'>(props: StackProps<T>) {
  const { as, gap = 'md', align, justify, wrap, inline, sx, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  const { className: sxClassName, style } = stackProps('row', {
    gap,
    align: align ?? 'center',
    justify: justify ?? 'start',
    wrap,
    inline,
    sx,
  });
  return (
    <Tag {...rest} className={sxClassName} style={style}>
      {children}
    </Tag>
  );
}

type SpacerSize = Exclude<keyof typeof spacers, 'root'>;

export function Spacer({ size = 'auto' }: { size?: SpacerSize }) {
  return <span aria-hidden="true" {...stylex.props(spacers.root, spacers[size])} />;
}
