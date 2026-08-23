import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // data/db.json is rewritten by the backend on every state sync, and
      // .claude/** changes constantly as tool permissions are granted — watching
      // either triggers a full page reload (Vite can't HMR a non-module JSON
      // file), which wipes in-memory UI state like the active sidebar view.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/data/**', '**/.claude/**', '**/.git/**'] },
    },
  };
});
