import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import { ConvexClientProvider } from './ConvexProvider.tsx';
// Temporarily disabled for debugging navigation issues
// import { Analytics } from '@vercel/analytics/react';
// import { SpeedInsights } from '@vercel/speed-insights/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexClientProvider>
      <App />
      {/* Temporarily disabled for debugging navigation issues */}
      {/* <Analytics />
      <SpeedInsights /> */}
    </ConvexClientProvider>
  </React.StrictMode>,
);
