// @apps-in-toss/web-framework가 설치된 환경에서는 해당 패키지의 defineConfig를 사용합니다.
// Railway 등 외부 빌드 환경에서는 로컬 identity 함수로 대체합니다.
const defineConfig = <T>(config: T): T => config;

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
