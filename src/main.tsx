import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Should be empty or contain only truly global, non-conflicting styles
import './mobile.css'; // Mobile-specific optimizations
import { ThemeProvider, BaseStyles } from '@primer/react';
import '@primer/css/dist/primer.css';

// Service worker registration is handled by vite-plugin-pwa

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BaseStyles>
        <App />
      </BaseStyles>
    </ThemeProvider>
  </React.StrictMode>
);
