// ── Domain types ──────────────────────────────────────────────────────────────

export type BuyRepaymentType = 'equal_payment' | 'equal_principal';

export interface SimulationInput {
  presetId: PresetScenario['id'] | null;

  // Jeonse
  jeonseDeposit: number;           // 0 ~ 2_000_000_000 (원)
  jeonseLoanRatio: number;         // 0.0 ~ 0.9
  jeonseInterestRate: number;      // 0.0 ~ 0.2 (연)

  // Monthly rent
  monthlyDeposit: number;          // 0 ~ 200_000_000
  monthlyRent: number;             // 0 ~ 10_000_000 (월)
  monthlyRentIncreaseRate: number; // 0.0 ~ 0.2 (연)

  // Buy
  buyPrice: number;                // 0 ~ 3_000_000_000
  buyEquity: number;               // 0 ~ buyPrice
  buyLoanInterestRate: number;     // 0.0 ~ 0.2 (연)
  buyLoanPeriodYears: number;      // 1 ~ 40
  buyRepaymentType: BuyRepaymentType;

  // Common
  initialAsset: number;            // 0 ~ 2_000_000_000
  residencePeriodYears: number;    // 1 ~ 30
  investmentReturnRate: number;    // 0.0 ~ 0.2 (연)
  housePriceGrowthRate: number;    // -0.1 ~ 0.2 (연)
}

export interface PresetScenario {
  id: 'preset_young_jeonse' | 'preset_newlyweds_compare' | 'preset_monthly_invest' | 'preset_buy_focus';
  name: string; // 1~20자
  defaultInput: SimulationInput;
}

export type RecommendedOption = 'jeonse' | 'monthly' | 'buy';

export interface NetWorthPoint {
  year: number;    // 0 ~ residencePeriodYears
  jeonse: number;  // 원, 정수
  monthly: number; // 원, 정수
  buy: number;     // 원, 정수
}

export interface SimulationResult {
  netWorthSeries: NetWorthPoint[]; // length = residencePeriodYears + 1
  finalNetWorth: { jeonse: number; monthly: number; buy: number };
  recommendedOption: RecommendedOption;
  insightCopy: string;
  costBreakdown: {
    jeonse: Record<string, number>;
    monthly: Record<string, number>;
    buy: Record<string, number>;
  };
}

export interface HistoryEntry {
  id: string;        // nanoid/uuid, 8~36자
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms, >= createdAt
  label: string;     // 1~60자
  input: SimulationInput;
  result: SimulationResult;
}

export interface SharePayloadV1 {
  v: 1;
  input: SimulationInput;
}

// ── Storage result types ───────────────────────────────────────────────────────

export type StorageErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_PARSE_ERROR'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_WRITE_FAILED';

export type DraftReadResult =
  | { ok: true; value: SimulationInput }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE_ERROR'; fallback: 'DEFAULT_INPUT' };

export type DraftWriteResult =
  | { ok: true }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA_EXCEEDED' | 'STORAGE_WRITE_FAILED' };

export type HistoryReadResult =
  | { ok: true; value: HistoryEntry[] }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE_ERROR'; fallback: 'EMPTY_ARRAY' };

export type HistoryUpsertResult =
  | { ok: true; value: HistoryEntry[] }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE_ERROR' | 'STORAGE_QUOTA_EXCEEDED' | 'STORAGE_WRITE_FAILED' };

export type HistoryDeleteAllResult =
  | { ok: true }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_WRITE_FAILED' };

// ── Route state types ──────────────────────────────────────────────────────────

export type RouteState =
  | null
  | { presetId: string; source: 'home' | 'history' | 'share' }
  | { input: SimulationInput; source: 'home' | 'history' | 'share' }
  | { source: 'home' | 'history' | 'share' | 'result' }
  | { input: SimulationInput; label: string; source?: 'simulate' | 'history' };
