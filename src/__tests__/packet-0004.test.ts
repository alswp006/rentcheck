import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { HistoryEntry, SimulationInput, PresetScenario } from '@/lib/types';
import HomePage from '@/pages/HomePage';

// ─── react-router-dom mock ────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── @toss/tds-mobile mock ─────────────────────────────────────────────────────

vi.mock('@toss/tds-mobile', () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement('button', { onClick, ...props }, children),
  ListRow: Object.assign(
    ({ children, onClick, ...props }: any) =>
      React.createElement('div', { role: 'listitem', onClick, ...props }, children),
    {
      Text: ({ children }: any) => React.createElement('span', null, children),
      Texts: ({ top, bottom }: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement('span', null, top),
          React.createElement('span', null, bottom),
        ),
    },
  ),
  Spacing: () => React.createElement('div', { 'data-testid': 'spacing' }),
  Paragraph: {
    Text: ({ children, ...props }: any) =>
      React.createElement('span', { ...props }, children),
  },
  Badge: ({ children }: any) => React.createElement('span', null, children),
  AlertDialog: Object.assign(
    ({ open, title, description, alertButton }: any) =>
      open
        ? React.createElement('div', { role: 'alertdialog' }, title, description, alertButton)
        : null,
    {
      AlertButton: ({ children, onClick }: any) =>
        React.createElement('button', { onClick }, children),
    },
  ),
  Toast: ({ open, text }: any) =>
    open ? React.createElement('div', { role: 'status' }, text) : null,
  Tab: Object.assign(
    ({ children }: any) => React.createElement('div', { role: 'tablist' }, children),
    {
      Item: ({ children, selected, onClick }: any) =>
        React.createElement(
          'button',
          { role: 'tab', 'aria-selected': selected, onClick },
          children,
        ),
    },
  ),
  TextField: React.forwardRef(({ label, help, hasError, ...props }: any, ref: any) =>
    React.createElement(
      'div',
      null,
      React.createElement('label', null, label),
      React.createElement('input', { ref, ...props }),
      hasError && help && React.createElement('span', null, help),
    ),
  ),
  Top: Object.assign(
    ({ children }: any) => React.createElement('nav', null, children),
    {
      TitleParagraph: ({ children }: any) => React.createElement('h1', null, children),
    },
  ),
  Border: () => React.createElement('hr'),
  BottomCTA: ({ children }: any) => React.createElement('div', null, children),
  BottomSheet: Object.assign(
    ({ children, open }: any) =>
      open ? React.createElement('div', { role: 'dialog' }, children) : null,
    {
      Header: ({ children }: any) => React.createElement('div', null, children),
    },
  ),
}));

// ─── presetService mock ───────────────────────────────────────────────────────

const mockPresets: PresetScenario[] = [
  {
    id: 'preset-jeonse-gangnam',
    name: '강남 전세 vs 매매',
    defaultInput: {} as SimulationInput,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'preset-monthly-mapo',
    name: '마포 월세 vs 전세',
    defaultInput: {} as SimulationInput,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'preset-buy-nowon',
    name: '노원 매매 시나리오',
    defaultInput: {} as SimulationInput,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'preset-balanced',
    name: '균형 포트폴리오',
    defaultInput: {} as SimulationInput,
    createdAt: 1000,
    updatedAt: 1000,
  },
];

vi.mock('@/lib/presetService', () => ({
  presetService: {
    listPresets: vi.fn(() => ({
      items: mockPresets,
      total: 4,
      page: 1,
    })),
    getPresetById: vi.fn(),
  },
}));

// ─── useHistory mock ──────────────────────────────────────────────────────────

const mockUseHistory = vi.fn();
vi.mock('@/hooks/useHistory', () => ({
  useHistory: () => mockUseHistory(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeHistoryEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: `h-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    label: '테스트 히스토리',
    input: {
      id: 'input-1',
      createdAt: 1000,
      updatedAt: 1000,
      presetId: null,
      jeonseDepositKRW: 300_000_000,
      jeonseLoanRatio: 0.8,
      jeonseLoanRateAPR: 0.04,
      monthlyDepositKRW: 50_000_000,
      monthlyRentKRW: 1_500_000,
      monthlyRentIncreaseRateAnnual: 0.03,
      buyPriceKRW: 500_000_000,
      buyEquityKRW: 200_000_000,
      buyLoanRateAPR: 0.04,
      buyLoanPeriodYears: 30,
      buyRepaymentType: '원리금균등',
      initialAssetKRW: 200_000_000,
      stayPeriodYears: 5,
      investmentReturnRateAnnual: 0.05,
      housePriceGrowthRateAnnual: 0.03,
    },
    ...overrides,
  };
}

function renderHomePage() {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(HomePage)),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('[Page /] 홈: 프리셋 4개 선택 + 최근 히스토리 프리뷰 + 빠른 시작', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: history loaded, no items
    mockUseHistory.mockReturnValue({ loading: false, items: [], error: null });
  });

  it('AC-1: 프리셋 4개가 항상 렌더링된다', () => {
    renderHomePage();

    for (const preset of mockPresets) {
      expect(screen.getByText(preset.name)).toBeTruthy();
    }
  });

  it('AC-1: 프리셋 탭 시 navigate("/input", { state: { presetId } }) 호출', () => {
    renderHomePage();

    // Click the first preset
    const firstPreset = screen.getByText(mockPresets[0].name);
    fireEvent.click(firstPreset.closest('[role="listitem"]') ?? firstPreset);

    expect(mockNavigate).toHaveBeenCalledWith('/input', {
      state: { presetId: mockPresets[0].id },
    });
  });

  it('AC-1: 프리셋 탭 시 navigate state가 RouteState["/input"] 형태(presetId 포함)', () => {
    renderHomePage();

    // Click the last preset to verify different presetId values are passed correctly
    const lastPreset = screen.getByText(mockPresets[3].name);
    fireEvent.click(lastPreset.closest('[role="listitem"]') ?? lastPreset);

    expect(mockNavigate).toHaveBeenCalledWith('/input', {
      state: { presetId: mockPresets[3].id },
    });
  });

  it('AC-2: 히스토리 0개면 빈 상태 문구가 보인다', () => {
    mockUseHistory.mockReturnValue({ loading: false, items: [], error: null });
    renderHomePage();

    // Empty state text should be visible
    expect(screen.getByText(/입력 시작할게요/)).toBeTruthy();
  });

  it('AC-2: 히스토리 0개 시 "입력 시작할게요" 버튼 탭하면 /input으로 이동', () => {
    mockUseHistory.mockReturnValue({ loading: false, items: [], error: null });
    renderHomePage();

    const startButton = screen.getByText(/입력 시작할게요/);
    fireEvent.click(startButton);

    expect(mockNavigate).toHaveBeenCalledWith('/input', expect.anything());
  });

  it('AC-3: 히스토리 2개 이상이면 createdAt 내림차순으로 표시', () => {
    const older = makeHistoryEntry({ id: 'h-older', createdAt: 1000, label: '오래된 항목' });
    const newer = makeHistoryEntry({ id: 'h-newer', createdAt: 9000, label: '최근 항목' });
    mockUseHistory.mockReturnValue({ loading: false, items: [older, newer], error: null });

    renderHomePage();

    const items = screen.getAllByRole('listitem');
    const texts = items.map((el) => el.textContent ?? '');
    const newerIdx = texts.findIndex((t) => t.includes('최근 항목'));
    const olderIdx = texts.findIndex((t) => t.includes('오래된 항목'));

    // newerIdx should appear before olderIdx in the DOM
    expect(newerIdx).toBeGreaterThanOrEqual(0);
    expect(olderIdx).toBeGreaterThanOrEqual(0);
    expect(newerIdx).toBeLessThan(olderIdx);
  });

  it('AC-3: 히스토리 항목 탭 시 navigate("/result", { state: { input, historyId } }) 호출', () => {
    const entry = makeHistoryEntry({ id: 'h-test', label: '강남 전세 기록' });
    mockUseHistory.mockReturnValue({ loading: false, items: [entry], error: null });

    renderHomePage();

    const historyItem = screen.getByText('강남 전세 기록');
    fireEvent.click(historyItem.closest('[role="listitem"]') ?? historyItem);

    expect(mockNavigate).toHaveBeenCalledWith('/result', {
      state: { input: entry.input, historyId: entry.id },
    });
  });

  it('AC-4: 로딩 중에는 "불러오고 있어요" 텍스트가 보인다', () => {
    mockUseHistory.mockReturnValue({ loading: true, items: [], error: null });
    renderHomePage();

    expect(screen.getByText(/불러오고 있어요/)).toBeTruthy();
  });

  it('AC-4: 로딩 종료 후 빈 상태로 전환된다', () => {
    mockUseHistory.mockReturnValue({ loading: true, items: [], error: null });
    const { rerender } = render(
      React.createElement(MemoryRouter, null, React.createElement(HomePage)),
    );

    expect(screen.getByText(/불러오고 있어요/)).toBeTruthy();

    // Simulate loading complete with no items
    mockUseHistory.mockReturnValue({ loading: false, items: [], error: null });
    rerender(React.createElement(MemoryRouter, null, React.createElement(HomePage)));

    expect(screen.queryByText(/불러오고 있어요/)).toBeNull();
    expect(screen.getByText(/입력 시작할게요/)).toBeTruthy();
  });
});
