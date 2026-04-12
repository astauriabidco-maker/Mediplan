import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
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
})
