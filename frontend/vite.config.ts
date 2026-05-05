/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const lazyChunkPrefixes = [
  'DashboardAnalyticsCharts-',
  'PlanningCalendar-',
  'react-big-calendar-',
  'dragAndDrop-',
  'width-',
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: {
      resolveDependencies(_, deps, context) {
        if (context.hostType !== 'html') {
          return deps;
        }

        return deps.filter(
          (dep) => !lazyChunkPrefixes.some((prefix) => dep.includes(prefix)),
        );
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5175,
    hmr: {
      clientPort: 5175,
    },
    proxy: {
      '/api': {
        target: 'http://backend:3005',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://backend:3005',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
