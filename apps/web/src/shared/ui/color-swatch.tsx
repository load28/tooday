import { ToggleGroup } from '@ark-ui/react/toggle-group';
import type { ReactNode } from 'react';
import { BaseButton, type BaseButtonProps } from '@/shared/ui/base-button';
import { indicatorCls, rootCls, type SwatchItemVariantProps, swatchItem } from '@/shared/ui/color-swatch.css';
import { cx } from '@/styles/cx';

// 팔레트 색 단일 선택 그룹 — 상태·접근성은 Ark ToggleGroup, 클릭 엘리먼트는
// BaseButton(asChild), 스와치 고유 스타일(치수·색)은 recipes 레이어 오버레이 (docs/conventions/ui-composition.md).

type SwatchTone = NonNullable<SwatchItemVariantProps>['tone'];

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
} & Omit<BaseButtonProps, 'asChild' | 'value'>;

function ColorSwatchItem({ value, tone, className, children, ...rest }: ColorSwatchItemProps) {
  return (
    <ToggleGroup.Item value={value} asChild>
      <BaseButton {...rest} className={cx(swatchItem({ tone }), className)}>
        {children}
      </BaseButton>
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
