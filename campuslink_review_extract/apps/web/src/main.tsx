import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { ThemeProvider } from './app/providers/ThemeProvider';
import { PwaPrompt } from './components/shared/PwaPrompt';
import './styles/refinement.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <PwaPrompt />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
