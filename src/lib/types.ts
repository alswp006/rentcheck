// ─── Common ───────────────────────────────────────────────────────────────────

export type EpochMs = number;

export type AppErrorCode =
  | 'INVALID_INPUT'
  | 'DECODE_ERROR'
  | 'ENCODE_ERROR'
  | 'UNSUPPORTED_VERSION'
  | 'PAGE_OUT_OF_RANGE'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA'
  | 'STORAGE_PARSE'
  | 'STORAGE_SCHEMA'
  | 'CALC_ERROR';

export type Result<T, E extends { code: AppErrorCode }> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number; // 1-based
}

// ─── Domain Models ────────────────────────────────────────────────────────────

export type BuyRepaymentType = '원리금균등' | '원금균등' | '만기일시';

export interface SimulationInput {
  id: string;
  createdAt: number;
  updatedAt: number;

  presetId: string | null;

  // 전세
  jeonseDepositKRW: number;
  jeonseLoanRatio: number;
  jeonseLoanRateAPR: number;

  // 월세
  monthlyDepositKRW: number;
  monthlyRentKRW: number;
  monthlyRentIncreaseRateAnnual: number;

  // 매매
  buyPriceKRW: number;
  buyEquityKRW: number;
  buyLoanRateAPR: number;
  buyLoanPeriodYears: number;
  buyRepaymentType: BuyRepaymentType;

  // 공통
  initialAssetKRW: number;
  stayPeriodYears: number;
  investmentReturnRateAnnual: number;
  housePriceGrowthRateAnnual: number;
}

export type SimulationInputUserField = Exclude<
  keyof SimulationInput,
  'id' | 'createdAt' | 'updatedAt'
>;

export type FieldErrors = Partial<Record<SimulationInputUserField, string>>;

export type OptionType = 'JEONSE' | 'MONTHLY' | 'BUY';

export interface OptionResult {
  id: string;
  option: OptionType;
  netWorthByYearKRW: number[];
  finalNetWorthKRW: number;
  totalCostKRW: number;
  createdAt: number;
  updatedAt: number;
}

export interface CostBreakdownRow {
  id: string;
  label: string;
  valueKRW: number;
  createdAt: number;
  updatedAt: number;
}

export interface SimulationResult {
  id: string;
  stayPeriodYears: number;
  results: OptionResult[];
  recommendedOption: OptionType;
  deltaToSecondBestKRW: number;
  insightCopy: string;
  costBreakdownRows: CostBreakdownRow[];
  createdAt: number;
  updatedAt: number;
}

export interface PresetScenario {
  id: string;
  name: string;
  defaultInput: SimulationInput;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  label: string;
  input: SimulationInput;
}

export interface SharePayload {
  id: string;
  encoded: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface LastInputSnapshot {
  version: 1;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  input: SimulationInput;
}

// ─── Service Interfaces ───────────────────────────────────────────────────────

export interface PresetService {
  listPresets(): Paginated<PresetScenario>;
  getPresetById(id: string): Result<PresetScenario, { code: 'NOT_FOUND' }>;
}

export interface SimulationValidationService {
  validate(input: unknown): Result<
    SimulationInput,
    { code: 'INVALID_INPUT'; fieldErrors: FieldErrors }
  >;
}

export interface SimulationService {
  calculate(
    input: SimulationInput
  ): Result<SimulationResult, { code: 'INVALID_INPUT' | 'CALC_ERROR' }>;

  createInsight(
    input: SimulationInput
  ): Result<string, { code: 'INVALID_INPUT' | 'CALC_ERROR' }>;
}

export interface ShareService {
  buildShareUrl(
    input: SimulationInput
  ): Result<{ url: string; payload: SharePayload }, { code: 'ENCODE_ERROR' }>;

  parseShareSearch(
    search: string
  ): Result<
    { input: SimulationInput },
    { code: 'DECODE_ERROR' | 'UNSUPPORTED_VERSION' | 'INVALID_INPUT' }
  >;
}

export interface HistoryStorage {
  list(params: {
    page: number;
    pageSize: number;
  }): Result<
    Paginated<HistoryEntry>,
    {
      code:
        | 'INVALID_INPUT'
        | 'PAGE_OUT_OF_RANGE'
        | 'STORAGE_UNAVAILABLE'
        | 'STORAGE_PARSE'
        | 'STORAGE_SCHEMA';
    }
  >;

  prepend(
    entry: HistoryEntry
  ): Result<
    void,
    {
      code:
        | 'STORAGE_UNAVAILABLE'
        | 'STORAGE_QUOTA'
        | 'STORAGE_PARSE'
        | 'STORAGE_SCHEMA';
    }
  >;
}

export interface LastInputStorage {
  load(): Result<
    LastInputSnapshot | null,
    { code: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE' | 'STORAGE_SCHEMA' }
  >;

  save(
    input: SimulationInput,
    now: EpochMs
  ): Result<
    LastInputSnapshot,
    { code: 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA' }
  >;

  clear(): Result<void, { code: 'STORAGE_UNAVAILABLE' }>;
}

// ─── Route State Contract ─────────────────────────────────────────────────────

export type RouteState = {
  '/': undefined;
  '/input': { presetId: string | null };
  '/result':
    | { input: SimulationInput }
    | { input: SimulationInput; historyId: string };
  '/history': undefined;
};
