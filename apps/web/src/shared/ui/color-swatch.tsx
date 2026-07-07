import { cva, cx, type RecipeVariantProps } from 'styled-system/css';
import { Pressable, type PressableProps } from '@/shared/ui/pressable';

// 베이스 버튼(Pressable) 위에 스와치 오버레이만 얹는다. pressable은 config recipe(@layer recipes)라
// 이 cva(utilities)의 override가 결정적으로 이긴다 (docs/conventions/ui-styling.md).
const swatchOverlay = cva({
  base: {
    // 배경·선택 링이 같은 색을 공유하도록 tone은 CSS 변수 하나만 바꾼다
    background: 'var(--swatch-color)',
    color: 'textInverse',
    transition: 'transform {durations.fast} {easings.standard}, box-shadow {durations.fast} {easings.standard}',
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
    selected: {
      true: {
        boxShadow: '0 0 0 2px {colors.surface}, 0 0 0 4px var(--swatch-color)',
        transform: 'scale(1.04)',
      },
    },
  },
  defaultVariants: { tone: 'gray' },
});

type SwatchVariantProps = NonNullable<RecipeVariantProps<typeof swatchOverlay>>;

type ColorSwatchProps = SwatchVariantProps &
  Omit<PressableProps, 'tone' | 'shape' | 'size' | 'asChild' | 'children'> & {
    children?: PressableProps['children'];
  };

/**
 * 팔레트 색을 고르는 원형 스와치 버튼 — tone은 Dot의 accent 색 이름과 1:1.
 * 선택 표시(체크 아이콘 등)는 children으로 넣는다.
 */
export function ColorSwatch({ tone, selected, className, children, ...rest }: ColorSwatchProps) {
  return (
    <Pressable
      shape="circle"
      size="icon"
      aria-pressed={selected === true}
      {...rest}
      className={cx(swatchOverlay({ tone, selected }), className)}
    >
      {children}
    </Pressable>
  );
}
