import { defineConfig } from '@pandacss/dev';
// shared/ui 스타일은 config recipe로 둬 사용처 override가 결정적으로 이긴다(docs/conventions/ui-styling.md).
// 정의는 ./recipes/*(빌드 전용)에 두고 여기서 등록 — 런타임 컴포넌트는 styled-system/recipes를 쓴다.
import { appBarLeading, appBarRoot, appBarTitle, appBarTrailing } from './recipes/app-bar';
import { baseButton } from './recipes/base-button';
import { sheetBackdrop, sheetHandle, sheetPositioner, sheetSurface } from './recipes/bottom-sheet';
import { card } from './recipes/card';
import { chip } from './recipes/chip';
import { tDivider } from './recipes/divider';
import { dot } from './recipes/dot';
import { fieldRoot } from './recipes/field';
import { input } from './recipes/input';
import { progressFill, progressTrack } from './recipes/progress-bar';
import { row, rowSlotContent, rowSlotLeading, rowSlotTrailing } from './recipes/row';
import { screenContent, screenFooter, screenHeader, screenOverlay, screenViewport } from './recipes/screen';
import { sectionHeader, sectionHeaderTrailing } from './recipes/section';
import { spinner } from './recipes/spinner';
import { tSpacer, tStack } from './recipes/stack';
import { surface } from './recipes/surface';
import { tabBarIconWrap, tabBarInner, tabBarNav } from './recipes/tab-bar';
import { text } from './recipes/text';

const uiRecipes = {
  baseButton,
  card,
  chip,
  text,
  surface,
  dot,
  tDivider,
  spinner,
  input,
  progressTrack,
  progressFill,
  row,
  rowSlotLeading,
  rowSlotContent,
  rowSlotTrailing,
  tStack,
  tSpacer,
  screenViewport,
  screenHeader,
  screenContent,
  screenFooter,
  screenOverlay,
  sectionHeader,
  sectionHeaderTrailing,
  appBarRoot,
  appBarLeading,
  appBarTitle,
  appBarTrailing,
  sheetPositioner,
  sheetBackdrop,
  sheetSurface,
  sheetHandle,
  fieldRoot,
  tabBarNav,
  tabBarInner,
  tabBarIconWrap,
};

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
      // Ark 토글 계열(ToggleGroup 등)이 붙이는 선택 상태 — JS 조건부 스타일 대신 이걸 쓴다
      on: '&[data-state="on"]',
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
    'button, a, [role="button"], [data-base-button]': {
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
          controlMd: { value: '36px' },
          tap: { value: '40px' },
          tapLg: { value: '48px' },
          tapXl: { value: '56px' },
          fab: { value: '56px' },
          handle: { value: '36px' },
          appBar: { value: '52px' },
          tabBar: { value: '60px' },
          // 타임라인의 시간 컬럼 폭
          timeCol: { value: '52px' },
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
        zIndex: {
          overlay: { value: 60 },
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
          onPrimaryMuted: { value: 'rgba(255, 255, 255, 0.6)' },

          // 비활성 — tone 무관 중립으로 collapse. opacity로 흐리지 않고 색을 명시 교체(brandSoft 혼동 방지).
          // 값은 외부 시스템(Carbon 등)의 명도를 따라가지 않고, 이 시스템의 램프 '역할'로 도출한다:
          // 이 램프에서 밝은 표면(cool.50~100) 위에서 중립이 '보이도록' 배정된 단계는 border 계열(cool.200~300)이다.
          // 채움은 선(border)보다 존재감이 커야 하므로 그중 강한 단계 = borderStrong(cool.300)에 대응한다.
          // 테두리 없이 채움만 쓴다. 라벨은 텍스트 계층의 저강조 단계 = textTertiary(cool.500).
          disabledSurface: { value: '{colors.cool.300}' }, // borderStrong 무게 — 밝은 배경 위 '보이는' 중립 채움
          disabledText: { value: '{colors.cool.500}' }, // textTertiary 무게 — 저강조 라벨

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

          // 빈 상태 블록의 수직 패딩
          emptyStateY: { value: '60px' },
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
        numericLg: {
          value: {
            fontSize: '16px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
            lineHeight: '20px',
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
