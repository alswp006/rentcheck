import { describe, it, expect } from "vitest";
import * as Types from "@/lib/types";
import type {
  PresetScenario,
  SimulationInput,
  SimulationResult,
  HistoryEntry,
  SharePayload,
  AppSettings,
  Entitlement,
  BuyRepaymentType,
  OptionKey,
  StorageErrorCode,
  StorageResult,
  ListHistoryParams,
  HistoryListResponse,
  StorageAdapter,
  TossUser,
  TossAuthErrorCode,
  TossAuthResult,
  TossLoginAdapter,
  PaymentRequest,
  PaymentFailCode,
  PaymentSuccess,
  PaymentResult,
  TossPaymentAdapter,
  RewardAdFailCode,
  RewardAdResult,
} from "@/lib/types";

// Type-level assertion helper — if TypeScript compiles, the type is valid
function assertType<T>(_value: T): void {}

describe("핵심 타입/계약 정의(types.ts)", () => {
  it("AC-1: should export zero runtime values (types only)", () => {
    const runtimeExports = Object.keys(Types);
    expect(runtimeExports).toHaveLength(0);
  });

  it("AC-2 + AC-3: core data model types compile with required fields", () => {
    // SimulationInput with BuyRepaymentType value type
    const input: SimulationInput = {
      id: "uuid-001",
      presetId: null,
      jeonseDeposit: 300_000_000,
      jeonseLoanRatio: 80,
      jeonseInterestRate: 4,
      monthlyDeposit: 10_000_000,
      monthlyRent: 800_000,
      monthlyRentIncreaseRate: 3,
      buyPrice: 500_000_000,
      buyEquity: 150_000_000,
      buyLoanRate: 4,
      buyLoanPeriodYears: 30,
      buyRepaymentType: "AMORTIZED" as BuyRepaymentType,
      initialAsset: 50_000_000,
      residenceYears: 10,
      investmentReturnRate: 6,
      housePriceGrowthRate: 2,
      createdAt: 0,
      updatedAt: 0,
    };
    assertType<SimulationInput>(input);

    // OptionKey value type
    const opt: OptionKey = "jeonse";
    assertType<OptionKey>(opt);
    expect(["jeonse", "monthly", "buy"].includes(opt)).toBe(true);

    // SimulationResult shape
    const result: SimulationResult = {
      netWorthByYear: { jeonse: [0], monthly: [0], buy: [0] },
      finalNetWorth: { jeonse: 0, monthly: 0, buy: 0 },
      recommendedOption: "jeonse",
      diffFromBest: { jeonse: 0, monthly: -100, buy: -200 },
      insightCopy: "전세가 유리해요",
      costBreakdown: { jeonse: {}, monthly: {}, buy: {} },
      createdAt: 0,
      updatedAt: 0,
    };
    assertType<SimulationResult>(result);

    // PresetScenario shape
    const preset: PresetScenario = {
      id: "preset-1",
      name: "서울 중간값",
      defaultInput: input,
      createdAt: 0,
      updatedAt: 0,
    };
    assertType<PresetScenario>(preset);

    // HistoryEntry shape
    const entry: HistoryEntry = {
      id: "uuid-002",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      label: "직접 입력 · 집값 2% · 10년",
      input,
    };
    assertType<HistoryEntry>(entry);

    // SharePayload shape
    const share: SharePayload = {
      id: "uuid-003",
      version: 1,
      input,
      encoded: "base64string",
      createdAt: 0,
      updatedAt: 0,
    };
    assertType<SharePayload>(share);

    // AppSettings shape
    const settings: AppSettings = {
      hasSeenSimulationDisclaimer: false,
      createdAt: 0,
      updatedAt: 0,
    };
    assertType<AppSettings>(settings);

    // Entitlement shape
    const entitlement: Entitlement = {
      id: "uuid-004",
      isPremium: false,
      premiumSince: null,
      ownerUserId: null,
      maxResidenceYears: 10,
      createdAt: 0,
      updatedAt: 0,
    };
    assertType<Entitlement>(entitlement);

    expect(true).toBe(true); // reaches here only if TypeScript compiled above
  });

  it("AC-4: Storage contract types compile with required fields", () => {
    // StorageErrorCode — exhaustive union check
    const code: StorageErrorCode = "QUOTA_EXCEEDED";
    assertType<StorageErrorCode>(code);
    expect(typeof code).toBe("string");

    // StorageResult generic — ok branch
    const ok: StorageResult<number> = { ok: true, data: 42 };
    assertType<StorageResult<number>>(ok);
    expect(ok.ok).toBe(true);

    // StorageResult generic — fail branch
    const fail: StorageResult<number> = { ok: false, code: "NOT_FOUND", message: "없음" };
    assertType<StorageResult<number>>(fail);
    expect(fail.ok).toBe(false);

    // ListHistoryParams shape
    const params: ListHistoryParams = { page: 1, pageSize: 5 };
    assertType<ListHistoryParams>(params);
    expect(params.pageSize).toBe(5);

    // HistoryListResponse shape
    const listRes: HistoryListResponse = { items: [], total: 0, page: 1 };
    assertType<HistoryListResponse>(listRes);
    expect(listRes.total).toBe(0);

    // StorageAdapter — verify method signatures compile via structural subtype
    const mockAdapter: StorageAdapter = {
      getSettings: async () => ({ ok: true, data: { hasSeenSimulationDisclaimer: false, createdAt: 0, updatedAt: 0 } }),
      setSettings: async () => ({ ok: true, data: true }),
      getEntitlement: async () => ({ ok: false, code: "UNKNOWN", message: "err" }),
      setEntitlement: async () => ({ ok: true, data: true }),
      clearEntitlement: async () => ({ ok: true, data: true }),
      listHistory: async () => ({ ok: true, data: { items: [], total: 0, page: 1 } }),
      getHistoryById: async () => ({ ok: false, code: "NOT_FOUND", message: "err" }),
      saveHistoryEntry: async () => ({ ok: true, data: true }),
      deleteHistoryById: async () => ({ ok: false, code: "NOT_FOUND", message: "err" }),
      clearHistory: async () => ({ ok: true, data: true }),
    };
    assertType<StorageAdapter>(mockAdapter);
    expect(typeof mockAdapter.listHistory).toBe("function");
  });

  it("AC-5: Auth contract types compile with required fields", () => {
    // TossUser shape (open record)
    const user: TossUser = { userId: "user-abc" };
    assertType<TossUser>(user);
    expect(user.userId).toBe("user-abc");

    // TossAuthErrorCode union
    const code: TossAuthErrorCode = "USER_CANCELLED";
    assertType<TossAuthErrorCode>(code);
    expect(typeof code).toBe("string");

    // TossAuthResult — ok branch
    const authOk: TossAuthResult = { ok: true, user };
    assertType<TossAuthResult>(authOk);
    expect(authOk.ok).toBe(true);

    // TossAuthResult — fail branch
    const authFail: TossAuthResult = { ok: false, code: "NETWORK_ERROR", message: "timeout" };
    assertType<TossAuthResult>(authFail);
    expect(authFail.ok).toBe(false);

    // TossLoginAdapter structural check
    const mockLogin: TossLoginAdapter = {
      login: async () => ({ ok: true, user }),
      logout: async () => ({ ok: true }),
      getCurrentUser: () => null,
    };
    assertType<TossLoginAdapter>(mockLogin);
    expect(typeof mockLogin.login).toBe("function");
  });

  it("AC-6: Payment contract types compile with required fields", () => {
    // PaymentRequest shape
    const req: PaymentRequest = { orderId: "order-1", orderName: "RentCheck 프리미엄", amount: 9900 };
    assertType<PaymentRequest>(req);
    expect(req.amount).toBeGreaterThan(0);

    // PaymentFailCode union
    const code: PaymentFailCode = "CANCELLED";
    assertType<PaymentFailCode>(code);
    expect(typeof code).toBe("string");

    // PaymentSuccess shape
    const success: PaymentSuccess = { paymentKey: "pk_123", approvedAt: Date.now() };
    assertType<PaymentSuccess>(success);

    // PaymentResult — success branch
    const resultOk: PaymentResult = { status: "success", data: success };
    assertType<PaymentResult>(resultOk);
    expect(resultOk.status).toBe("success");

    // PaymentResult — cancel branch
    const resultCancel: PaymentResult = { status: "cancel", code: "CANCELLED", message: "취소" };
    assertType<PaymentResult>(resultCancel);
    expect(resultCancel.status).toBe("cancel");

    // PaymentResult — fail branch
    const resultFail: PaymentResult = { status: "fail", code: "NETWORK_ERROR", message: "timeout" };
    assertType<PaymentResult>(resultFail);
    expect(resultFail.status).toBe("fail");

    // TossPaymentAdapter structural check
    const mockPayment: TossPaymentAdapter = {
      requestPayment: async () => resultOk,
    };
    assertType<TossPaymentAdapter>(mockPayment);
    expect(typeof mockPayment.requestPayment).toBe("function");
  });

  it("AC-7: Reward Ad contract types compile with required fields", () => {
    // RewardAdFailCode union
    const code: RewardAdFailCode = "USER_SKIPPED";
    assertType<RewardAdFailCode>(code);
    expect(typeof code).toBe("string");

    // RewardAdResult — ok branch
    const ok: RewardAdResult = { ok: true, rewardedAt: Date.now() };
    assertType<RewardAdResult>(ok);
    expect(ok.ok).toBe(true);

    // RewardAdResult — fail branch
    const fail: RewardAdResult = { ok: false, code: "AD_LOAD_FAILED", message: "광고 로드 실패" };
    assertType<RewardAdResult>(fail);
    expect(fail.ok).toBe(false);
  });
});
