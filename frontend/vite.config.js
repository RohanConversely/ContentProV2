import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ai-services': fileURLToPath(new URL('../ai-services', import.meta.url)),
    },
  },
  server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
});
