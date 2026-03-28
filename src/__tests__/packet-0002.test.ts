import { describe, it, expect, beforeEach } from 'vitest';
import { presetService } from '@/lib/presetService';
import { validationService } from '@/lib/validationService';
import { historyStorage } from '@/lib/storage/historyStorage';
import type { HistoryEntry, SimulationInput } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  const now = Date.now();
  return {
    id: 'test-id',
    createdAt: now,
    updatedAt: now,
    presetId: null,
    jeonseDepositKRW: 300_000_000,
    jeonseLoanRatio: 0.8,
    jeonseLoanRateAPR: 3.5,
    monthlyDepositKRW: 50_000_000,
    monthlyRentKRW: 1_200_000,
    monthlyRentIncreaseRateAnnual: 2.0,
    buyPriceKRW: 900_000_000,
    buyEquityKRW: 300_000_000,
    buyLoanRateAPR: 4.0,
    buyLoanPeriodYears: 30,
    buyRepaymentType: '원리금균등',
    initialAssetKRW: 300_000_000,
    stayPeriodYears: 5,
    investmentReturnRateAnnual: 5.0,
    housePriceGrowthRateAnnual: 3.0,
    ...overrides,
  };
}

function makeEntry(id: string, createdAt: number): HistoryEntry {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    label: `테스트 · ${id}`,
    input: makeInput({ id, createdAt, updatedAt: createdAt }),
  };
}

// ─── presetService ────────────────────────────────────────────────────────────

describe('presetService', () => {
  // AC-1
  it('listPresets returns page=1, total=4, items.length=4 with distinct ids', () => {
    const result = presetService.listPresets();
    expect(result.page).toBe(1);
    expect(result.total).toBe(4);
    expect(result.items).toHaveLength(4);

    const ids = result.items.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(4);
  });

  // AC-2: found case
  it('getPresetById returns ok:true with correct id for existing preset', () => {
    const { items } = presetService.listPresets();
    const target = items[0];
    const result = presetService.getPresetById(target.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(target.id);
    }
  });

  // AC-2: not found case
  it('getPresetById returns ok:false with NOT_FOUND for unknown id', () => {
    const result = presetService.getPresetById('does-not-exist');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});

// ─── validationService ────────────────────────────────────────────────────────

describe('validationService', () => {
  // AC-3: stayPeriodYears=0
  it('returns exact error message for stayPeriodYears=0', () => {
    const result = validationService.validate(makeInput({ stayPeriodYears: 0 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.fieldErrors.stayPeriodYears).toBe('거주기간은 1~30년만 가능해요');
    }
  });

  // AC-4: buyEquityKRW > buyPriceKRW
  it('returns exact error message when buyEquityKRW exceeds buyPriceKRW', () => {
    const result = validationService.validate(
      makeInput({ buyPriceKRW: 500_000_000, buyEquityKRW: 600_000_000 })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.fieldErrors.buyEquityKRW).toBe('자기자본은 매매가 이하여야 해요');
    }
  });

  // AC-5: fieldErrors must not contain meta field keys
  it('fieldErrors never contains id, createdAt, or updatedAt keys', () => {
    const result = validationService.validate(makeInput({ stayPeriodYears: 0 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fe = result.error.fieldErrors as Record<string, unknown>;
      expect('id' in fe).toBe(false);
      expect('createdAt' in fe).toBe(false);
      expect('updatedAt' in fe).toBe(false);
    }
  });

  // Happy path
  it('returns ok:true with normalized SimulationInput for valid input', () => {
    const result = validationService.validate(makeInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stayPeriodYears).toBe(5);
      expect(result.value.buyRepaymentType).toBe('원리금균등');
    }
  });

  // UUID fallback for missing id
  it('generates a UUID when input id is missing', () => {
    const input = makeInput({ id: '' });
    const result = validationService.validate(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBeTruthy();
      expect(typeof result.value.id).toBe('string');
    }
  });
});

// ─── historyStorage ───────────────────────────────────────────────────────────

describe('historyStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // AC-6: prepend stores entry correctly
  it('prepend stores entry as first item in localStorage JSON array (length <=5)', () => {
    const entry = makeEntry('e1', Date.now());
    const result = historyStorage.prepend(entry);
    expect(result.ok).toBe(true);

    const raw = localStorage.getItem('rentcheck_history_v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe('e1');
    expect(parsed.length).toBeLessThanOrEqual(5);
  });

  // AC-6: max 5 entries enforced
  it('prepend limits stored entries to 5', () => {
    const now = Date.now();
    for (let i = 1; i <= 7; i++) {
      historyStorage.prepend(makeEntry(`e${i}`, now + i));
    }
    const raw = localStorage.getItem('rentcheck_history_v1');
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBeLessThanOrEqual(5);
  });

  // AC-7: list returns items sorted createdAt DESC
  it('list({page:1}) returns items sorted by createdAt descending', () => {
    const now = Date.now();
    historyStorage.prepend(makeEntry('old', now - 2000));
    historyStorage.prepend(makeEntry('mid', now - 1000));
    historyStorage.prepend(makeEntry('new', now));

    const result = historyStorage.list({ page: 1, pageSize: 10 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const items = result.value.items;
      expect(items.length).toBeLessThanOrEqual(10);
      for (let i = 1; i < items.length; i++) {
        expect(items[i - 1].createdAt).toBeGreaterThanOrEqual(items[i].createdAt);
      }
    }
  });

  // AC-8: page !== 1 returns PAGE_OUT_OF_RANGE
  it('list({page:2}) returns PAGE_OUT_OF_RANGE without throwing', () => {
    const result = historyStorage.list({ page: 2, pageSize: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PAGE_OUT_OF_RANGE');
    }
  });

  // AC-9: parse failure returns STORAGE_PARSE
  it('list returns STORAGE_PARSE when stored value is invalid JSON', () => {
    localStorage.setItem('rentcheck_history_v1', 'not-valid-json{{{');
    const result = historyStorage.list({ page: 1, pageSize: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('STORAGE_PARSE');
    }
  });
});
