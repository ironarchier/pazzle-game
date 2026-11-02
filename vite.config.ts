import { defineConfig } from 'vite';
import playgamaBridge from '@playgama/bridge/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Saves live in the host's cloud storage, so the local theme bootstrap must not read localStorage.
const withoutLocalSettings = { name: 'without-local-settings', transformIndexHtml: (html: string) => html.replace(/<script data-local-settings>[\s\S]*?<\/script>/, '') };
const PLATFORM_MODULE: Record<string, string> = { playgama: './src/platform/playgama.ts', pikabu: './src/platform/pikabu.ts' };

export default defineConfig(({ mode }) => ({
  base: './',
  resolve: { alias: { '@game-platform': fileURLToPath(new URL(PLATFORM_MODULE[mode] ?? './src/platform/index.ts', import.meta.url)) } },
  define: { 'import.meta.env.VITE_PLATFORM': JSON.stringify(['playgama', 'pikabu', 'vk'].includes(mode) ? mode : 'yandex') },
  plugins: mode === 'pikabu' ? [withoutLocalSettings] : mode === 'playgama' ? [playgamaBridge({ mode: 'local' }), {
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
    outDir: mode === 'playgama' ? 'dist-playgama' : mode === 'pikabu' ? 'dist-pikabu' : 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
}));
