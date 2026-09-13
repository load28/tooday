import * as stylex from '@stylexjs/stylex';
import { type HTMLMotionProps, motion } from 'framer-motion';
import { type MouseEvent, type ReactNode, useId } from 'react';
import { useT } from '@/shared/i18n';
import { BaseButton, type BaseButtonProps, baseButtonStyles } from '@/shared/ui/base-button';
import { Spinner } from '@/shared/ui/spinner';
import type { ControlSx } from '@/styles/sx';
import { text } from '@/styles/text.styles';
import { color, radii, size as sizeVars, space } from '@/styles/tokens.stylex';

// TDS식 press — 눌렀다 뗄 때 살짝 튕기는 스프링(물리). 축소는 Button(진짜 버튼)에만, 리스트/카드엔 안 준다.
const PRESS_SPRING = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const;
const PRESS_SCALE = 0.97;

const HOVER = '@media (hover: hover)';
const ON = ':is([data-state="on"])';

const base = stylex.create({
  root: {
    gap: space.md,
    backgroundColor: { default: null, ':disabled': color.disabledSurface },
    color: { default: null, ':disabled': color.disabledText },
    opacity: { default: null, ':disabled': 1 },
  },
});

const tones = stylex.create({
  ghost: {
    color: { default: color.text, ':disabled': color.disabledText },
    backgroundColor: {
      default: 'transparent',
      ':not(:disabled):hover': { default: null, [HOVER]: color.stateHover },
      ':not(:disabled):active': color.statePressed,
      ':not(:disabled)[data-pressed="true"]': color.statePressed,
      ':disabled': 'transparent',
    },
  },
  brandGhost: {
    color: { default: color.textBrand, ':disabled': color.disabledText },
    backgroundColor: {
      default: 'transparent',
      ':not(:disabled):hover': { default: null, [HOVER]: color.primarySofter },
      ':not(:disabled):active': color.primarySofter,
      ':not(:disabled)[data-pressed="true"]': color.primarySofter,
      ':disabled': 'transparent',
    },
  },
  subtle: {
    color: {
      default: color.textSecondary,
      [ON]: color.onPrimary,
      ':disabled': color.disabledText,
    },
    backgroundColor: {
      default: color.surfaceMuted,
      ':not(:disabled):hover': { default: null, [HOVER]: color.surfaceSoft },
      ':not(:disabled):active': color.surfaceSoft,
      [ON]: color.primary,
      ':disabled': color.disabledSurface,
    },
  },
  brand: {
    color: { default: color.onPrimary, ':disabled': color.disabledText },
    backgroundColor: {
      default: color.primary,
      ':not(:disabled):hover': { default: null, [HOVER]: color.primaryPressed },
      ':not(:disabled):active': color.primaryPressed,
      ':not(:disabled)[data-pressed="true"]': color.primaryPressed,
      ':disabled': color.disabledSurface,
    },
  },
  brandSoft: {
    color: { default: color.primary, ':disabled': color.disabledText },
    backgroundColor: {
      default: color.primarySoft,
      ':not(:disabled):hover': { default: null, [HOVER]: color.primarySofter },
      ':not(:disabled):active': color.primarySofter,
      ':disabled': color.disabledSurface,
    },
  },
  danger: {
    color: { default: color.textInverse, ':disabled': color.disabledText },
    backgroundColor: {
      default: color.danger,
      ':not(:disabled):hover': { default: null, [HOVER]: color.dangerPressed },
      ':not(:disabled):active': color.dangerPressed,
      ':disabled': color.disabledSurface,
    },
  },
  dangerSoft: {
    color: { default: color.danger, ':disabled': color.disabledText },
    backgroundColor: { default: color.dangerSoft, ':disabled': color.disabledSurface },
    filter: {
      default: null,
      ':not(:disabled):hover': { default: null, [HOVER]: 'brightness(0.96)' },
      ':not(:disabled):active': 'brightness(0.96)',
    },
  },
});

const shapes = stylex.create({
  square: { borderRadius: radii.md },
  rounded: { borderRadius: radii.lg },
  pill: { borderRadius: radii.pill },
  circle: { borderRadius: radii.full, aspectRatio: '1 / 1' },
});

// 박스 치수만 여기 두고, 타이포는 styles/text.styles.ts를 배열에서 합친다
// (stylex.create 안에서는 객체 스프레드가 금지된다).
const sizes = stylex.create({
  sm: { height: sizeVars.controlSm, paddingInline: space.xl },
  md: { height: sizeVars.tap, paddingInline: space['2xl'] },
  lg: { height: sizeVars.tapLg, paddingInline: space['3xl'] },
  xl: { height: sizeVars.tapXl, paddingInline: space['3xl'] },
  icon: { height: sizeVars.tap, width: sizeVars.tap, paddingInline: 0 },
  iconLg: { height: sizeVars.tapLg, width: sizeVars.tapLg, paddingInline: 0 },
});

const SIZE_TEXT = {
  sm: text.bodySm,
  md: text.body,
  lg: text.bodyLg,
  xl: text.bodyLgStrong,
  icon: null,
  iconLg: null,
} as const;

const misc = stylex.create({
  fullWidth: { width: '100%' },
  loadingCursor: { cursor: 'wait' },
  // 라벨과 스피너를 같은 grid 셀에 겹쳐 어느 쪽이 크든 버튼 너비가 변하지 않는다.
  loadingStack: { display: 'inline-grid', placeItems: 'center', minWidth: 0 },
  loadingLayer: {
    gridArea: '1 / 1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    minWidth: 0,
  },
  // visibility/display로 숨기면 접근성 트리에서 빠지므로 opacity로 숨긴다.
  loadingHidden: { opacity: 0 },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
});

type Tone = keyof typeof tones;
type Shape = keyof typeof shapes;
type Size = keyof typeof sizes;

type ButtonProps = Omit<BaseButtonProps, 'sx'> & {
  /** 배치 전용 — tone/shape/size가 소유하는 속성은 타입이 막는다. */
  sx?: ControlSx;
  tone?: Tone;
  shape?: Shape;
  size?: Size;
  fullWidth?: boolean;
  /** 로딩 상태. 클릭·제출이 차단되고 라벨 자리에 스피너가 표시된다. 포커스는 유지된다. */
  loading?: boolean;
  /** 로딩 중 스피너 옆에 보여줄 텍스트. 없으면 스피너만 라벨 자리를 덮는다. */
  loadingText?: ReactNode;
  /** 기본 스피너를 교체한다. */
  spinner?: ReactNode;
};

export function Button({
  tone = 'ghost',
  shape = 'rounded',
  size = 'md',
  fullWidth,
  loading,
  loadingText,
  spinner,
  sx,
  children,
  onClick,
  asChild,
  type,
  ...rest
}: ButtonProps) {
  const t = useT();
  const labelId = useId();
  const loadingLabelId = useId();
  const isLoading = Boolean(loading);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  // 베이스 → tone/shape/size → 사용처 sx 순. 겹치는 속성은 뒤가 이긴다(레이어 불필요).
  const look = [
    base.root,
    tones[tone],
    shapes[shape],
    sizes[size],
    SIZE_TEXT[size],
    fullWidth && misc.fullWidth,
    isLoading && misc.loadingCursor,
    sx,
  ];

  const content = isLoading ? (
    <span {...stylex.props(misc.loadingStack)}>
      <span id={labelId} {...stylex.props(misc.loadingLayer, misc.loadingHidden)}>
        {children}
      </span>
      <span {...stylex.props(misc.loadingLayer)}>
        <span id={loadingLabelId} {...stylex.props(misc.srOnly)}>
          {t.common.loading}
        </span>
        {spinner ?? <Spinner aria-hidden />}
        {loadingText}
      </span>
    </span>
  ) : (
    children
  );

  const shared = {
    'data-loading': isLoading || undefined,
    'aria-disabled': isLoading || undefined,
    'aria-labelledby': isLoading ? `${labelId} ${loadingLabelId}` : undefined,
    onClick: handleClick,
  } as const;

  // asChild(<Link> 등)는 Ark BaseButton으로 — 링크엔 tap 축소가 부적절하므로 모션 없이 둔다.
  if (asChild) {
    return (
      <BaseButton asChild sx={look} {...rest} {...shared}>
        {content}
      </BaseButton>
    );
  }

  // 일반 버튼 — Framer Motion으로 tap 시 spring 축소(TDS 방식). baseButton 리셋을 함께 얹는다.
  const { className: sxClassName, style } = stylex.props(baseButtonStyles.root, ...look);
  return (
    <motion.button
      type={type ?? 'button'}
      data-base-button=""
      whileTap={isLoading ? undefined : { scale: PRESS_SCALE }}
      transition={PRESS_SPRING}
      {...(rest as unknown as HTMLMotionProps<'button'>)}
      {...shared}
      className={sxClassName}
      style={style}
    >
      {content}
    </motion.button>
  );
}

export type { ButtonProps };
