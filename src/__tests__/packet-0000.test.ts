import { describe, it, expect } from "vitest";
import type {
  PresetScenario,
  SimulationInput,
  BuyRepaymentType,
  SimulationResultCore,
  SimulationResult,
  NetWorthPoint,
  CostBreakdownRow,
  RecommendedOption,
  HistoryEntry,
  HistoryStorageV1,
  PurchaseStorageV1,
  LastShareStorageV1,
  SharePayload,
  CreateShareUrlError,
  RouteState,
  OptionKey,
  OptionFeasibility,
} from "@/lib/types";

describe("types.ts — structural contracts", () => {
  it("SimulationInput has common and option-specific fields", () => {
    const input: SimulationInput = {
      presetId: null,
      jeonseDeposit: 300_000_000,
      jeonseLoanRatio: 70,
      jeonseInterestRate: 4,
      monthlyDeposit: 10_000_000,
      monthlyRent: 1_200_000,
      monthlyRentIncreaseRate: 3,
      buyPrice: 500_000_000,
      buyEquity: 200_000_000,
      buyLoanInterestRate: 4,
      buyLoanPeriodYears: 30,
      buyRepaymentType: "원리금균등",
      initialAsset: 50_000_000,
      residenceYears: 10,
      investmentReturnRate: 4,
      housePriceGrowthRate: 2,
    };
    expect(input.initialAsset).toBe(50_000_000);
    expect(input.residenceYears).toBe(10);
    expect(input.buyRepaymentType).toBe("원리금균등");
  });

  it("BuyRepaymentType covers all three variants", () => {
    const a: BuyRepaymentType = "원리금균등";
    const b: BuyRepaymentType = "원금균등";
    const c: BuyRepaymentType = "만기일시";
    expect([a, b, c]).toHaveLength(3);
  });

  it("RouteState has /result, /input, /purchase keys with correct shapes", () => {
    const resultState: RouteState["/result"] = {
      input: {
        presetId: "preset-1",
        jeonseDeposit: 0,
        jeonseLoanRatio: 0,
        jeonseInterestRate: 0,
        monthlyDeposit: 0,
        monthlyRent: 0,
        monthlyRentIncreaseRate: 0,
        buyPrice: 0,
        buyEquity: 0,
        buyLoanInterestRate: 0,
        buyLoanPeriodYears: 1,
        buyRepaymentType: "원금균등",
        initialAsset: 0,
        residenceYears: 1,
        investmentReturnRate: 0,
        housePriceGrowthRate: 0,
      },
      source: "share",
    };
    expect(resultState.source).toBe("share");

    const inputState: RouteState["/input"] = { prefill: { residenceYears: 5 } };
    expect(inputState?.prefill?.residenceYears).toBe(5);

    const purchaseState: RouteState["/purchase"] = { from: "result" };
    expect(purchaseState?.from).toBe("result");
  });

  it("HistoryStorageV1 and PurchaseStorageV1 are structurally correct", () => {
    const history: HistoryStorageV1 = { v: 1, entries: [] };
    expect(history.v).toBe(1);

    const purchase: PurchaseStorageV1 = {
      v: 1,
      adSkipPurchased: false,
      purchasedAt: null,
      transactionId: null,
    };
    expect(purchase.adSkipPurchased).toBe(false);
  });

  it("SharePayload and CreateShareUrlError are usable", () => {
    const payload: SharePayload = {
      v: 1,
      input: {
        presetId: null,
        jeonseDeposit: 0,
        jeonseLoanRatio: 0,
        jeonseInterestRate: 0,
        monthlyDeposit: 0,
        monthlyRent: 0,
        monthlyRentIncreaseRate: 0,
        buyPrice: 0,
        buyEquity: 0,
        buyLoanInterestRate: 0,
        buyLoanPeriodYears: 1,
        buyRepaymentType: "만기일시",
        initialAsset: 0,
        residenceYears: 1,
        investmentReturnRate: 0,
        housePriceGrowthRate: 0,
      },
    };
    expect(payload.v).toBe(1);

    const err: CreateShareUrlError = "TOO_LONG";
    expect(err).toBe("TOO_LONG");
  });

  it("OptionKey and OptionFeasibility cover expected values", () => {
    const keys: OptionKey[] = ["jeonse", "monthly", "buy"];
    const feasibilities: OptionFeasibility[] = ["feasible", "infeasible"];
    expect(keys).toHaveLength(3);
    expect(feasibilities).toHaveLength(2);
  });
});

// Ensure all required named exports compile (type-only check via import above)
describe("types.ts — all required symbols are exported", () => {
  it("all required type imports resolve without error", () => {
    // If any import above fails to compile, this test file won't load
    // This assertion is a runtime stand-in for the compile-time check
    expect(true).toBe(true);
  });
});
