import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
    base: '/',
    plugins: [react()],
    build: {
        outDir: './dist',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
    preview: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: process.env.API_URL || 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});

