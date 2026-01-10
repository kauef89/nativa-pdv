import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
    const isProd = command === 'build';
    return {
        // --- INÍCIO DA MODIFICAÇÃO: 'base' revertida para o original ---
        // Define a base para os assets no build de produção
        base: isProd ? '/wp-content/plugins/nativa-delivery/assets/dist/' : '/',

        // Configuração para CSS
        css: {
            devSourcemap: true,
        },

        // Configuração do servidor de desenvolvimento
        server: {
            port: 5173,
            strictPort: true,
            host: 'localhost',
            origin: 'http://localhost:5173',
        },

        plugins: [
            VitePWA({
                // --- INÍCIO DA MODIFICAÇÃO: Escopo explícito mantido ---
                // Esta linha é crucial e diz ao SW para controlar o site inteiro.
                scope: '/',
                registerType: 'autoUpdate',
                injectRegister: null,
                srcDir: 'assets/src/js',
                filename: 'sw-logic.js',
                outDir: 'assets/dist',
                strategies: 'injectManifest',
                manifest: {
                    name: 'Nativa Delivery',
                    short_name: 'Nativa',
                    description:
                        'Peça os melhores pastéis e lanches de Balneário Barra do Sul.',
                    // --- INÍCIO DA MODIFICAÇÃO: Adicionado ID único para a PWA do consumidor ---
                    id: '/?app=delivery',
                    // --- FIM DA MODIFICAÇÃO ---
                    theme_color: '#1c1b1f',
                    background_color: '#1c1b1f',
                    display: 'standalone',
                    scope: '/',
                    start_url: '/',
                    // --- INÍCIO DA MODIFICAÇÃO: Caminho dos ícones atualizado ---
                    icons: [
                        {
                            src: '/wp-content/plugins/nativa-delivery/assets/icons/main-app/icon-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                        },
                        {
                            src: '/wp-content/plugins/nativa-delivery/assets/icons/main-app/icon-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                        },
                        {
                            src: '/wp-content/plugins/nativa-delivery/assets/icons/main-app/maskable-icon.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                        },
                    ],
                    // --- FIM DA MODIFICAÇÃO ---
                },
            }),
        ],
        // --- FIM DA MODIFICAÇÃO ---

        // Configurações do build de produção
        build: {
            outDir: 'assets/dist',
            emptyOutDir: true,
            sourcemap: true,
            manifest: true,
            rollupOptions: {
                // --- INÍCIO DA MODIFICAÇÃO: Múltiplos Entry Points ---
                // Define pontos de entrada separados para o app principal e o dashboard
                input: {
                    main: 'assets/src/js/core/main.js',
                    dashboard: 'assets/src/js/dashboard/dashboard-main.js',
                },
                // --- FIM DA MODIFICAÇÃO ---
                output: {
                    entryFileNames: `[name].[hash].js`,
                    chunkFileNames: `[name].[hash].js`,
                    assetFileNames: `[name].[hash].[ext]`,
                },
            },
        },
    };
});
