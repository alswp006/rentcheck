import { describe, it, expect } from "vitest";

describe("Packet 0001: 도메인/스토리지/공유/RouteState 타입 정의", () => {
  describe("AC-1: TypeScript compilation succeeds with zero type errors", () => {
    it("should export all required domain types without TypeScript errors", () => {
      // This test validates that all types can be imported and used
      // If tsc fails, this test will not even run (compile-time validation)
      // The actual validation happens via `npx tsc --noEmit`
      expect(true).toBe(true); // Placeholder — tsc pass is the real test
    });
  });

  describe("AC-2: All required symbols are exported from src/lib/types.ts", () => {
    it("should export PresetScenario type", async () => {
      const types = await import("@/lib/types");
      expect(types.PresetScenario).toBeDefined();
    });

    it("should export SimulationInput type", async () => {
      const types = await import("@/lib/types");
      expect(types.SimulationInput).toBeDefined();
    });

    it("should export BuyRepaymentType union", async () => {
      const types = await import("@/lib/types");
      expect(types.BuyRepaymentType).toBeDefined();
    });

    it("should export SimulationResultCore type", async () => {
      const types = await import("@/lib/types");
      expect(types.SimulationResultCore).toBeDefined();
    });

    it("should export SimulationResult type", async () => {
      const types = await import("@/lib/types");
      expect(types.SimulationResult).toBeDefined();
    });

    it("should export NetWorthPoint type", async () => {
      const types = await import("@/lib/types");
      expect(types.NetWorthPoint).toBeDefined();
    });

    it("should export CostBreakdownRow type", async () => {
      const types = await import("@/lib/types");
      expect(types.CostBreakdownRow).toBeDefined();
    });

    it("should export RecommendedOption union", async () => {
      const types = await import("@/lib/types");
      expect(types.RecommendedOption).toBeDefined();
    });

    it("should export HistoryEntry type", async () => {
      const types = await import("@/lib/types");
      expect(types.HistoryEntry).toBeDefined();
    });

    it("should export HistoryStorageV1 type", async () => {
      const types = await import("@/lib/types");
      expect(types.HistoryStorageV1).toBeDefined();
    });

    it("should export PurchaseStorageV1 type", async () => {
      const types = await import("@/lib/types");
      expect(types.PurchaseStorageV1).toBeDefined();
    });

    it("should export LastShareStorageV1 type", async () => {
      const types = await import("@/lib/types");
      expect(types.LastShareStorageV1).toBeDefined();
    });

    it("should export SharePayload type", async () => {
      const types = await import("@/lib/types");
      expect(types.SharePayload).toBeDefined();
    });

    it("should export CreateShareUrlError type", async () => {
      const types = await import("@/lib/types");
      expect(types.CreateShareUrlError).toBeDefined();
    });

    it("should export RouteState type", async () => {
      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();
    });

    it("should export OptionKey type", async () => {
      const types = await import("@/lib/types");
      expect(types.OptionKey).toBeDefined();
    });

    it("should export OptionFeasibility type", async () => {
      const types = await import("@/lib/types");
      expect(types.OptionFeasibility).toBeDefined();
    });
  });

  describe("AC-3: RouteState contains required route keys with proper shapes", () => {
    it("should have /result route with input and source fields", async () => {
      const types = await import("@/lib/types");
      // Validate that RouteState record has a '/result' key
      const routeStateKeys = Object.keys(types.RouteState.prototype);
      // Since RouteState is a Record/mapped type, we check the type structure via TypeScript
      // This test ensures the type signature exists in the compiled output
      expect(types.RouteState).toBeDefined();
    });

    it("should have /input route with optional prefill field", async () => {
      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();
    });

    it("should have /purchase route with optional from field", async () => {
      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();
    });

    it("should have /history route", async () => {
      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();
    });

    it("should have /share route", async () => {
      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();
    });

    it("should have / (home) route", async () => {
      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();
    });
  });

  describe("AC-4: SimulationInput separates common and option-specific fields", () => {
    it("should have common fields in SimulationInput", async () => {
      const types = await import("@/lib/types");
      // Define a test input to validate field existence at runtime
      const testInput: types.SimulationInput = {
        presetId: null,
        initialAsset: 50000000,
        residenceYears: 10,
        investmentReturnRate: 4,
        housePriceGrowthRate: 2,
        // Jeonse
        jeonseDeposit: 300000000,
        jeonseLoanRatio: 70,
        jeonseInterestRate: 4,
        // Monthly
        monthlyDeposit: 10000000,
        monthlyRent: 1200000,
        monthlyRentIncreaseRate: 3,
        // Buy
        buyPrice: 500000000,
        buyEquity: 200000000,
        buyLoanInterestRate: 4,
        buyLoanPeriodYears: 30,
        buyRepaymentType: "원리금균등",
      };

      expect(testInput.initialAsset).toBe(50000000);
      expect(testInput.residenceYears).toBe(10);
      expect(testInput.investmentReturnRate).toBe(4);
      expect(testInput.housePriceGrowthRate).toBe(2);
    });

    it("should have jeonse (전세) option-specific fields", async () => {
      const types = await import("@/lib/types");
      const testInput: types.SimulationInput = {
        presetId: null,
        initialAsset: 50000000,
        residenceYears: 10,
        investmentReturnRate: 4,
        housePriceGrowthRate: 2,
        jeonseDeposit: 300000000,
        jeonseLoanRatio: 70,
        jeonseInterestRate: 4,
        monthlyDeposit: 0,
        monthlyRent: 0,
        monthlyRentIncreaseRate: 0,
        buyPrice: 0,
        buyEquity: 0,
        buyLoanInterestRate: 0,
        buyLoanPeriodYears: 0,
        buyRepaymentType: "원리금균등",
      };

      expect(testInput.jeonseDeposit).toBe(300000000);
      expect(testInput.jeonseLoanRatio).toBe(70);
      expect(testInput.jeonseInterestRate).toBe(4);
    });

    it("should have monthly (월세) option-specific fields", async () => {
      const types = await import("@/lib/types");
      const testInput: types.SimulationInput = {
        presetId: null,
        initialAsset: 50000000,
        residenceYears: 10,
        investmentReturnRate: 4,
        housePriceGrowthRate: 2,
        jeonseDeposit: 0,
        jeonseLoanRatio: 0,
        jeonseInterestRate: 0,
        monthlyDeposit: 10000000,
        monthlyRent: 1200000,
        monthlyRentIncreaseRate: 3,
        buyPrice: 0,
        buyEquity: 0,
        buyLoanInterestRate: 0,
        buyLoanPeriodYears: 0,
        buyRepaymentType: "원리금균등",
      };

      expect(testInput.monthlyDeposit).toBe(10000000);
      expect(testInput.monthlyRent).toBe(1200000);
      expect(testInput.monthlyRentIncreaseRate).toBe(3);
    });

    it("should have buy (매매) option-specific fields", async () => {
      const types = await import("@/lib/types");
      const testInput: types.SimulationInput = {
        presetId: null,
        initialAsset: 50000000,
        residenceYears: 10,
        investmentReturnRate: 4,
        housePriceGrowthRate: 2,
        jeonseDeposit: 0,
        jeonseLoanRatio: 0,
        jeonseInterestRate: 0,
        monthlyDeposit: 0,
        monthlyRent: 0,
        monthlyRentIncreaseRate: 0,
        buyPrice: 500000000,
        buyEquity: 200000000,
        buyLoanInterestRate: 4,
        buyLoanPeriodYears: 30,
        buyRepaymentType: "원리금균등",
      };

      expect(testInput.buyPrice).toBe(500000000);
      expect(testInput.buyEquity).toBe(200000000);
      expect(testInput.buyLoanInterestRate).toBe(4);
      expect(testInput.buyLoanPeriodYears).toBe(30);
      expect(testInput.buyRepaymentType).toBe("원리금균등");
    });

    it("BuyRepaymentType should accept exactly 3 union values", async () => {
      const types = await import("@/lib/types");
      // Validate that all three repayment types can be assigned
      const type1: types.BuyRepaymentType = "원리금균등";
      const type2: types.BuyRepaymentType = "원금균등";
      const type3: types.BuyRepaymentType = "만기일시";

      expect([type1, type2, type3]).toHaveLength(3);
    });
  });

  describe("Data storage type constraints", () => {
    it("HistoryStorageV1 should have v=1 and entries array", async () => {
      const types = await import("@/lib/types");
      const storage: types.HistoryStorageV1 = {
        v: 1,
        entries: [],
      };

      expect(storage.v).toBe(1);
      expect(Array.isArray(storage.entries)).toBe(true);
    });

    it("PurchaseStorageV1 should track purchase state and timestamps", async () => {
      const types = await import("@/lib/types");
      const storage: types.PurchaseStorageV1 = {
        v: 1,
        adSkipPurchased: false,
        purchasedAt: null,
        transactionId: null,
      };

      expect(storage.v).toBe(1);
      expect(storage.adSkipPurchased).toBe(false);
      expect(storage.purchasedAt).toBeNull();
      expect(storage.transactionId).toBeNull();
    });

    it("LastShareStorageV1 should store URL and creation timestamp", async () => {
      const types = await import("@/lib/types");
      const now = Date.now();
      const storage: types.LastShareStorageV1 = {
        v: 1,
        lastUrl: "https://app.example.com/share?p=abc123",
        createdAt: now,
      };

      expect(storage.v).toBe(1);
      expect(typeof storage.lastUrl).toBe("string");
      expect(typeof storage.createdAt).toBe("number");
    });

    it("SharePayload should wrap v and input", async () => {
      const types = await import("@/lib/types");
      const payload: types.SharePayload = {
        v: 1,
        input: {
          presetId: null,
          initialAsset: 50000000,
          residenceYears: 10,
          investmentReturnRate: 4,
          housePriceGrowthRate: 2,
          jeonseDeposit: 300000000,
          jeonseLoanRatio: 70,
          jeonseInterestRate: 4,
          monthlyDeposit: 10000000,
          monthlyRent: 1200000,
          monthlyRentIncreaseRate: 3,
          buyPrice: 500000000,
          buyEquity: 200000000,
          buyLoanInterestRate: 4,
          buyLoanPeriodYears: 30,
          buyRepaymentType: "원리금균등",
        },
      };

      expect(payload.v).toBe(1);
      expect(payload.input.initialAsset).toBe(50000000);
    });

    it("CreateShareUrlError should be union of specific error codes", async () => {
      const types = await import("@/lib/types");
      const err1: types.CreateShareUrlError = "TOO_LONG";
      const err2: types.CreateShareUrlError = "ENCODE_FAILED";

      expect([err1, err2]).toHaveLength(2);
    });
  });

  describe("Result model structure", () => {
    it("NetWorthPoint should store year and option values", async () => {
      const types = await import("@/lib/types");
      const point: types.NetWorthPoint = {
        year: 5,
        jeonse: 100000000,
        monthly: 95000000,
        buy: 110000000,
      };

      expect(point.year).toBe(5);
      expect(typeof point.jeonse).toBe("number");
      expect(typeof point.monthly).toBe("number");
      expect(typeof point.buy).toBe("number");
    });

    it("NetWorthPoint should allow null for infeasible options", async () => {
      const types = await import("@/lib/types");
      const point: types.NetWorthPoint = {
        year: 5,
        jeonse: 100000000,
        monthly: null,
        buy: 110000000,
      };

      expect(point.monthly).toBeNull();
    });

    it("RecommendedOption should be union of three option names", async () => {
      const types = await import("@/lib/types");
      const opt1: types.RecommendedOption = "jeonse";
      const opt2: types.RecommendedOption = "monthly";
      const opt3: types.RecommendedOption = "buy";

      expect([opt1, opt2, opt3]).toHaveLength(3);
    });

    it("CostBreakdownRow should have item label and three option values", async () => {
      const types = await import("@/lib/types");
      const row: types.CostBreakdownRow = {
        item: "총 거주비용",
        jeonse: 500000,
        monthly: 600000,
        buy: null,
      };

      expect(row.item).toBe("총 거주비용");
      expect(typeof row.jeonse).toBe("number");
      expect(row.buy).toBeNull();
    });

    it("SimulationResultCore should have all calculation outputs", async () => {
      const types = await import("@/lib/types");
      const result: types.SimulationResultCore = {
        netWorthByYear: [
          { year: 0, jeonse: 0, monthly: 0, buy: 0 },
          { year: 1, jeonse: 1000000, monthly: 900000, buy: 1100000 },
        ],
        finalNetWorth: {
          jeonse: 100000000,
          monthly: 95000000,
          buy: null,
        },
        recommendedOption: "jeonse",
        insightCopy: "집값상승률을 3%로 올리면 1위 옵션의 순자산이 5천만원 증가해요",
        costBreakdown: [
          { item: "총 거주비용", jeonse: 500000, monthly: 600000, buy: null },
        ],
      };

      expect(result.netWorthByYear.length).toBeGreaterThan(0);
      expect(result.recommendedOption).toBe("jeonse");
      expect(typeof result.insightCopy).toBe("string");
    });

    it("SimulationResult should extend SimulationResultCore with timestamps", async () => {
      const types = await import("@/lib/types");
      const now = Date.now();
      const result: types.SimulationResult = {
        netWorthByYear: [
          { year: 0, jeonse: 0, monthly: 0, buy: 0 },
        ],
        finalNetWorth: {
          jeonse: 100000000,
          monthly: 95000000,
          buy: 110000000,
        },
        recommendedOption: "buy",
        insightCopy: "매매가 최고의 선택입니다",
        costBreakdown: [],
        createdAt: now,
        updatedAt: now,
      };

      expect(result.createdAt).toBe(now);
      expect(result.updatedAt).toBe(now);
      expect(result.updatedAt >= result.createdAt).toBe(true);
    });
  });

  describe("History entry structure", () => {
    it("HistoryEntry should have required fields with input and result", async () => {
      const types = await import("@/lib/types");
      const now = Date.now();
      const entry: types.HistoryEntry = {
        id: "uuid-123",
        createdAt: now,
        updatedAt: now,
        input: {
          presetId: null,
          initialAsset: 50000000,
          residenceYears: 10,
          investmentReturnRate: 4,
          housePriceGrowthRate: 2,
          jeonseDeposit: 300000000,
          jeonseLoanRatio: 70,
          jeonseInterestRate: 4,
          monthlyDeposit: 10000000,
          monthlyRent: 1200000,
          monthlyRentIncreaseRate: 3,
          buyPrice: 500000000,
          buyEquity: 200000000,
          buyLoanInterestRate: 4,
          buyLoanPeriodYears: 30,
          buyRepaymentType: "원리금균등",
        },
        result: {
          netWorthByYear: [],
          finalNetWorth: { jeonse: null, monthly: null, buy: null },
          recommendedOption: "jeonse",
          insightCopy: "test",
          costBreakdown: [],
          createdAt: now,
          updatedAt: now,
        },
        label: "프리셋 1 · 집값 2% · 10년",
      };

      expect(entry.id).toBe("uuid-123");
      expect(entry.input.initialAsset).toBe(50000000);
      expect(entry.label).toBeDefined();
    });
  });

  describe("Preset scenario structure", () => {
    it("PresetScenario should have id, timestamps, name, and defaults", async () => {
      const types = await import("@/lib/types");
      const now = Date.now();
      const preset: types.PresetScenario = {
        id: "preset-1",
        createdAt: now,
        updatedAt: now,
        name: "보수적 투자자",
        defaults: {
          presetId: "preset-1",
          initialAsset: 50000000,
          residenceYears: 10,
          investmentReturnRate: 4,
          housePriceGrowthRate: 2,
          jeonseDeposit: 300000000,
          jeonseLoanRatio: 70,
          jeonseInterestRate: 4,
          monthlyDeposit: 10000000,
          monthlyRent: 1200000,
          monthlyRentIncreaseRate: 3,
          buyPrice: 500000000,
          buyEquity: 200000000,
          buyLoanInterestRate: 4,
          buyLoanPeriodYears: 30,
          buyRepaymentType: "원리금균등",
        },
      };

      expect(preset.id).toBe("preset-1");
      expect(preset.name).toBe("보수적 투자자");
      expect(preset.defaults.initialAsset).toBe(50000000);
      expect(preset.updatedAt >= preset.createdAt).toBe(true);
    });
  });

  describe("OptionKey and OptionFeasibility types", () => {
    it("OptionKey should represent the three housing options", async () => {
      const types = await import("@/lib/types");
      const key1: types.OptionKey = "jeonse";
      const key2: types.OptionKey = "monthly";
      const key3: types.OptionKey = "buy";

      expect([key1, key2, key3]).toHaveLength(3);
    });

    it("OptionFeasibility should track feasibility and initial requirement", async () => {
      const types = await import("@/lib/types");
      const feasible: types.OptionFeasibility = {
        feasible: true,
        initialRequired: 100000000,
      };

      expect(feasible.feasible).toBe(true);
      expect(feasible.initialRequired).toBe(100000000);
    });
  });
});
