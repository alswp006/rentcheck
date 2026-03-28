import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@apps-in-toss/framework': path.resolve(__dirname, './src/__mocks__/apps-in-toss-framework.ts'),
      '@apps-in-toss/web-framework': path.resolve(__dirname, './src/__mocks__/apps-in-toss-framework.ts'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
});
