import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Should be empty or contain only truly global, non-conflicting styles
import { ThemeProvider, BaseStyles } from '@primer/react';
import '@primer/primitives/dist/css/primitives.css';
import '@primer/primitives/dist/css/functional/themes/light.css';

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
