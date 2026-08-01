import { style } from '@vanilla-extract/css';
import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { HOVER_MEDIA, ON, press } from '@/styles/conditions';
import { util } from '@/styles/layers.css';
import { textStyles } from '@/styles/text-styles';
import { vars } from '@/styles/theme.css';

const hoverKey = (base = '&') => `${base}:not(:disabled):hover`;
// @media (hover: hover) 안에 하나 이상의 hover selector를 묶는다(키 충돌 없이 _on 위 hover까지 합성).
const mediaHover = (...pairs: Array<[string, Record<string, unknown>]>) => ({
  '@media': { [HOVER_MEDIA]: { selectors: Object.fromEntries(pairs) } },
});

// 버튼 룩(tone/shape/size)은 베이스가 아니라 여기 산다 — cva(utilities)라 baseButton(recipes 층)을 결정적으로 덮는다.
export const buttonStyle = recipe({
  base: util({
    gap: vars.space.md,
    // 비활성 = tone 무관 중립 채움으로 collapse. cva(utilities)라 baseButton의 &:disabled opacity를 덮는다 — opacity는 1로 되돌린다.
    selectors: { '&:disabled': { opacity: 1, background: vars.color.disabledSurface, color: vars.color.disabledText } },
  }),
  variants: {
    // hover와 press는 같은 색을 쓰고(TDS식), press가 축소를 더한다. hover는 포인터 기기에서만.
    tone: {
      // 채움 없는 tone은 비활성에도 배경 없이 텍스트만 저강조로 둔다. 중립이라 hover/press 2단.
      ghost: util({
        color: vars.color.text,
        ...mediaHover([hoverKey(), { background: vars.color.stateHover }]),
        selectors: { ...press({ background: vars.color.statePressed }), '&:disabled': { background: 'transparent' } },
      }),
      // 텍스트 링크 룩 — asChild <Link>에 브랜드 색 + 인터랙션 계약을 입힐 때 쓴다.
      brandGhost: util({
        color: vars.color.textBrand,
        ...mediaHover([hoverKey(), { background: vars.color.primarySofter }]),
        selectors: { ...press({ background: vars.color.primarySofter }), '&:disabled': { background: 'transparent' } },
      }),
      // _on = ToggleGroup.Item asChild로 꽂혔을 때의 선택 룩.
      subtle: util({
        background: vars.color.surfaceMuted,
        color: vars.color.textSecondary,
        ...mediaHover(
          [hoverKey(), { background: vars.color.surfaceSoft }],
          [hoverKey(ON), { background: vars.color.primaryPressed }],
        ),
        selectors: {
          ...press({ background: vars.color.surfaceSoft }),
          [ON]: { background: vars.color.primary, color: vars.color.onPrimary },
          ...press({ background: vars.color.primaryPressed }, ON),
        },
      }),
      brand: util({
        background: vars.color.primary,
        color: vars.color.onPrimary,
        ...mediaHover([hoverKey(), { background: vars.color.primaryPressed }]),
        selectors: press({ background: vars.color.primaryPressed }),
      }),
      brandSoft: util({
        background: vars.color.primarySoft,
        color: vars.color.primary,
        ...mediaHover([hoverKey(), { background: vars.color.primarySofter }]),
        selectors: press({ background: vars.color.primarySofter }),
      }),
      danger: util({
        background: vars.color.danger,
        color: vars.color.textInverse,
        ...mediaHover([hoverKey(), { background: vars.color.dangerPressed }]),
        selectors: press({ background: vars.color.dangerPressed }),
      }),
      dangerSoft: util({
        background: vars.color.dangerSoft,
        color: vars.color.danger,
        ...mediaHover([hoverKey(), { background: vars.color.dangerSoft, filter: 'brightness(0.96)' }]),
        selectors: press({ background: vars.color.dangerSoft, filter: 'brightness(0.96)' }),
      }),
    },
    shape: {
      square: util({ borderRadius: vars.radii.md }),
      rounded: util({ borderRadius: vars.radii.lg }),
      pill: util({ borderRadius: vars.radii.pill }),
      circle: util({ borderRadius: vars.radii.full, aspectRatio: '1 / 1' }),
    },
    size: {
      sm: util({ height: vars.size.controlSm, paddingInline: vars.space.xl, ...textStyles.bodySm }),
      md: util({ height: vars.size.tap, paddingInline: vars.space['2xl'], ...textStyles.body }),
      lg: util({ height: vars.size.tapLg, paddingInline: vars.space['3xl'], ...textStyles.bodyLg }),
      xl: util({ height: vars.size.tapXl, paddingInline: vars.space['3xl'], ...textStyles.bodyLgStrong }),
      icon: util({ height: vars.size.tap, width: vars.size.tap, paddingInline: '0' }),
      iconLg: util({ height: vars.size.tapLg, width: vars.size.tapLg, paddingInline: '0' }),
    },
    fullWidth: {
      true: util({ width: '100%' }),
    },
  },
  defaultVariants: { tone: 'ghost', shape: 'rounded', size: 'md' },
});

export type ButtonVariantProps = NonNullable<RecipeVariants<typeof buttonStyle>>;

// 라벨과 스피너를 같은 grid 셀에 겹쳐 어느 쪽이 크든 버튼 너비가 변하지 않는다.
export const loadingStackCls = style(util({ display: 'inline-grid', placeItems: 'center', minWidth: 0 }));
export const loadingLayerCls = style(
  util({
    gridArea: '1 / 1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars.space.md,
    minWidth: 0,
  }),
);
// visibility/display로 숨기면 접근성 트리에서 빠지므로 opacity로 숨긴다.
export const loadingHiddenCls = style(util({ opacity: 0 }));
export const loadingCursorCls = style(util({ cursor: 'wait' }));
export const srOnlyCls = style(
  util({
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  }),
);
