import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/leave-management-server/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // 최신 브라우저를 대상으로 번들 크기 최소화
    target: 'esnext',
    // Vite 8.x(Rolldown 기반) OXC minifier 사용 (esbuild보다 빠름)
    minify: 'oxc',
    // CSS 코드 스플리팅 활성화
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // vendor 청크 분리: 초기 로드 시 병렬 다운로드 가능 (함수 형태)
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-http';
          }
        },
        // 청크 파일명에 해시 포함 (캐시 버스팅)
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    },
    // 청크 경고 임계값 조정 (기본 500KB → 1MB)
    chunkSizeWarningLimit: 1000,
  }
})
