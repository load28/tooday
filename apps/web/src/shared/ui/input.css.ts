import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { DISABLED, FOCUS, PLACEHOLDER } from '@/styles/conditions';
import { rec } from '@/styles/layers.css';
import { textStyles } from '@/styles/text-styles';
import { vars } from '@/styles/theme.css';

export const input = recipe({
  base: rec({
    display: 'block',
    width: '100%',
    minWidth: 0,
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    color: vars.color.text,
    fontFamily: 'inherit',
    outline: 'none',
    selectors: {
      [PLACEHOLDER]: { color: vars.color.textPlaceholder },
      // 비활성 = 중립 채움으로 교체 (opacity로 흐리지 않는다 — 버튼과 동일 원칙, 테두리 없이).
      [DISABLED]: { cursor: 'not-allowed', background: vars.color.disabledSurface, color: vars.color.disabledText },
    },
  }),
  variants: {
    variant: {
      // 박스형 필드 — 테두리·배경·포커스 링을 갖는 기본 룩
      box: rec({
        border: '1.5px solid transparent',
        borderRadius: vars.radii.lg,
        background: vars.color.surfaceSoft,
        letterSpacing: vars.letterSpacing.tight,
        fontWeight: 500,
        // 16px 미만이면 iOS 웹뷰가 포커스 시 화면을 자동 확대한다
        fontSize: '16px',
        transition: `border-color ${vars.duration.fast} ${vars.easing.exit}, background-color ${vars.duration.fast} ${vars.easing.exit}`,
        selectors: {
          [FOCUS]: { background: vars.color.surface, borderColor: vars.color.primary },
          '&[data-invalid]': { borderColor: vars.color.danger },
          '&[aria-invalid="true"]': { borderColor: vars.color.danger },
        },
      }),
      // 테두리 없는 인라인 입력 — 화면 타이틀을 display 타이포 그대로 편집한다.
      // 높이·패딩은 size가 깔므로 &&(클래스 2회)로 스펙시티를 올려 결정적으로 리셋한다.
      inline: rec({
        ...textStyles.display,
        selectors: { '&&': { height: 'auto', paddingInline: vars.space['2xs'], borderRadius: '0' } },
      }),
    },
    // 메트릭은 박스형 기준 — inline은 위에서 스펙시티로 리셋한다
    size: {
      // radius는 variant(box)도 깔므로 &&로 스펙시티를 올려 sm이 결정적으로 이긴다
      sm: rec({
        height: vars.size.controlSm,
        paddingInline: vars.space.xl,
        selectors: { '&&': { borderRadius: vars.radii.md } },
      }),
      md: rec({ height: vars.size.tap, paddingInline: vars.space.xl }),
      lg: rec({ height: vars.size.tapLg, paddingInline: vars.space['2xl'] }),
      xl: rec({ height: vars.size.tapXl, paddingInline: vars.space['2xl'] }),
    },
  },
  defaultVariants: { variant: 'box', size: 'md' },
});

export type InputVariantProps = NonNullable<RecipeVariants<typeof input>>;
