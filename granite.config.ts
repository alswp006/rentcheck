import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'rentcheck',
  brand: {
    displayName: 'RentCheck — 전세·월세·매매 순자산 비교 시뮬레이터',
    primaryColor: '#3182F6',
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'vite build',
    },
  },
  permissions: [],
});
