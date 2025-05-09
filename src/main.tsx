import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Should be empty or contain only truly global, non-conflicting styles
import {ThemeProvider, BaseStyles} from '@primer/react';
import '@primer/primitives/dist/css/functional/themes/dark.css'; // Import dark theme CSS

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider colorMode="night" nightScheme="dark"> {/* Explicitly set nightScheme to dark */}
      <BaseStyles>
        <App />
      </BaseStyles>
    </ThemeProvider>
  </React.StrictMode>,
);
