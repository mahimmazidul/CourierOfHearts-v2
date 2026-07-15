import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const useSingleFile = process.env.VITE_SINGLEFILE === 'true';

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      ...(useSingleFile ? [viteSingleFile()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      cssCodeSplit: !useSingleFile,
      assetsInlineLimit: useSingleFile ? undefined : 0,
    },
  };
});
