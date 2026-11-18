import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { brixPwa } from './scripts/pwa/vite-plugin';

// Bibliothèques rangées dans leurs propres fichiers : elles changent rarement, le navigateur les garde en cache
// d'une version à l'autre, et le fichier principal de l'appli reste petit.
const VENDORS: [string, RegExp][] = [
  ['react', /node_modules\/(react|react-dom|scheduler)\//],
  ['router', /node_modules\/(react-router|react-router-dom|@remix-run)\//],
  ['vendor', /node_modules\/(tailwind-merge|clsx|zustand|use-sync-external-store)\//],
];

// Sans worker (vite / vite preview), l'appli tourne en local : /api/* répond « pas de cloud » (200, ok: false)
// au lieu d'un 404, pour que la console reste propre. Avec le worker, l'API est servie par lui.
const pasDeCloud: Plugin = {
  name: 'brix-api-absente',
  configureServer(server) {
    server.middlewares.use('/api/', (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'no-store');
      res.end(JSON.stringify({ ok: false, disponible: false, demo: false, horsLigne: true }));
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/', (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'no-store');
      res.end(JSON.stringify({ ok: false, disponible: false, demo: false, horsLigne: true }));
    });
  },
};

export default defineConfig({
  base: './',
  plugins: [react(), brixPwa(), pasDeCloud],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Regroupe les tout petits fichiers (icônes partagées, aides) : moins de requêtes au démarrage.
        experimentalMinChunkSize: 12_000,
        manualChunks(id) {
          for (const [name, re] of VENDORS) if (re.test(id)) return name;
          return undefined;
        },
      },
    },
  },
  // Le site vitrine (site/) a ses propres dépendances : on ne le parcourt pas au pré-empaquetage.
  optimizeDeps: { entries: ['index.html'] },
  server: { port: 5173, host: true },
});
