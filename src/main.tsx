// @AI:ANCHOR — 이 파일은 scaffold가 생성합니다. 코딩 에이전트가 수정하지 마세요.
// Provider 추가가 필요하면 App.tsx를 수정하세요.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@toss/tds-mobile';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
