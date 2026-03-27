import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './lib/state/AppProvider';
import { storageAdapter } from './lib/storage/localStorageAdapter';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider storage={storageAdapter}>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
