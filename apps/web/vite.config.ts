import path from 'node:path';
import { fileURLToPath } from 'node:url';
import stylex from '@stylexjs/unplugin';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const isPagesBuild = process.env.DEPLOY_TARGET === 'github-pages';
// GitHub Pages 용으로 빌드할 때만 web 앱을 design-guide 사이트의 하위 경로에 마운트한다.
const basepath = process.env.BASE_PATH ?? (isPagesBuild ? '/tooday/web' : '/');
const viteBase = basepath === '/' ? '/' : `${basepath}/`;

const config = defineConfig({
  base: viteBase,
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro(),
    tanstackStart({
      router: {
        // *.styles.ts(StyleX)는 라우트 파일이 아니므로 라우트 스캔에서 제외한다
        routeFileIgnorePattern: '\\.styles\\.ts$',
        basepath,
      },
    }),
    // StyleX 레이어를 `stylex` 부모 레이어 아래로 모은다 — 순서는 __root.tsx의
    // `@layer reset, base, stylex;` 한 줄이 확정한다.
    stylex.vite({
      useCSSLayers: { prefix: 'stylex' },
      styleResolution: 'application-order',
      // defineVars(.stylex.ts) 임포트는 babel이 디스크에서 직접 푼다 — tsconfig paths를 모르므로 여기 별도 선언.
      aliases: { '@/*': [path.join(rootDir, 'src/*')] },
      unstable_moduleResolution: { type: 'commonJS', rootDir },
      // 기본 'full' 모드는 transformIndexHtml로 주입하는데 TanStack Start는 index.html이 없어
      // 아무것도 주입되지 않는다. 주입은 app/stylex-stylesheet.tsx가 맡는다.
      devMode: 'css-only',
    }),
    viteReact(),
  ],
});

export default config;
