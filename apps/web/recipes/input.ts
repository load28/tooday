import { defineRecipe } from '@pandacss/dev';

export const input = defineRecipe({
  className: 'input',
  base: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    appearance: 'none',
    border: 'none',
    bg: 'transparent',
    color: 'text',
    fontFamily: 'inherit',
    outline: 'none',
    _placeholder: { color: 'textPlaceholder' },
    // 비활성 = 중립 토큰으로 교체 (opacity로 흐리지 않는다 — 버튼과 동일 원칙).
    // 표면=disabledSurface, 경계=disabledBorder(inset ring), 라벨=disabledText.
    _disabled: {
      cursor: 'not-allowed',
      bg: 'disabledSurface',
      color: 'disabledText',
      boxShadow: 'inset 0 0 0 1px {colors.disabledBorder}',
    },
  },
  variants: {
    variant: {
      // 박스형 필드 — 테두리·배경·포커스 링을 갖는 기본 룩
      box: {
        border: '1.5px solid transparent',
        borderRadius: 'lg',
        bg: 'surfaceSoft',
        letterSpacing: 'tight',
        fontWeight: '500',
        // 16px 미만이면 iOS 웹뷰가 포커스 시 화면을 자동 확대한다
        fontSize: '16px',
        transition: 'border-color {durations.fast} {easings.exit}, background-color {durations.fast} {easings.exit}',
        _focus: { bg: 'surface', borderColor: 'primary' },
        '&[data-invalid], &[aria-invalid="true"]': { borderColor: 'danger' },
      },
      // 테두리 없는 인라인 입력 — 화면 타이틀을 display 타이포 그대로 편집한다.
      // 높이·패딩은 size가 깔므로 &&(클래스 2회)로 스펙시티를 올려 결정적으로 리셋한다.
      inline: {
        textStyle: 'display',
        '&&': { height: 'auto', paddingInline: '2xs', borderRadius: '0' },
      },
    },
    // 메트릭은 박스형 기준 — inline은 위에서 스펙시티로 리셋한다
    size: {
      // radius는 variant(box)도 깔므로 &&로 스펙시티를 올려 sm이 결정적으로 이긴다
      sm: { height: 'controlSm', paddingX: 'xl', '&&': { borderRadius: 'md' } },
      md: { height: 'tap', paddingX: 'xl' },
      lg: { height: 'tapLg', paddingX: '2xl' },
      xl: { height: 'tapXl', paddingX: '2xl' },
    },
  },
  defaultVariants: { variant: 'box', size: 'md' },
});
