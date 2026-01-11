import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
    const isProd = command === 'build';
    const pluginFolderName = 'nativa-delivery';

    return {
        base: isProd
            ? `/wp-content/plugins/${pluginFolderName}/assets/dist/`
            : '/',

        // Ativa sourcemaps para você ver o arquivo original no DevTools
        css: {
            devSourcemap: true,
        },

        resolve: {
            alias: {
                '@core': resolve(__dirname, 'assets/src/js/core'),
                '@shared': resolve(__dirname, 'assets/src/js/shared'),
                '@apps': resolve(__dirname, 'assets/src/js/apps'),
                '@utils': resolve(__dirname, 'assets/src/js/shared/utils'),
                '@ui': resolve(__dirname, 'assets/src/js/shared/ui'),
                // Alias para facilitar imports dentro do CSS/SCSS se você decidir usar SCSS no futuro
                '@styles': resolve(__dirname, 'assets/src/styles'),
            },
        },

        plugins: [
            VitePWA({
                strategies: 'injectManifest',
                srcDir: 'assets/src/js/apps/consumer',
                filename: 'sw-consumer.js',
                injectRegister: 'auto',
                registerType: 'autoUpdate',
                manifest: {
                    /* ... mantido ... */
                },
                devOptions: { enabled: true, type: 'module' },
            }),
        ],

        build: {
            outDir: 'assets/dist',
            emptyOutDir: true,
            sourcemap: true,
            manifest: true,
            rollupOptions: {
                input: {
                    // --- JAVASCRIPT ---
                    consumer: resolve(
                        __dirname,
                        'assets/src/js/apps/consumer/boot-consumer.js'
                    ),
                    pdv: resolve(
                        __dirname,
                        'assets/src/js/apps/pdv/boot-pdv.js'
                    ),
                    admin: resolve(
                        __dirname,
                        'assets/src/js/apps/wp-admin-scripts/admin-main.js'
                    ),

                    // --- CSS INDEPENDENTE (AQUI ESTÁ O SEGREDO) ---
                    // Ao adicionar aqui, o Vite gera um arquivo .css separado no dist
                    'style-consumer': resolve(
                        __dirname,
                        'assets/src/styles/consumer/main.css'
                    ),
                    'style-pdv': resolve(
                        __dirname,
                        'assets/src/styles/pdv/main.css'
                    ),
                    'style-admin': resolve(
                        __dirname,
                        'assets/src/styles/admin/main.css'
                    ),
                },
                output: {
                    // Configuração para manter os nomes dos arquivos organizados
                    entryFileNames: `js/[name].[hash].js`,
                    chunkFileNames: `js/[name].[hash].js`,

                    // CSS e imagens vão para suas pastas
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                            return 'css/[name].[hash][extname]';
                        }
                        return 'assets/[name].[hash][extname]';
                    },
                },
            },
        },
    };
});
