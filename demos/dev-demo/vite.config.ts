import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        nodePolyfills({
            // include: ['crypto', 'buffer', 'stream'],
            globals: {
                Buffer: true,
            },
        }),
        react(),
        legacy({
            targets: ['IE 11'],
        }),
        
    ],
    resolve: {
        alias: {
            eventemitter3: 'eventemitter3/umd/eventemitter3.js',
        },
    },
    server: {
        host: '0.0.0.0',
        port: 3003,
        https: false
    },
    build: {
        minify: false,
        rollupOptions: {
            // external: ['buffer']
        }
    },
});
