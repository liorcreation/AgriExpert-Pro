import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/design-system.css';
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    void import('./lib/offlineQueue').then(({ syncOfflineDrafts }) => syncOfflineDrafts()).catch(() => undefined);
  });
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'AGRIEXPERT_SYNC_REQUESTED') return;
    window.dispatchEvent(new Event('agriexpert:offline-sync'));
    void import('./lib/offlineQueue').then(({ syncOfflineDrafts }) => syncOfflineDrafts()).catch(() => undefined);
  });
}
