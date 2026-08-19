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

// Rebuilt new-edition table (local play) lives behind ?newtable while the
// ground-up rebuild is in progress.
const useNewTable = new URLSearchParams(window.location.search).has('newtable');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {useNewTable ? (
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
