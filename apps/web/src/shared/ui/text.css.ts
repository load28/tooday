import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { textStyles } from '@/styles/text-styles';
import { vars } from '@/styles/theme.css';

export const text = recipe({
  base: rec({ margin: 0, minWidth: 0 }),
  variants: {
    variant: {
      display: rec(textStyles.display),
      title: rec(textStyles.title),
      subtitle: rec(textStyles.subtitle),
      bodyLg: rec(textStyles.bodyLg),
      bodyLgStrong: rec(textStyles.bodyLgStrong),
      body: rec(textStyles.body),
      bodyStrong: rec(textStyles.bodyStrong),
      bodySm: rec(textStyles.bodySm),
      label: rec(textStyles.label),
      caption: rec(textStyles.caption),
      captionStrong: rec(textStyles.captionStrong),
      micro: rec(textStyles.micro),
      overline: rec(textStyles.overline),
      numeric: rec(textStyles.numeric),
    },
    tone: {
      default: rec({ color: vars.color.text }),
      secondary: rec({ color: vars.color.textSecondary }),
      tertiary: rec({ color: vars.color.textTertiary }),
      placeholder: rec({ color: vars.color.textPlaceholder }),
      inverse: rec({ color: vars.color.textInverse }),
      brand: rec({ color: vars.color.textBrand }),
      success: rec({ color: vars.color.success }),
      warning: rec({ color: vars.color.warning }),
      danger: rec({ color: vars.color.danger }),
    },
    truncate: {
      true: rec({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
    },
    // 완료 항목 취소선 — 색은 tone이 관리하므로 여기서는 장식선만 얹는다
    strike: {
      true: rec({ textDecoration: 'line-through', textDecorationColor: vars.color.borderStrong }),
    },
    align: {
      start: rec({ textAlign: 'start' }),
      center: rec({ textAlign: 'center' }),
      end: rec({ textAlign: 'end' }),
    },
  },
  defaultVariants: { variant: 'body', tone: 'default' },
});

export type TextVariantProps = NonNullable<RecipeVariants<typeof text>>;
