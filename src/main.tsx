import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import { ConvexClientProvider } from './ConvexProvider.tsx';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { preloadCardImages } from './lib/cardAssets';
import { TableApp } from './table/TableApp';

// preload card images early for instant card flips
preloadCardImages();

// The rebuilt new-edition table is the default experience. The classic
// multiplayer app (old rules) remains reachable via ?classic until its
// backend is ported to the new engine. ?newtable is kept as an alias.
const params = new URLSearchParams(window.location.search);
const useClassic = params.has('classic');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {!useClassic ? (
      <TableApp />
    ) : (
      <ConvexClientProvider>
        <App />
        <Analytics />
        <SpeedInsights />
      </ConvexClientProvider>
    )}
  </React.StrictMode>,
);
