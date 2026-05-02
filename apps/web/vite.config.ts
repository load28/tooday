import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro(),
    tanstackStart({
      tsr: {
        routeFileIgnorePattern: '\\.css\\.ts$',
      },
    }),
    viteReact(),
    vanillaExtractPlugin(),
  ],
});

export default config;
