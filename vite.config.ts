import { defineConfig } from 'vite';
import playgamaBridge from '@playgama/bridge/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => ({
  base: './',
  resolve: { alias: { '@game-platform': fileURLToPath(new URL(mode === 'playgama' ? './src/platform/playgama.ts' : './src/platform/index.ts', import.meta.url)) } },
  define: { 'import.meta.env.VITE_PLATFORM': JSON.stringify(mode === 'playgama' ? 'playgama' : mode === 'vk' ? 'vk' : 'yandex') },
  plugins: mode === 'playgama' ? [playgamaBridge({ mode: 'local' }), {
    name: 'playgama-distribution',
    transformIndexHtml(html) {
      return html.replace(/<script data-local-settings>[\s\S]*?<\/script>/, '');
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'playgama-bridge-config.json', source: readFileSync('playgama-bridge-config.json', 'utf8') });
      this.emitFile({ type: 'asset', fileName: 'PLAYGAMA-BRIDGE-LICENSE.txt', source: readFileSync('node_modules/@playgama/bridge/LICENSE', 'utf8') });
    },
  }] : [],
  server: {
    host: true,
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 8080,
    strictPort: true,
  },
  build: {
    outDir: mode === 'playgama' ? 'dist-playgama' : 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
}));
