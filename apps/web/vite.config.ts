import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
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
      router: { basepath },
    }),
    viteReact(),
  ],
});

export default config;
