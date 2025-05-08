import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {ThemeProvider, BaseStyles} from '@primer/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BaseStyles>
        <App />
      </BaseStyles>
    </ThemeProvider>
  </React.StrictMode>,
);
