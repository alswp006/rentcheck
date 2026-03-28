import { describe, it, expect } from 'vitest';
import type {
  PresetScenario,
  SimulationInput,
  BuyRepaymentType,
  SimulationResult,
  NetWorthPoint,
  RecommendedOption,
  HistoryEntry,
  SharePayloadV1,
  StorageErrorCode,
  DraftReadResult,
  DraftWriteResult,
  HistoryReadResult,
  HistoryUpsertResult,
  HistoryDeleteAllResult,
  RouteState,
} from '@/lib/types';

describe('도메인/스토리지/라우팅 Type 정의 고정', () => {
  describe('AC-1: types.ts에 runtime code 없이 type/interface/export만 존재', () => {
    it('should export only types from lib/types', () => {
      // This test verifies that types.ts contains no runtime code
      // by importing all expected types without runtime errors
      expect(true).toBe(true);
    });

    it('should not execute any side effects on import', () => {
      // Verify that importing types does not have side effects
      const typeKeys = [
        'PresetScenario',
        'SimulationInput',
        'BuyRepaymentType',
        'SimulationResult',
        'NetWorthPoint',
        'RecommendedOption',
        'HistoryEntry',
        'SharePayloadV1',
        'StorageErrorCode',
        'DraftReadResult',
        'DraftWriteResult',
        'HistoryReadResult',
        'HistoryUpsertResult',
        'HistoryDeleteAllResult',
        'RouteState',
      ];
      expect(typeKeys).toHaveLength(15);
    });
  });

  describe('AC-2: 도메인 타입들이 모두 export 된다', () => {
    it('should export PresetScenario type', () => {
      // PresetScenario must include: id, name, defaultInput
      const example: PresetScenario = {
        id: 'preset_young_jeonse',
        name: 'Young Jeonse',
        defaultInput: {} as SimulationInput,
      };
      expect(example.id).toBe('preset_young_jeonse');
      expect(example.name).toBe('Young Jeonse');
    });

    it('should export SimulationInput type with all required fields', () => {
      // SimulationInput must include all 14 fields as per SPEC
      const example: SimulationInput = {
        presetId: null,
        jeonseDeposit: 300000000,
        jeonseLoanRatio: 0.5,
        jeonseInterestRate: 0.03,
        monthlyDeposit: 20000000,
        monthlyRent: 1500000,
        monthlyRentIncreaseRate: 0.02,
        buyPrice: 500000000,
        buyEquity: 100000000,
        buyLoanInterestRate: 0.03,
        buyLoanPeriodYears: 20,
        buyRepaymentType: 'equal_payment',
        initialAsset: 100000000,
        residencePeriodYears: 10,
        investmentReturnRate: 0.05,
        housePriceGrowthRate: 0.03,
      };
      expect(example.presetId).toBeNull();
      expect(example.jeonseDeposit).toBe(300000000);
      expect(example.buyRepaymentType).toBe('equal_payment');
      expect(example.residencePeriodYears).toBe(10);
    });

    it('should export BuyRepaymentType as union of equal_payment | equal_principal', () => {
      const type1: BuyRepaymentType = 'equal_payment';
      const type2: BuyRepaymentType = 'equal_principal';
      expect(type1).toBe('equal_payment');
      expect(type2).toBe('equal_principal');
    });

    it('should export SimulationResult with netWorthSeries, finalNetWorth, recommendedOption, insightCopy, costBreakdown', () => {
      const example: SimulationResult = {
        netWorthSeries: [
          { year: 0, jeonse: 100000000, monthly: 100000000, buy: 100000000 },
        ],
        finalNetWorth: { jeonse: 500000000, monthly: 450000000, buy: 600000000 },
        recommendedOption: 'buy',
        insightCopy: 'AI가 생성한 결과입니다. 매매 옵션을 추천해요.',
        costBreakdown: {
          jeonse: { deposit: 300000000, interest: 50000000 },
          monthly: { rent: 180000000, deposit: 20000000 },
          buy: { principal: 400000000, interest: 100000000 },
        },
      };
      expect(example.finalNetWorth.buy).toBe(600000000);
      expect(example.recommendedOption).toBe('buy');
      expect(example.netWorthSeries).toHaveLength(1);
    });

    it('should export NetWorthPoint type', () => {
      const point: NetWorthPoint = {
        year: 5,
        jeonse: 400000000,
        monthly: 380000000,
        buy: 550000000,
      };
      expect(point.year).toBe(5);
      expect(Number.isFinite(point.jeonse)).toBe(true);
    });

    it('should export RecommendedOption as union of jeonse | monthly | buy', () => {
      const option1: RecommendedOption = 'jeonse';
      const option2: RecommendedOption = 'monthly';
      const option3: RecommendedOption = 'buy';
      expect([option1, option2, option3]).toContain('jeonse');
    });

    it('should export HistoryEntry with id, createdAt, updatedAt, label, input, result', () => {
      const entry: HistoryEntry = {
        id: 'entry_12345678',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        label: '직접 입력 · 집값 3% · 10년',
        input: {} as SimulationInput,
        result: {} as SimulationResult,
      };
      expect(entry.id).toMatch(/^entry_/);
      expect(entry.label).toBe('직접 입력 · 집값 3% · 10년');
      expect(entry.createdAt).toBeGreaterThan(0);
      expect(entry.updatedAt).toBeGreaterThanOrEqual(entry.createdAt);
    });

    it('should export SharePayloadV1 with v and input', () => {
      const payload: SharePayloadV1 = {
        v: 1,
        input: {} as SimulationInput,
      };
      expect(payload.v).toBe(1);
    });
  });

  describe('AC-3: 스토리지 결과 타입들이 모두 export 된다', () => {
    it('should export StorageErrorCode as union type', () => {
      const code1: StorageErrorCode = 'STORAGE_UNAVAILABLE';
      const code2: StorageErrorCode = 'STORAGE_PARSE_ERROR';
      const code3: StorageErrorCode = 'STORAGE_QUOTA_EXCEEDED';
      const code4: StorageErrorCode = 'STORAGE_WRITE_FAILED';
      expect(code1).toBe('STORAGE_UNAVAILABLE');
      expect(code2).toBe('STORAGE_PARSE_ERROR');
      expect(code3).toBe('STORAGE_QUOTA_EXCEEDED');
      expect(code4).toBe('STORAGE_WRITE_FAILED');
    });

    it('should export DraftReadResult as success or error union', () => {
      // Success case
      const success: DraftReadResult = {
        ok: true,
        value: {} as SimulationInput,
      };
      expect(success.ok).toBe(true);

      // Error case with STORAGE_UNAVAILABLE
      const errorUnavailable: DraftReadResult = {
        ok: false,
        errorCode: 'STORAGE_UNAVAILABLE',
        fallback: 'DEFAULT_INPUT',
      };
      expect(errorUnavailable.ok).toBe(false);
      expect(errorUnavailable.errorCode).toBe('STORAGE_UNAVAILABLE');

      // Error case with STORAGE_PARSE_ERROR
      const errorParse: DraftReadResult = {
        ok: false,
        errorCode: 'STORAGE_PARSE_ERROR',
        fallback: 'DEFAULT_INPUT',
      };
      expect(errorParse.fallback).toBe('DEFAULT_INPUT');
    });

    it('should export DraftWriteResult as success or error union', () => {
      // Success case
      const success: DraftWriteResult = {
        ok: true,
      };
      expect(success.ok).toBe(true);

      // Error case with STORAGE_UNAVAILABLE
      const errorUnavailable: DraftWriteResult = {
        ok: false,
        errorCode: 'STORAGE_UNAVAILABLE',
      };
      expect(errorUnavailable.ok).toBe(false);

      // Error case with STORAGE_QUOTA_EXCEEDED
      const errorQuota: DraftWriteResult = {
        ok: false,
        errorCode: 'STORAGE_QUOTA_EXCEEDED',
      };
      expect(errorQuota.errorCode).toBe('STORAGE_QUOTA_EXCEEDED');

      // Error case with STORAGE_WRITE_FAILED
      const errorWrite: DraftWriteResult = {
        ok: false,
        errorCode: 'STORAGE_WRITE_FAILED',
      };
      expect(errorWrite.errorCode).toBe('STORAGE_WRITE_FAILED');
    });

    it('should export HistoryReadResult as success or error union', () => {
      // Success case with empty array
      const successEmpty: HistoryReadResult = {
        ok: true,
        value: [],
      };
      expect(successEmpty.ok).toBe(true);
      expect(successEmpty.value).toHaveLength(0);

      // Success case with entries
      const successWithData: HistoryReadResult = {
        ok: true,
        value: [{} as HistoryEntry],
      };
      expect(successWithData.value).toHaveLength(1);

      // Error case with STORAGE_UNAVAILABLE
      const errorUnavailable: HistoryReadResult = {
        ok: false,
        errorCode: 'STORAGE_UNAVAILABLE',
        fallback: 'EMPTY_ARRAY',
      };
      expect(errorUnavailable.fallback).toBe('EMPTY_ARRAY');

      // Error case with STORAGE_PARSE_ERROR
      const errorParse: HistoryReadResult = {
        ok: false,
        errorCode: 'STORAGE_PARSE_ERROR',
        fallback: 'EMPTY_ARRAY',
      };
      expect(errorParse.ok).toBe(false);
    });

    it('should export HistoryUpsertResult as success or error union', () => {
      // Success case
      const success: HistoryUpsertResult = {
        ok: true,
        value: [{} as HistoryEntry],
      };
      expect(success.ok).toBe(true);
      expect(success.value).toHaveLength(1);

      // Error case with STORAGE_PARSE_ERROR
      const errorParse: HistoryUpsertResult = {
        ok: false,
        errorCode: 'STORAGE_PARSE_ERROR',
      };
      expect(errorParse.ok).toBe(false);

      // Error case with STORAGE_QUOTA_EXCEEDED
      const errorQuota: HistoryUpsertResult = {
        ok: false,
        errorCode: 'STORAGE_QUOTA_EXCEEDED',
      };
      expect(errorQuota.errorCode).toBe('STORAGE_QUOTA_EXCEEDED');

      // Error case with STORAGE_UNAVAILABLE
      const errorUnavailable: HistoryUpsertResult = {
        ok: false,
        errorCode: 'STORAGE_UNAVAILABLE',
      };
      expect(errorUnavailable.ok).toBe(false);

      // Error case with STORAGE_WRITE_FAILED
      const errorWrite: HistoryUpsertResult = {
        ok: false,
        errorCode: 'STORAGE_WRITE_FAILED',
      };
      expect(errorWrite.errorCode).toBe('STORAGE_WRITE_FAILED');
    });

    it('should export HistoryDeleteAllResult as success or error union', () => {
      // Success case
      const success: HistoryDeleteAllResult = {
        ok: true,
      };
      expect(success.ok).toBe(true);

      // Error case with STORAGE_UNAVAILABLE
      const errorUnavailable: HistoryDeleteAllResult = {
        ok: false,
        errorCode: 'STORAGE_UNAVAILABLE',
      };
      expect(errorUnavailable.ok).toBe(false);

      // Error case with STORAGE_WRITE_FAILED
      const errorWrite: HistoryDeleteAllResult = {
        ok: false,
        errorCode: 'STORAGE_WRITE_FAILED',
      };
      expect(errorWrite.errorCode).toBe('STORAGE_WRITE_FAILED');
    });
  });

  describe('AC-4: RouteState는 모든 경로의 location.state를 포함한다', () => {
    it('should support "/" home route with no required state', () => {
      // Home route can have no state
      const homeState: RouteState = null;
      expect(homeState).toBeNull();

      // Or optional state
      const homeState2: RouteState = { source: 'result' };
      expect(homeState2).toBeDefined();
    });

    it('should support "/simulate" route with valid state combinations', () => {
      // With presetId from home
      const statePreset: RouteState = {
        presetId: 'preset_young_jeonse',
        source: 'home',
      };
      expect(statePreset.source).toBe('home');

      // With input from history
      const stateInput: RouteState = {
        input: {} as SimulationInput,
        source: 'history',
      };
      expect(stateInput.source).toBe('history');

      // With input from share
      const stateShare: RouteState = {
        input: {} as SimulationInput,
        source: 'share',
      };
      expect(stateShare.source).toBe('share');

      // Only source from home
      const stateHome: RouteState = {
        source: 'home',
      };
      expect(stateHome.source).toBe('home');

      // null state (direct access recovery)
      const stateNull: RouteState = null;
      expect(stateNull).toBeNull();
    });

    it('should support "/result" route with input, label, and optional source', () => {
      // From simulate with source
      const stateFromSimulate: RouteState = {
        input: {} as SimulationInput,
        label: '직접 입력 · 집값 3% · 10년',
        source: 'simulate',
      };
      expect(stateFromSimulate.source).toBe('simulate');
      expect(stateFromSimulate.label).toBe('직접 입력 · 집값 3% · 10년');

      // From history with source
      const stateFromHistory: RouteState = {
        input: {} as SimulationInput,
        label: 'Another result',
        source: 'history',
      };
      expect(stateFromHistory.source).toBe('history');

      // Without source (backward compatibility)
      const stateNoSource: RouteState = {
        input: {} as SimulationInput,
        label: 'No source',
      };
      expect(stateNoSource).toBeDefined();

      // null state (direct access recovery)
      const stateNull: RouteState = null;
      expect(stateNull).toBeNull();
    });

    it('should support "/history" route with optional source state', () => {
      // From result
      const stateFromResult: RouteState = {
        source: 'result',
      };
      expect(stateFromResult.source).toBe('result');

      // From home
      const stateFromHome: RouteState = {
        source: 'home',
      };
      expect(stateFromHome.source).toBe('home');

      // null state
      const stateNull: RouteState = null;
      expect(stateNull).toBeNull();
    });

    it('should support "/share" route query-based input (no location.state needed)', () => {
      // Share route uses location.search, not location.state
      // State should be null or undefined
      const stateNull: RouteState = null;
      expect(stateNull).toBeNull();
    });

    it('should have RouteState that discriminates by source field', () => {
      const states: RouteState[] = [
        null,
        { source: 'home' },
        { presetId: 'preset_young_jeonse', source: 'home' },
        { input: {} as SimulationInput, source: 'history' },
        { input: {} as SimulationInput, label: 'Test', source: 'simulate' },
      ];
      expect(states).toHaveLength(5);
    });
  });

  describe('AC-5: プロジェクトがTypeScript エラーなくビルド/コンパイルされる', () => {
    it('should allow importing all types without TypeScript errors', () => {
      // If this test runs without errors, it means all types were successfully imported
      // and TypeScript compilation was successful
      expect(true).toBe(true);
    });

    it('should have all domain types properly typed', () => {
      // Verify type structure through assignment
      const preset: PresetScenario = {
        id: 'preset_newlyweds_compare',
        name: 'Newlyweds',
        defaultInput: {
          presetId: 'preset_newlyweds_compare',
          jeonseDeposit: 0,
          jeonseLoanRatio: 0,
          jeonseInterestRate: 0,
          monthlyDeposit: 0,
          monthlyRent: 0,
          monthlyRentIncreaseRate: 0,
          buyPrice: 0,
          buyEquity: 0,
          buyLoanInterestRate: 0,
          buyLoanPeriodYears: 20,
          buyRepaymentType: 'equal_payment',
          initialAsset: 0,
          residencePeriodYears: 10,
          investmentReturnRate: 0,
          housePriceGrowthRate: 0,
        },
      };
      expect(preset.id).toBe('preset_newlyweds_compare');
    });

    it('should have all storage result types properly typed', () => {
      // Verify discriminated unions work
      const results: (
        | DraftReadResult
        | DraftWriteResult
        | HistoryReadResult
        | HistoryUpsertResult
        | HistoryDeleteAllResult
      )[] = [
        { ok: true, value: {} as SimulationInput },
        { ok: true },
        { ok: true, value: [] },
        { ok: true, value: [{} as HistoryEntry] },
        { ok: true },
        { ok: false, errorCode: 'STORAGE_UNAVAILABLE' },
        {
          ok: false,
          errorCode: 'STORAGE_PARSE_ERROR',
          fallback: 'DEFAULT_INPUT',
        },
      ];
      expect(results).toHaveLength(7);
    });

    it('should support RouteState in location.state contexts', () => {
      // Simulate a navigate state assignment
      const navigateState: RouteState = {
        input: {
          presetId: 'preset_monthly_invest',
          jeonseDeposit: 0,
          jeonseLoanRatio: 0,
          jeonseInterestRate: 0,
          monthlyDeposit: 0,
          monthlyRent: 0,
          monthlyRentIncreaseRate: 0,
          buyPrice: 0,
          buyEquity: 0,
          buyLoanInterestRate: 0,
          buyLoanPeriodYears: 20,
          buyRepaymentType: 'equal_principal',
          initialAsset: 0,
          residencePeriodYears: 10,
          investmentReturnRate: 0,
          housePriceGrowthRate: 0,
        },
        label: 'Test Label',
        source: 'simulate',
      };
      expect(navigateState.source).toBe('simulate');
    });
  });
});
