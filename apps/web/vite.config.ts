import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
type PrecacheBundle = Record<string, unknown>;
type PrecacheContext = { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => void };

const precacheManifestPlugin = {
  name: 'agriexpert-precache-manifest',
  generateBundle(this: PrecacheContext, _options: unknown, bundle: PrecacheBundle) {
    const builtAssets = Object.keys(bundle).filter((fileName) => fileName.startsWith('assets/')).map((fileName) => `/${fileName}`);
    const publicAssets = ['/', '/index.html', '/manifest.webmanifest', '/sw.js', '/brand/app-icon.svg', '/brand/app-icon-32.png', '/brand/app-icon-180.png', '/brand/app-icon-192.png', '/brand/app-icon-512.png'];
    this.emitFile({ type: 'asset', fileName: 'precache-manifest.json', source: JSON.stringify([...new Set([...publicAssets, ...builtAssets])]) });
  },
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [precacheManifestPlugin],
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
