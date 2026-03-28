import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { simulationService } from '@/lib/simulationService';
import { shareService } from '@/lib/shareService';
import { lastInputStorage } from '@/lib/storage/lastInputStorage';
import type { SimulationInput, HistoryEntry } from '@/lib/types';

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@toss/tds-mobile', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}));

// Predefined mock history items (referenced inside factory via inline value)
vi.mock('@/lib/storage/historyStorage', () => {
  const mockItems: HistoryEntry[] = [
    {
      id: 'h1',
      createdAt: 1000,
      updatedAt: 1000,
      label: '강남 전세 시나리오',
      input: {} as SimulationInput,
    },
  ];
  return {
    historyStorage: {
      list: vi.fn(() => ({
        ok: true,
        value: { items: mockItems, total: 1, page: 1 },
      })),
      prepend: vi.fn(),
      mockItems, // expose for assertion
    },
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    id: 'test-id',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
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
    ...overrides,
  };
}

// ─── simulationService.calculate() ───────────────────────────────────────────

describe('simulationService.calculate()', () => {
  it('AC1: success — results.length===3, order JEONSE/MONTHLY/BUY', () => {
    const result = simulationService.calculate(makeInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.results).toHaveLength(3);
    expect(result.value.results[0].option).toBe('JEONSE');
    expect(result.value.results[1].option).toBe('MONTHLY');
    expect(result.value.results[2].option).toBe('BUY');
  });

  it('AC2: netWorthByYearKRW.length === stayPeriodYears + 1 for all options', () => {
    const stayPeriodYears = 7;
    const result = simulationService.calculate(makeInput({ stayPeriodYears }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const opt of result.value.results) {
      expect(opt.netWorthByYearKRW).toHaveLength(stayPeriodYears + 1);
    }
  });

  it('AC3: jeonseLoanRatio=1.5 returns ok:false / INVALID_INPUT (no throw)', () => {
    const result = simulationService.calculate(makeInput({ jeonseLoanRatio: 1.5 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_INPUT');
  });

  it('AC4: NaN in computed values returns ok:false / CALC_ERROR (no throw)', () => {
    const spy = vi.spyOn(Math, 'pow').mockReturnValue(NaN);
    try {
      const result = simulationService.calculate(makeInput());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CALC_ERROR');
      }
    } finally {
      spy.mockRestore();
    }
  });
});

// ─── shareService ─────────────────────────────────────────────────────────────

describe('shareService.buildShareUrl()', () => {
  it('AC5: url contains "?v=1&s=", payload.version===1', () => {
    const result = shareService.buildShareUrl(makeInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.url).toContain('?v=1&s=');
    expect(result.value.payload.version).toBe(1);
  });
});

describe('shareService.parseShareSearch()', () => {
  it('AC6: v!==1 returns ok:false / UNSUPPORTED_VERSION', () => {
    const result = shareService.parseShareSearch('?v=2&s=abc');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNSUPPORTED_VERSION');
  });

  it('AC7: invalid base64 returns ok:false / DECODE_ERROR (no throw)', () => {
    const result = shareService.parseShareSearch('?v=1&s=!!!invalid!!!');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('DECODE_ERROR');
  });

  it('round-trip: buildShareUrl → parseShareSearch recovers input', () => {
    const input = makeInput();
    const built = shareService.buildShareUrl(input);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    // Extract the query string portion
    const queryStart = built.value.url.indexOf('?');
    const search = built.value.url.slice(queryStart);

    const parsed = shareService.parseShareSearch(search);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.input.jeonseDepositKRW).toBe(input.jeonseDepositKRW);
    expect(parsed.value.input.stayPeriodYears).toBe(input.stayPeriodYears);
  });
});

// ─── lastInputStorage ────────────────────────────────────────────────────────

describe('lastInputStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('AC8: load() with no stored value returns ok:true / value===null', () => {
    const result = lastInputStorage.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('AC9: save() returns ok:false / STORAGE_QUOTA when QuotaExceededError is thrown', () => {
    const quotaErr = new DOMException('quota exceeded', 'QuotaExceededError');
    // Mock only the actual data key so isLocalStorageAvailable() still passes
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      if (key === 'rentcheck_last_input_v1') {
        throw quotaErr;
      }
    });

    const result = lastInputStorage.save(makeInput(), Date.now());

    vi.restoreAllMocks();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('STORAGE_QUOTA');
  });

  it('save() then load() round-trip returns the saved snapshot', () => {
    const input = makeInput();
    const now = 1_700_000_000_000;
    const saveResult = lastInputStorage.save(input, now);
    expect(saveResult.ok).toBe(true);

    const loadResult = lastInputStorage.load();
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(loadResult.value).not.toBeNull();
    expect(loadResult.value!.version).toBe(1);
    expect(loadResult.value!.input.id).toBe(input.id);
  });
});

// ─── useHistory ───────────────────────────────────────────────────────────────

describe('useHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('AC10: loading starts true, becomes false within 200ms, items match storage result', async () => {
    const { useHistory } = await import('@/hooks/useHistory');

    const { result } = renderHook(() => useHistory());

    // Immediately after render, loading should be true
    expect(result.current.loading).toBe(true);

    // Advance timers to trigger the setTimeout(0) callback
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Loading resolved
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    // Items should be the mocked history storage result
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('h1');
  });
});
