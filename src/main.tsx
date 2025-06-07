import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Should be empty or contain only truly global, non-conflicting styles
import { ThemeProvider, BaseStyles } from '@primer/react';
import '@primer/primitives/dist/css/primitives.css';
import '@primer/primitives/dist/css/functional/themes/light.css';

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider colorMode="night" nightScheme="dark">
      {' '}
      {/* Explicitly set nightScheme to dark */}
      <BaseStyles>
        <App />
      </BaseStyles>
    </ThemeProvider>
  </React.StrictMode>
);
