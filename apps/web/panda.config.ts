import { defineConfig } from '@pandacss/dev';
import { uiRecipes } from './panda.recipes';

// shared/ui 프리미티브 스타일은 cva(atomic)가 아니라 config recipe로 둔다 — 근거는
// panda.recipes.ts와 docs/conventions/ui-styling.md 참고(요지: recipe 레이어가 utilities
// override에 항상 져서, 사용처/asChild override가 예측 가능하게 이긴다).

const spacingScale = {
  '0': { value: '0' },
  '2xs': { value: '0.125rem' },
  xs: { value: '0.25rem' },
  sm: { value: '0.375rem' },
  md: { value: '0.5rem' },
  lg: { value: '0.625rem' },
  xl: { value: '0.75rem' },
  '2xl': { value: '1rem' },
  '3xl': { value: '1.25rem' },
  '4xl': { value: '1.5rem' },
};

export default defineConfig({
  preflight: true,
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  outdir: 'styled-system',
  jsxFramework: 'react',

  // 모든 ui recipe의 variant CSS를 항상 생성 — variant가 동적 전달돼 정적 추출이 안 되는
  // 경우에도 CSS 누락이 없게(cva의 "정의된 variant 전부 생성"과 동일). recipes 키에서 자동 구성.
  staticCss: {
    recipes: Object.fromEntries(Object.keys(uiRecipes).map((name) => [name, ['*']])),
  },

  conditions: {
    extend: {
      press: '&:active, &[data-pressed="true"]',
    },
  },

  globalCss: {
    'html, body, #app': {
      minHeight: '100%',
    },
    'html, body': {
      margin: 0,
      padding: 0,
      bg: 'bg',
      color: 'text',
      fontFamily: 'sans',
      letterSpacing: 'tight',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
      overscrollBehaviorY: 'none',
      WebkitTextSizeAdjust: '100%',
    },
    '*, *::before, *::after': {
      boxSizing: 'border-box',
    },
    'button, input, textarea, select': {
      fontFamily: 'inherit',
      letterSpacing: 'inherit',
    },
    'button, a, [role="button"], [data-pressable]': {
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitTouchCallout: 'none',
    },
    'input, textarea, [contenteditable="true"]': {
      userSelect: 'text',
      WebkitUserSelect: 'text',
    },
    img: {
      WebkitUserDrag: 'none',
      userSelect: 'none',
    },
  },

  theme: {
    extend: {
      recipes: uiRecipes,
      tokens: {
        fonts: {
          sans: {
            value:
              "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif",
          },
        },
        letterSpacings: {
          tight: { value: '-0.01em' },
          tighter: { value: '-0.02em' },
          tightest: { value: '-0.03em' },
        },
        colors: {
          brand: {
            50: { value: '#f4f9ff' },
            100: { value: '#e8f3ff' },
            200: { value: '#cfe5ff' },
            300: { value: '#a8cfff' },
            400: { value: '#6ba9fa' },
            500: { value: '#3182f6' },
            600: { value: '#2272eb' },
            700: { value: '#1e63cf' },
            800: { value: '#1a52a8' },
            900: { value: '#163f80' },
          },
          cool: {
            50: { value: '#f9fafb' },
            100: { value: '#f2f4f6' },
            200: { value: '#e5e8eb' },
            300: { value: '#d1d6db' },
            400: { value: '#b0b8c1' },
            500: { value: '#8b95a1' },
            600: { value: '#6b7684' },
            700: { value: '#4e5968' },
            800: { value: '#333d4b' },
            900: { value: '#191f28' },
          },
          mint: {
            100: { value: '#dff7f2' },
            500: { value: '#00c2a8' },
            600: { value: '#00b8a3' },
          },
          violet: {
            100: { value: '#ecebff' },
            500: { value: '#6a5af9' },
          },
          amber: {
            100: { value: '#fff1de' },
            500: { value: '#ff9f43' },
          },
          rose: {
            100: { value: '#ffe7ee' },
            500: { value: '#ff5d8f' },
          },
          ruby: {
            100: { value: '#feeaec' },
            500: { value: '#f04452' },
          },
          sun: {
            100: { value: '#fff7e0' },
            500: { value: '#f9b811' },
          },
        },
        radii: {
          xs: { value: '6px' },
          sm: { value: '8px' },
          md: { value: '12px' },
          lg: { value: '14px' },
          xl: { value: '16px' },
          '2xl': { value: '20px' },
          '3xl': { value: '24px' },
          pill: { value: '999px' },
          full: { value: '9999px' },
        },
        shadows: {
          xs: { value: '0 1px 2px rgba(15, 19, 36, 0.04)' },
          sm: { value: '0 1px 2px rgba(15, 19, 36, 0.04)' },
          md: { value: '0 4px 12px rgba(15, 19, 36, 0.05)' },
          card: { value: '0 1px 3px rgba(15, 19, 36, 0.04), 0 4px 12px rgba(15, 19, 36, 0.04)' },
          lg: { value: '0 12px 32px rgba(15, 19, 36, 0.10)' },
          sheet: { value: '0 -8px 32px rgba(15, 19, 36, 0.16)' },
          fab: { value: '0 8px 20px rgba(49, 130, 246, 0.35), 0 2px 6px rgba(49, 130, 246, 0.25)' },
          focus: { value: '0 0 0 3px rgba(49, 130, 246, 0.30)' },
        },
        spacing: spacingScale,
        sizes: {
          ...spacingScale,
          controlSm: { value: '32px' },
          tap: { value: '40px' },
          tapLg: { value: '48px' },
          tapXl: { value: '56px' },
          fab: { value: '56px' },
          handle: { value: '36px' },
          appBar: { value: '52px' },
          tabBar: { value: '60px' },
          icon: { value: '20px' },
          iconLg: { value: '24px' },
        },
        durations: {
          fast: { value: '120ms' },
          base: { value: '180ms' },
          slow: { value: '280ms' },
        },
        easings: {
          standard: { value: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
          enter: { value: 'cubic-bezier(0, 0, 0.2, 1)' },
          exit: { value: 'cubic-bezier(0.4, 0, 1, 1)' },
        },
      },

      semanticTokens: {
        colors: {
          bg: { value: '#f5f6f8' },
          bgWarm: { value: '#f7f8fa' },

          surface: { value: '{colors.white}' },
          surfaceMuted: { value: '{colors.cool.50}' },
          surfaceSoft: { value: '{colors.cool.100}' },
          surfaceInverse: { value: '{colors.cool.900}' },

          border: { value: '{colors.cool.200}' },
          borderStrong: { value: '{colors.cool.300}' },
          divider: { value: '{colors.cool.100}' },

          text: { value: '{colors.cool.900}' },
          textSecondary: { value: '{colors.cool.700}' },
          textTertiary: { value: '{colors.cool.500}' },
          textPlaceholder: { value: '{colors.cool.400}' },
          textInverse: { value: '{colors.white}' },
          textBrand: { value: '{colors.brand.500}' },

          primary: { value: '{colors.brand.500}' },
          primarySoft: { value: '{colors.brand.100}' },
          primarySofter: { value: '{colors.brand.50}' },
          onPrimary: { value: '{colors.white}' },

          success: { value: '{colors.mint.600}' },
          successSoft: { value: '{colors.mint.100}' },
          warning: { value: '{colors.sun.500}' },
          warningSoft: { value: '{colors.sun.100}' },
          danger: { value: '{colors.ruby.500}' },
          dangerSoft: { value: '{colors.ruby.100}' },

          overlay: { value: 'rgba(15, 19, 36, 0.45)' },
          pressed: { value: 'rgba(15, 19, 36, 0.06)' },
          pressedStrong: { value: 'rgba(15, 19, 36, 0.10)' },
          primaryPressed: { value: '{colors.brand.700}' },
          dangerPressed: { value: '#d63845' },
        },
        spacing: {
          pageX: { value: '{spacing.2xl}' },

          appBarPadX: { value: '{spacing.xl}' },
          appBarPadY: { value: '{spacing.sm}' },
          appBarGap: { value: '{spacing.md}' },

          cardPadSm: { value: '{spacing.xl}' },
          cardPadMd: { value: '{spacing.2xl}' },
          cardPadLg: { value: '{spacing.3xl}' },

          sheetPadX: { value: '{spacing.3xl}' },
          sheetPadBottom: { value: '{spacing.4xl}' },
          sheetGap: { value: '{spacing.2xl}' },
          sheetHandleTop: { value: '{spacing.lg}' },

          dividerLeadingInset: { value: '3rem' },
        },
      },

      textStyles: {
        display: {
          value: {
            fontSize: '24px',
            fontWeight: '700',
            letterSpacing: '-0.03em',
            lineHeight: '30px',
          },
        },
        title: {
          value: {
            fontSize: '18px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            lineHeight: '24px',
          },
        },
        subtitle: {
          value: {
            fontSize: '17px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            lineHeight: '22px',
          },
        },
        bodyLg: {
          value: {
            fontSize: '16px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            lineHeight: '24px',
          },
        },
        bodyLgStrong: {
          value: {
            fontSize: '16px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '24px',
          },
        },
        body: {
          value: {
            fontSize: '14px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            lineHeight: '22px',
          },
        },
        bodyStrong: {
          value: {
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '22px',
          },
        },
        bodySm: {
          value: {
            fontSize: '13px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            lineHeight: '20px',
          },
        },
        label: {
          value: {
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '18px',
          },
        },
        caption: {
          value: {
            fontSize: '12px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            lineHeight: '16px',
          },
        },
        captionStrong: {
          value: {
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '16px',
          },
        },
        micro: {
          value: {
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0',
            lineHeight: '14px',
          },
        },
        overline: {
          value: {
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '0.02em',
            lineHeight: '18px',
            textTransform: 'uppercase',
          },
        },
        numeric: {
          value: {
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '18px',
            fontFeatureSettings: '"tnum" 1',
          },
        },
      },

      keyframes: {
        toodaySpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        toodayFadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        toodaySlideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
    },
  },
});
