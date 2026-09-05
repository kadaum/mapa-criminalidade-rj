import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Standalone development: no account, deployment credentials or Sites plugin.
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  optimizeDeps: { exclude: ['maplibre-gl'] },
  plugins: [vinext()],
});
