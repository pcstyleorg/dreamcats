import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConvexClientProvider } from './ConvexProvider.tsx';
import { GameProvider } from './context/GameContext.tsx';
import { TutorialProvider } from './context/TutorialContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexClientProvider>
      <GameProvider>
        <TutorialProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </TutorialProvider>
      </GameProvider>
    </ConvexClientProvider>
  </React.StrictMode>,
);
