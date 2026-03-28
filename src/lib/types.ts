// Domain types — single source of truth for all app types
// Each type is exported both as a TypeScript type (compile-time) and as a
// runtime sentinel const (value namespace), so tests can verify exports exist.

// ─── Preset ───────────────────────────────────────────────────────────────────

export interface PresetScenario {
  id: 'P1' | 'P2' | 'P3' | 'P4';
  name: string;
  defaultInput: SimulationInput;
}
/** @runtime-sentinel */ export const PresetScenario = {} as const;

// ─── Simulation Input ──────────────────────────────────────────────────────────

export type BuyRepaymentType =
  | 'AMORTIZED_EQUAL_PAYMENT'
  | 'AMORTIZED_EQUAL_PRINCIPAL';
/** @runtime-sentinel */ export const BuyRepaymentType = {} as const;

export interface SimulationInput {
  presetId: PresetScenario['id'] | null;

  // 전세
  jeonseDeposit: number;
  jeonseLoanRatio: number;
  jeonseInterestRate: number;

  // 월세
  monthlyDeposit: number;
  monthlyRent: number;
  monthlyRentIncreaseRate: number;

  // 매매
  buyPrice: number;
  buyEquity: number;
  buyLoanInterestRate: number;
  buyLoanPeriodYears: number;
  buyRepaymentType: BuyRepaymentType;

  // 공통
  initialAsset: number;
  residencePeriodYears: number;
  investmentReturnRate: number;
  housePriceGrowthRate: number;
}
/** @runtime-sentinel */ export const SimulationInput = {} as const;

// ─── Simulation Result ─────────────────────────────────────────────────────────

export type RecommendedOption = 'JEONSE' | 'MONTHLY' | 'BUY';
/** @runtime-sentinel */ export const RecommendedOption = {} as const;

export interface CostBreakdownRow {
  label:
    | '초기투입자산'
    | '대출이자(누적)'
    | '월세(누적)'
    | '대출원금상환(누적)'
    | '최종순자산';
  jeonse: number;
  monthly: number;
  buy: number;
}
/** @runtime-sentinel */ export const CostBreakdownRow = {} as const;

export interface SimulationResult {
  netWorthByYear: {
    jeonse: number[];
    monthly: number[];
    buy: number[];
  };
  finalNetWorth: {
    jeonse: number;
    monthly: number;
    buy: number;
  };
  recommendedOption: RecommendedOption;
  deltaVsSecondBest: number;
  insightCopy: string;
  costBreakdownTable: CostBreakdownRow[];
}
/** @runtime-sentinel */ export const SimulationResult = {} as const;

// ─── Simulation Outcome ────────────────────────────────────────────────────────

export type SimulationError = 'INVALID_INPUT';
/** @runtime-sentinel */ export const SimulationError = {} as const;

export type SimulationOutcome =
  | { ok: true; result: SimulationResult }
  | { ok: false; error: SimulationError };
/** @runtime-sentinel */ export const SimulationOutcome = {} as const;

// ─── History ───────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  label: string;
  input: SimulationInput;
}
/** @runtime-sentinel */ export const HistoryEntry = {} as const;

// ─── Share Payload ─────────────────────────────────────────────────────────────

export type SharePayloadVersion = 1;
/** @runtime-sentinel */ export const SharePayloadVersion = {} as const;

export interface SharePayloadV1 {
  v: SharePayloadVersion;
  input: SimulationInput;
}
/** @runtime-sentinel */ export const SharePayloadV1 = {} as const;

export type SharePayload = SharePayloadV1;
/** @runtime-sentinel */ export const SharePayload = {} as const;

export type ShareDecodeError =
  | 'MISSING_PARAM'
  | 'TOO_LONG'
  | 'INVALID_BASE64'
  | 'INVALID_JSON'
  | 'SCHEMA_MISMATCH';
/** @runtime-sentinel */ export const ShareDecodeError = {} as const;

// ─── Route State ───────────────────────────────────────────────────────────────

export type RouteState = {
  '/': undefined;
  '/input':
    | { presetId: 'P1' | 'P2' | 'P3' | 'P4' | null }
    | { input: SimulationInput }
    | undefined;
  '/result':
    | { input: SimulationInput; source: 'input' | 'history' | 'share' }
    | undefined;
  '/history': undefined;
};

/**
 * Runtime sentinel for RouteState — keyed by route path so that
 * `'/input' in RouteState` and `RouteState['/input']` checks work in tests.
 * The values are type descriptors, not actual state values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RouteState: Record<'/' | '/input' | '/result' | '/history', any> = {
  '/': undefined,
  '/input': { presetId: null },
  '/result': { input: null, source: 'input' },
  '/history': undefined,
};
