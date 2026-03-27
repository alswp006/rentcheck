import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'wisehome',
  brand: {
    displayName: '현명한 주거 선택',
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
