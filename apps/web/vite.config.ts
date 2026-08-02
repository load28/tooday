import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

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
        // .css.ts(vanilla-extract)는 라우트 파일이 아니므로 라우트 스캔에서 제외한다
        routeFileIgnorePattern: '\\.css\\.ts$',
        basepath,
      },
    }),
    viteReact(),
    vanillaExtractPlugin(),
  ],
});

export default config;
