import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: true,
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  outdir: 'styled-system',
  jsxFramework: 'react',

  conditions: {
    extend: {
      // 마우스가 실제 있는 기기에서만 hover 스타일을 적용한다.
      // 모바일 웹뷰에서는 자동으로 무시되어 "탭 후 색이 박히는" 현상이 사라진다.
      hoverable: '@media (hover: hover) and (pointer: fine)',
      // 누르는 순간만 적용. data-pressed 속성으로 프로그래매틱 트리거도 가능.
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
      // 끝까지 스크롤했을 때 고무줄 바운스/풀투리프레시 차단 (네이티브 앱 느낌)
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
    // 모바일 탭 최적화: 회색 하이라이트 제거 + 더블탭 줌 지연 제거 + 길게 눌러도 선택 안 됨
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
        sizes: {
          tap: { value: '40px' },
          tapLg: { value: '48px' },
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
          // canvas
          bg: { value: '#f5f6f8' },
          bgWarm: { value: '#f7f8fa' },

          // surfaces
          surface: { value: '{colors.white}' },
          surfaceMuted: { value: '{colors.cool.50}' },
          surfaceSoft: { value: '{colors.cool.100}' },
          surfaceInverse: { value: '{colors.cool.900}' },

          // borders
          border: { value: '{colors.cool.200}' },
          borderStrong: { value: '{colors.cool.300}' },
          divider: { value: '{colors.cool.100}' },

          // text
          text: { value: '{colors.cool.900}' },
          textSecondary: { value: '{colors.cool.700}' },
          textTertiary: { value: '{colors.cool.500}' },
          textPlaceholder: { value: '{colors.cool.400}' },
          textInverse: { value: '{colors.white}' },
          textBrand: { value: '{colors.brand.500}' },

          // brand
          primary: { value: '{colors.brand.500}' },
          primaryHover: { value: '{colors.brand.600}' },
          primarySoft: { value: '{colors.brand.100}' },
          primarySofter: { value: '{colors.brand.50}' },
          onPrimary: { value: '{colors.white}' },

          // status
          success: { value: '{colors.mint.600}' },
          successSoft: { value: '{colors.mint.100}' },
          warning: { value: '{colors.sun.500}' },
          warningSoft: { value: '{colors.sun.100}' },
          danger: { value: '{colors.ruby.500}' },
          dangerSoft: { value: '{colors.ruby.100}' },

          // overlay & states
          overlay: { value: 'rgba(15, 19, 36, 0.45)' },
          // hover (PC 전용, 옅게)
          hoverOverlay: { value: 'rgba(15, 19, 36, 0.04)' },
          // press (모바일/PC 공통, 명확하게)
          pressed: { value: 'rgba(15, 19, 36, 0.06)' },
          pressedStrong: { value: 'rgba(15, 19, 36, 0.10)' },
          // 브랜드 인터랙션
          primaryPressed: { value: '{colors.brand.700}' },
          dangerPressed: { value: '#d63845' },
        },
        spacing: {
          safeTop: { value: 'env(safe-area-inset-top, 0px)' },
          safeBottom: { value: 'env(safe-area-inset-bottom, 0px)' },
          safeLeft: { value: 'env(safe-area-inset-left, 0px)' },
          safeRight: { value: 'env(safe-area-inset-right, 0px)' },
          keyboard: { value: 'env(keyboard-inset-height, 0px)' },
        },
      },

      textStyles: {
        display: {
          value: {
            fontSize: '24px',
            fontWeight: '700',
            letterSpacing: '-0.03em',
            lineHeight: '1.2',
          },
        },
        title: {
          value: {
            fontSize: '18px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            lineHeight: '1.3',
          },
        },
        subtitle: {
          value: {
            fontSize: '17px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            lineHeight: '1.3',
          },
        },
        bodyLg: {
          value: {
            fontSize: '16px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            lineHeight: '1.45',
          },
        },
        bodyLgStrong: {
          value: {
            fontSize: '16px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '1.45',
          },
        },
        body: {
          value: {
            fontSize: '14px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            lineHeight: '1.5',
          },
        },
        bodyStrong: {
          value: {
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '1.5',
          },
        },
        bodySm: {
          value: {
            fontSize: '13px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            lineHeight: '1.5',
          },
        },
        label: {
          value: {
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '1.4',
          },
        },
        caption: {
          value: {
            fontSize: '12px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            lineHeight: '1.4',
          },
        },
        captionStrong: {
          value: {
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '1.4',
          },
        },
        micro: {
          value: {
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0',
            lineHeight: '1.3',
          },
        },
        overline: {
          value: {
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '0.02em',
            lineHeight: '1.3',
            textTransform: 'uppercase',
          },
        },
        numeric: {
          value: {
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            fontFeatureSettings: '"tnum" 1',
          },
        },
      },

      keyframes: {
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
