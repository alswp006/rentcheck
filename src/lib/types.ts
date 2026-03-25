// ============================================================
// Domain Types
// ============================================================

export type BuyRepaymentType = "AMORTIZED"; // MVP: 원리금균등만

export type OptionKey = "jeonse" | "monthly" | "buy";

export interface SimulationInput {
  id: string;
  presetId: string | null;

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
  buyLoanRate: number;
  buyLoanPeriodYears: number;
  buyRepaymentType: BuyRepaymentType;

  // 공통
  initialAsset: number;
  residenceYears: number;
  investmentReturnRate: number;
  housePriceGrowthRate: number;

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

export interface CostBreakdownMap {
  loanRepayment?: number;
  opportunity?: number;
  deposit?: number;
  rent?: number;
  [key: string]: number | undefined;
}

export interface SimulationResult {
  id: string;
  netWorthByYear: {
    jeonse: number[];
    monthly: number[];
    buy: number[];
  };
  finalNetWorth: Record<OptionKey, number>;
  recommendedOption: OptionKey;
  diffFromBest: Record<OptionKey, number>;
  insightCopy: string;
  costBreakdown: Record<OptionKey, CostBreakdownMap>;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  label: string;
  input: SimulationInput;
  result?: SimulationResult;
}

export interface SharePayload {
  id: string;
  version: number;
  input: SimulationInput;
  encoded: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  hasSeenSimulationDisclaimer: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Entitlement {
  id: string;
  isPremium: boolean;
  premiumSince: number | null;
  ownerUserId: string | null;
  maxResidenceYears: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Storage Adapter Contracts
// ============================================================

export type StorageErrorCode =
  | "INVALID_PARAMS"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAVAILABLE"
  | "QUOTA_EXCEEDED"
  | "READ_ERROR"
  | "WRITE_ERROR"
  | "PARSE_ERROR"
  | "SERIALIZE_ERROR"
  | "UNKNOWN";

export type StorageResult<T, C extends StorageErrorCode = StorageErrorCode> =
  | { ok: true; data: T }
  | { ok: false; code: C; message: string };

export type ListHistoryParams = {
  page: number;
  pageSize: number;
};

export type HistoryListResponse = {
  items: HistoryEntry[];
  total: number;
  page: number;
};

export interface StorageAdapter {
  getSettings: () => Promise<
    StorageResult<AppSettings, "UNAVAILABLE" | "READ_ERROR" | "PARSE_ERROR" | "UNKNOWN">
  >;

  setSettings: (next: AppSettings) => Promise<
    StorageResult<true, "UNAVAILABLE" | "SERIALIZE_ERROR" | "QUOTA_EXCEEDED" | "WRITE_ERROR" | "UNKNOWN">
  >;

  getEntitlement: () => Promise<
    StorageResult<Entitlement, "UNAVAILABLE" | "READ_ERROR" | "PARSE_ERROR" | "UNKNOWN">
  >;

  setEntitlement: (next: Entitlement) => Promise<
    StorageResult<true, "UNAVAILABLE" | "SERIALIZE_ERROR" | "QUOTA_EXCEEDED" | "WRITE_ERROR" | "UNKNOWN">
  >;

  clearEntitlement: () => Promise<
    StorageResult<true, "UNAVAILABLE" | "WRITE_ERROR" | "UNKNOWN">
  >;

  listHistory: (params: ListHistoryParams) => Promise<
    StorageResult<HistoryListResponse, "INVALID_PARAMS" | "UNAVAILABLE" | "READ_ERROR" | "PARSE_ERROR" | "UNKNOWN">
  >;

  getHistoryById: (id: string) => Promise<
    StorageResult<HistoryEntry, "VALIDATION_ERROR" | "NOT_FOUND" | "UNAVAILABLE" | "READ_ERROR" | "PARSE_ERROR" | "UNKNOWN">
  >;

  saveHistoryEntry: (entry: HistoryEntry) => Promise<
    StorageResult<true, "VALIDATION_ERROR" | "UNAVAILABLE" | "SERIALIZE_ERROR" | "QUOTA_EXCEEDED" | "WRITE_ERROR" | "UNKNOWN">
  >;

  deleteHistoryById: (id: string) => Promise<
    StorageResult<true, "VALIDATION_ERROR" | "NOT_FOUND" | "UNAVAILABLE" | "WRITE_ERROR" | "UNKNOWN">
  >;

  clearHistory: () => Promise<
    StorageResult<true, "UNAVAILABLE" | "WRITE_ERROR" | "UNKNOWN">
  >;
}

// ============================================================
// Auth Contracts
// ============================================================

export interface TossUser {
  userId: string;
  [key: string]: unknown;
}

export type TossAuthErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "USER_CANCELLED"
  | "NETWORK_ERROR"
  | "SDK_ERROR"
  | "UNKNOWN";

export type TossAuthResult =
  | { ok: true; user: TossUser }
  | { ok: false; code: TossAuthErrorCode; message: string };

export interface TossLoginAdapter {
  login: () => Promise<TossAuthResult>;
  logout: () => Promise<{ ok: true } | { ok: false; code: "SDK_ERROR" | "UNKNOWN"; message: string }>;
  getCurrentUser: () => TossUser | null;
}

// ============================================================
// Payment Contracts
// ============================================================

export type PaymentRequest = {
  orderId: string;
  orderName: string;
  amount: number;
};

export type PaymentFailCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CANCELLED"
  | "NETWORK_ERROR"
  | "SDK_ERROR"
  | "UNKNOWN";

export type PaymentSuccess = {
  paymentKey: string;
  approvedAt: number;
};

export type PaymentResult =
  | { status: "success"; data: PaymentSuccess }
  | { status: "cancel"; code: "CANCELLED"; message: string }
  | { status: "fail"; code: Exclude<PaymentFailCode, "CANCELLED">; message: string };

export interface TossPaymentAdapter {
  requestPayment: (req: PaymentRequest) => Promise<PaymentResult>;
}

// ============================================================
// Reward Ad Contracts
// ============================================================

export type RewardAdFailCode =
  | "AD_NOT_AVAILABLE"
  | "AD_LOAD_FAILED"
  | "AD_SHOW_FAILED"
  | "USER_SKIPPED"
  | "NETWORK_ERROR"
  | "SDK_ERROR"
  | "UNKNOWN";

export type RewardAdResult =
  | { ok: true; rewardedAt: number }
  | { ok: false; code: RewardAdFailCode; message: string };
