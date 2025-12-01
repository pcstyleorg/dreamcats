import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import { ConvexClientProvider } from './ConvexProvider.tsx';
import { SpeedInsights } from '@vercel/speed-insights/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexClientProvider>
      <App />
      <SpeedInsights />
    </ConvexClientProvider>
  </React.StrictMode>,
);
