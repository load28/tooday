import * as stylex from '@stylexjs/stylex';
import { color, radii, size as sizeVars } from '@/styles/tokens.stylex';

const base = stylex.create({
  root: { display: 'inline-block', flexShrink: 0, borderRadius: radii.full },
});

const sizes = stylex.create({
  xs: { width: sizeVars.xs, height: sizeVars.xs },
  sm: { width: sizeVars.sm, height: sizeVars.sm },
  md: { width: sizeVars.md, height: sizeVars.md },
  lg: { width: sizeVars.lg, height: sizeVars.lg },
});

const tones = stylex.create({
  // 시맨틱 색
  primary: { backgroundColor: color.primary },
  success: { backgroundColor: color.success },
  warning: { backgroundColor: color.warning },
  danger: { backgroundColor: color.danger },
  neutral: { backgroundColor: color.borderStrong },
  muted: { backgroundColor: color.border },
  // 팔레트 accent 색(도메인 무관) — 프로젝트 색 이름과 1:1로 일치한다
  blue: { backgroundColor: color.brand500 },
  mint: { backgroundColor: color.mint500 },
  violet: { backgroundColor: color.violet500 },
  amber: { backgroundColor: color.amber500 },
  pink: { backgroundColor: color.rose500 },
  gray: { backgroundColor: color.cool500 },
});

type DotProps = {
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
  sx?: stylex.StyleXStyles;
  className?: string;
  'aria-label'?: string;
};

export function Dot({ size = 'sm', tone = 'neutral', sx, className, ...rest }: DotProps) {
  const { className: sxClassName, style } = stylex.props(base.root, sizes[size], tones[tone], sx);
  return (
    <span
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
      className={className ? `${sxClassName} ${className}` : sxClassName}
      style={style}
    />
  );
}
