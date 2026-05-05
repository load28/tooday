import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

const isPagesBuild = process.env.DEPLOY_TARGET === 'github-pages';
const basepath = process.env.BASE_PATH ?? (isPagesBuild ? '/tooday' : '/');
const viteBase = basepath === '/' ? '/' : `${basepath}/`;

const PRERENDER_PAGES = [
  '/',
  '/guide',
  '/projects',
  '/projects/p-tooday',
  '/projects/p-design',
  '/projects/p-life',
  '/projects/p-study',
  '/tasks/new',
  '/tasks/t-1',
  '/tasks/t-2',
  '/tasks/t-3',
  '/tasks/t-4',
  '/tasks/t-5',
  '/tasks/t-6',
  '/tasks/t-7',
];

const config = defineConfig({
  base: viteBase,
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro(),
    tanstackStart({
      router: {
        routeFileIgnorePattern: '\\.css\\.ts$',
        basepath,
      },
      prerender: {
        enabled: isPagesBuild,
        crawlLinks: true,
        failOnError: true,
      },
      pages: isPagesBuild ? PRERENDER_PAGES.map((path) => ({ path })) : [],
    }),
    viteReact(),
    vanillaExtractPlugin(),
  ],
});

export default config;
