import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@toss/tds-mobile', () => ({
  ThemeProvider: ({ children }: any) => children,
  Paragraph: {
    Text: ({ children, ...props }: any) => React.createElement('span', props, children),
  },
}));

// Stub all page components to isolate routing tests
vi.mock('@/pages/HomePage', () => ({ default: () => React.createElement('div', { 'data-testid': 'home-page' }) }));
vi.mock('@/pages/SimulatePage', () => ({ default: () => React.createElement('div', { 'data-testid': 'simulate-page' }) }));
vi.mock('@/pages/ResultPage', () => ({ default: () => React.createElement('div', { 'data-testid': 'result-page' }) }));
vi.mock('@/pages/HistoryPage', () => ({ default: () => React.createElement('div', { 'data-testid': 'history-page' }) }));
vi.mock('@/pages/SharePage', () => ({ default: () => React.createElement('div', { 'data-testid': 'share-page' }) }));
vi.mock('@/lib/state/StorageSessionContext', () => ({
  StorageSessionProvider: ({ children }: any) => children,
  useStorageSession: () => ({ isFirstVisit: false, setVisited: vi.fn() }),
}));

import App from '@/App';

function renderAt(path: string) {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App))
  );
}

describe('App routing — packet-0000', () => {
  it('renders HomePage at /', () => {
    renderAt('/');
    expect(screen.getByTestId('home-page')).toBeTruthy();
  });

  it('renders SimulatePage at /simulate', () => {
    renderAt('/simulate');
    expect(screen.getByTestId('simulate-page')).toBeTruthy();
  });

  it('renders ResultPage at /result', () => {
    renderAt('/result');
    expect(screen.getByTestId('result-page')).toBeTruthy();
  });

  it('renders HistoryPage at /history', () => {
    renderAt('/history');
    expect(screen.getByTestId('history-page')).toBeTruthy();
  });

  it('renders SharePage at /share', () => {
    renderAt('/share');
    expect(screen.getByTestId('share-page')).toBeTruthy();
  });
});
