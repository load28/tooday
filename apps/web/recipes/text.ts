import { defineRecipe } from '@pandacss/dev';

export const text = defineRecipe({
  className: 'text',
  base: { margin: 0, minWidth: 0 },
  variants: {
    variant: {
      display: { textStyle: 'display' },
      title: { textStyle: 'title' },
      subtitle: { textStyle: 'subtitle' },
      bodyLg: { textStyle: 'bodyLg' },
      bodyLgStrong: { textStyle: 'bodyLgStrong' },
      body: { textStyle: 'body' },
      bodyStrong: { textStyle: 'bodyStrong' },
      bodySm: { textStyle: 'bodySm' },
      label: { textStyle: 'label' },
      caption: { textStyle: 'caption' },
      captionStrong: { textStyle: 'captionStrong' },
      micro: { textStyle: 'micro' },
      overline: { textStyle: 'overline' },
      numeric: { textStyle: 'numeric' },
    },
    tone: {
      default: { color: 'text' },
      secondary: { color: 'textSecondary' },
      tertiary: { color: 'textTertiary' },
      placeholder: { color: 'textPlaceholder' },
      inverse: { color: 'textInverse' },
      brand: { color: 'textBrand' },
      success: { color: 'success' },
      warning: { color: 'warning' },
      danger: { color: 'danger' },
    },
    truncate: {
      true: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    },
    align: {
      start: { textAlign: 'start' },
      center: { textAlign: 'center' },
      end: { textAlign: 'end' },
    },
  },
  defaultVariants: { variant: 'body', tone: 'default' },
});
