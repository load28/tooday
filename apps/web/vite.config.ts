import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

const isPagesBuild = process.env.DEPLOY_TARGET === 'github-pages';
// GitHub Pages 용으로 빌드할 때만 web 앱을 design-guide 사이트의 하위 경로에 마운트한다.
const basepath = process.env.BASE_PATH ?? (isPagesBuild ? '/tooday/web' : '/');
const viteBase = basepath === '/' ? '/' : `${basepath}/`;

// 페이지 모드에서는 인증이 필요한 화면은 뺀다. 디자인 시스템 쇼케이스만 정적 출력.
const PAGES_PRERENDER = ['/design-system'];

const config = defineConfig({
  base: viteBase,
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro(),
    tanstackStart({
      router: { basepath },
      prerender: {
        enabled: isPagesBuild,
        crawlLinks: false,
        failOnError: true,
      },
      pages: isPagesBuild ? PAGES_PRERENDER.map((path) => ({ path })) : [],
    }),
    viteReact(),
  ],
});

export default config;
