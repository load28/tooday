import { ToggleGroup } from '@ark-ui/react/toggle-group';
import type { ReactNode } from 'react';
import { css, cva, cx, type RecipeVariantProps } from 'styled-system/css';
import { Pressable, type PressableProps } from '@/shared/ui/pressable';

// 팔레트 색 단일 선택 그룹 — 구성은 디자인 시스템 관례(Park UI 등)를 따른다:
//   상태·접근성(aria-pressed, 방향키 roving focus)은 Ark ToggleGroup이 맡고,
//   클릭 엘리먼트는 베이스 버튼(Pressable)을 asChild로 재사용하며,
//   슬롯 오버레이는 cva(utilities)로 얹는다 — pressable이 config recipe(@layer recipes)인
//   이유가 바로 이 슬롯 override를 결정적으로 만들기 위해서다 (docs/conventions/ui-styling.md).

const rootCls = css({ display: 'flex', flexWrap: 'wrap', gap: 'md' });

const swatchItem = cva({
  base: {
    // 배경·선택 링이 같은 색을 공유하도록 tone은 CSS 변수 하나만 바꾼다
    background: 'var(--swatch-color)',
    color: 'textInverse',
    transition: 'transform {durations.fast} {easings.standard}, box-shadow {durations.fast} {easings.standard}',
    '&[data-state="on"]': {
      boxShadow: '0 0 0 2px {colors.surface}, 0 0 0 4px var(--swatch-color)',
      transform: 'scale(1.04)',
    },
  },
  variants: {
    // 팔레트 accent 색(도메인 무관) — Dot의 accent tone·프로젝트 색 이름과 1:1로 일치한다
    tone: {
      blue: { '--swatch-color': 'token(colors.brand.500)' },
      mint: { '--swatch-color': 'token(colors.mint.500)' },
      violet: { '--swatch-color': 'token(colors.violet.500)' },
      amber: { '--swatch-color': 'token(colors.amber.500)' },
      pink: { '--swatch-color': 'token(colors.rose.500)' },
      gray: { '--swatch-color': 'token(colors.cool.500)' },
    },
  },
  defaultVariants: { tone: 'gray' },
});

// 선택된 아이템에서만 드러나는 표시 슬롯 — 상태는 aria-pressed가 전달하므로 시각 전용이다
const indicatorCls = css({
  display: 'inline-flex',
  opacity: 0,
  transition: 'opacity {durations.fast} {easings.standard}',
  '[data-state="on"] &': { opacity: 1 },
});

type SwatchTone = NonNullable<RecipeVariantProps<typeof swatchItem>>['tone'];

type ColorSwatchGroupProps<V extends string> = {
  value: V | null;
  onValueChange: (value: V) => void;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
};

function ColorSwatchGroupRoot<V extends string>({
  value,
  onValueChange,
  className,
  children,
  ...rest
}: ColorSwatchGroupProps<V>) {
  return (
    <ToggleGroup.Root
      value={value === null ? [] : [value]}
      onValueChange={(details) => {
        // 단일 선택 그룹 — 선택된 칩을 다시 눌러 빈 상태가 되는 것은 무시한다
        const next = details.value[0] as V | undefined;
        if (next !== undefined) onValueChange(next);
      }}
      className={cx(rootCls, className)}
      {...rest}
    >
      {children}
    </ToggleGroup.Root>
  );
}

type ColorSwatchItemProps = {
  value: string;
  tone?: SwatchTone;
} & Omit<PressableProps, 'tone' | 'shape' | 'size' | 'asChild' | 'value'>;

function ColorSwatchItem({ value, tone, className, children, ...rest }: ColorSwatchItemProps) {
  return (
    <ToggleGroup.Item value={value} asChild>
      <Pressable shape="circle" size="icon" {...rest} className={cx(swatchItem({ tone }), className)}>
        {children}
      </Pressable>
    </ToggleGroup.Item>
  );
}

function ColorSwatchIndicator({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <span aria-hidden="true" className={cx(indicatorCls, className)}>
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
