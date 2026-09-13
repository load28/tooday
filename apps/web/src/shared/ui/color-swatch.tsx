import { ToggleGroup } from '@ark-ui/react/toggle-group';
import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { BaseButton, type BaseButtonProps } from '@/shared/ui/base-button';
import { swatch } from '@/styles/slots.stylex';
import type { FlexSx } from '@/styles/sx';
import { anim, color, radii, size as sizeVars, space } from '@/styles/tokens.stylex';

// 팔레트 색 단일 선택 그룹 — 상태·접근성은 Ark ToggleGroup, 클릭 엘리먼트는
// BaseButton(asChild), 스와치 고유 스타일(치수·색)은 BaseButton 뒤에 병합한다
// (docs/conventions/ui-composition.md).

const ON = ':is([data-state="on"])';

const styles = stylex.create({
  root: { display: 'flex', flexWrap: 'wrap', gap: space.md },
  item: {
    width: sizeVars.tap,
    height: sizeVars.tap,
    borderRadius: radii.full,
    // 배경·선택 링이 같은 색을 공유하도록 tone은 변수 하나만 바꾼다
    backgroundColor: swatch.color,
    color: color.textInverse,
    transitionProperty: 'transform, box-shadow',
    transitionDuration: anim.durationFast,
    transitionTimingFunction: anim.easingStandard,
    boxShadow: { default: null, [ON]: `0 0 0 2px ${color.surface}, 0 0 0 4px ${swatch.color}` },
    transform: { default: null, [ON]: 'scale(1.04)' },
    // 자손(Indicator)에게 선택 상태를 변수로 전달한다
    [swatch.indicatorOpacity]: { default: '0', [ON]: '1' },
  },
  // 선택된 아이템에서만 드러나는 표시 슬롯 — 상태는 aria-pressed가 전달하므로 시각 전용이다
  indicator: {
    display: 'inline-flex',
    opacity: swatch.indicatorOpacity,
    transitionProperty: 'opacity',
    transitionDuration: anim.durationFast,
    transitionTimingFunction: anim.easingStandard,
  },
});

// 팔레트 accent 색(도메인 무관) — Dot의 accent tone·프로젝트 색 이름과 1:1로 일치한다
const tones = stylex.create({
  blue: { [swatch.color]: color.brand500 },
  mint: { [swatch.color]: color.mint500 },
  violet: { [swatch.color]: color.violet500 },
  amber: { [swatch.color]: color.amber500 },
  pink: { [swatch.color]: color.rose500 },
  gray: { [swatch.color]: color.cool500 },
});

type SwatchTone = keyof typeof tones;

type ColorSwatchGroupProps<V extends string> = {
  value: V | null;
  onValueChange: (value: V) => void;
  sx?: FlexSx;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
};

function ColorSwatchGroupRoot<V extends string>({
  value,
  onValueChange,
  sx,
  className,
  children,
  ...rest
}: ColorSwatchGroupProps<V>) {
  const { className: sxClassName, style } = stylex.props(styles.root, sx);
  return (
    <ToggleGroup.Root
      value={value === null ? [] : [value]}
      onValueChange={(details) => {
        // 단일 선택 그룹 — 선택된 칩을 다시 눌러 빈 상태가 되는 것은 무시한다
        const next = details.value[0] as V | undefined;
        if (next !== undefined) onValueChange(next);
      }}
      className={className ? `${sxClassName} ${className}` : sxClassName}
      style={style}
      {...rest}
    >
      {children}
    </ToggleGroup.Root>
  );
}

type ColorSwatchItemProps = {
  value: string;
  tone?: SwatchTone;
} & Omit<BaseButtonProps, 'asChild' | 'value'>;

function ColorSwatchItem({ value, tone = 'gray', sx, children, ...rest }: ColorSwatchItemProps) {
  return (
    <ToggleGroup.Item value={value} asChild>
      <BaseButton {...rest} sx={[styles.item, tones[tone], sx]}>
        {children}
      </BaseButton>
    </ToggleGroup.Item>
  );
}

function ColorSwatchIndicator({ sx, children }: { sx?: FlexSx; children?: ReactNode }) {
  return (
    <span aria-hidden="true" {...stylex.props(styles.indicator, sx)}>
      {children}
    </span>
  );
}

/**
 * 팔레트 색을 고르는 원형 스와치 버튼 그룹 — tone은 Dot의 accent 색 이름과 1:1.
 *
 * ```tsx
 * <ColorSwatchGroup value={color} onValueChange={setColor} aria-label="색상">
 *   <ColorSwatchGroup.Item value="blue" tone="blue" aria-label="파랑">
 *     <ColorSwatchGroup.Indicator><Check /></ColorSwatchGroup.Indicator>
 *   </ColorSwatchGroup.Item>
 * </ColorSwatchGroup>
 * ```
 */
export const ColorSwatchGroup = Object.assign(ColorSwatchGroupRoot, {
  Item: ColorSwatchItem,
  Indicator: ColorSwatchIndicator,
});
