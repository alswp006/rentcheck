// ─── Domain Enums / Unions ───────────────────────────────────────────────────

export const BUY_REPAYMENT_TYPES = ['원리금균등', '원금균등', '만기일시'] as const;
export type BuyRepaymentType = typeof BUY_REPAYMENT_TYPES[number];

export type RecommendedOption = 'jeonse' | 'monthly' | 'buy';

export type OptionKey = 'jeonse' | 'monthly' | 'buy';

export type OptionFeasibility = 'feasible' | 'infeasible';

// ─── Simulation Input ────────────────────────────────────────────────────────

export interface SimulationInput {
  presetId: string | null;

  // 전세
  jeonseDeposit: number;         // KRW, integer, >= 0
  jeonseLoanRatio: number;       // percent, 0~100
  jeonseInterestRate: number;    // percent, 0~30

  // 월세
  monthlyDeposit: number;        // KRW, integer, >= 0
  monthlyRent: number;           // KRW/month, integer, >= 0
  monthlyRentIncreaseRate: number; // percent, 0~30

  // 매매
  buyPrice: number;              // KRW, integer, >= 0
  buyEquity: number;             // KRW, integer, >= 0 and <= buyPrice
  buyLoanInterestRate: number;   // percent, 0~30
  buyLoanPeriodYears: number;    // integer, 1~40
  buyRepaymentType: BuyRepaymentType;

  // 공통
  initialAsset: number;          // KRW, integer, >= 0
  residenceYears: number;        // integer, 1~30
  investmentReturnRate: number;  // percent, -10~30
  housePriceGrowthRate: number;  // percent, -10~30
}

// ─── Preset ──────────────────────────────────────────────────────────────────

export interface PresetScenario {
  id: string;          // e.g. "preset-1", must match ^preset-(1|2|3|4)$
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms
  name: string;        // UI 표시명
  defaults: SimulationInput;
}

// ─── Simulation Result ───────────────────────────────────────────────────────

export interface NetWorthPoint {
  year: number;           // 0..residenceYears
  jeonse: number | null;  // KRW (불가 옵션은 null)
  monthly: number | null; // KRW (불가 옵션은 null)
  buy: number | null;     // KRW (불가 옵션은 null)
}

export interface CostBreakdownRow {
  item: string;            // 고정 라벨(예: "총 거주비용")
  jeonse: number | null;   // KRW (불가 옵션은 null)
  monthly: number | null;  // KRW (불가 옵션은 null)
  buy: number | null;      // KRW (불가 옵션은 null)
}

/**
 * 순수 계산 함수는 시간/저장 개념이 없는 결과를 반환한다.
 */
export interface SimulationResultCore {
  netWorthByYear: NetWorthPoint[];  // length = residenceYears + 1
  finalNetWorth: { jeonse: number | null; monthly: number | null; buy: number | null };
  recommendedOption: RecommendedOption; // 불가 옵션은 추천 대상으로 선택될 수 없음
  insightCopy: string;              // 1줄 고정 문장
  costBreakdown: CostBreakdownRow[];
}

/**
 * 저장(히스토리) 시점의 메타(createdAt/updatedAt)를 포함하는 결과 모델.
 * - simulate()는 SimulationResultCore만 생성한다.
 * - HistoryEntry 저장 시 SimulationResult로 래핑하여 저장한다.
 */
export interface SimulationResult extends SimulationResultCore {
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;          // uuid
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms
  input: SimulationInput;
  result: SimulationResult; // input에 대한 계산 결과(저장 시점 기준, 메타 포함)
  label?: string;      // "{프리셋명 또는 '직접 입력'} · 집값 {housePriceGrowthRate}% · {residenceYears}년"
}

// ─── localStorage Schemas ────────────────────────────────────────────────────

export interface HistoryStorageV1 {
  v: 1;
  entries: HistoryEntry[]; // max 5
}

export interface PurchaseStorageV1 {
  v: 1;
  adSkipPurchased: boolean;   // default false
  purchasedAt: number | null; // epoch ms
  transactionId: string | null;
}

export interface LastShareStorageV1 {
  v: 1;
  lastUrl: string;   // length typically < 2000
  createdAt: number; // epoch ms
}

// ─── Share ───────────────────────────────────────────────────────────────────

export interface SharePayload {
  v: 1;
  input: SimulationInput;
}

export type CreateShareUrlError = 'TOO_LONG' | 'ENCODE_FAILED';

// ─── Route State ─────────────────────────────────────────────────────────────

export interface RouteState {
  '/': undefined;
  '/result': {
    input: SimulationInput;
    source: 'preset' | 'manual' | 'history' | 'share';
  };
  '/input': { prefill?: Partial<SimulationInput> } | undefined;
  '/purchase': { from?: 'result' | 'home' } | undefined;
  '/share': undefined;
  '/history': undefined;
}
