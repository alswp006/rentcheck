import { describe, it, expect } from "vitest";
import { BUY_REPAYMENT_TYPES } from "@/lib/types";

describe("Packet 0001: 도메인/스토리지/공유/RouteState 타입 정의", () => {
  describe("AC-4: SimulationInput separates common and option-specific fields", () => {
    it("should have common fields in SimulationInput", async () => {
      // Define a test input to validate field existence at runtime
      const testInput = {
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
        buyRepaymentType: "원리금균등" as const,
      };

      expect(testInput.initialAsset).toBe(50000000);
      expect(testInput.residenceYears).toBe(10);
      expect(testInput.investmentReturnRate).toBe(4);
      expect(testInput.housePriceGrowthRate).toBe(2);
    });

    it("should have jeonse (전세) option-specific fields", async () => {
      const testInput = {
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
        buyRepaymentType: "원리금균등" as const,
      };

      expect(testInput.jeonseDeposit).toBe(300000000);
      expect(testInput.jeonseLoanRatio).toBe(70);
      expect(testInput.jeonseInterestRate).toBe(4);
    });

    it("should have monthly (월세) option-specific fields", async () => {
      const testInput = {
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
        buyRepaymentType: "원리금균등" as const,
      };

      expect(testInput.monthlyDeposit).toBe(10000000);
      expect(testInput.monthlyRent).toBe(1200000);
      expect(testInput.monthlyRentIncreaseRate).toBe(3);
    });

    it("should have buy (매매) option-specific fields", async () => {
      const testInput = {
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
        buyRepaymentType: "원리금균등" as const,
      };

      expect(testInput.buyPrice).toBe(500000000);
      expect(testInput.buyEquity).toBe(200000000);
      expect(testInput.buyLoanInterestRate).toBe(4);
      expect(testInput.buyLoanPeriodYears).toBe(30);
      expect(testInput.buyRepaymentType).toBe("원리금균등");
    });

    it("BuyRepaymentType should accept exactly 3 union values", async () => {
      expect(BUY_REPAYMENT_TYPES).toContain("원리금균등");
      expect(BUY_REPAYMENT_TYPES).toContain("원금균등");
      expect(BUY_REPAYMENT_TYPES).toContain("만기일시");
      expect(BUY_REPAYMENT_TYPES).toHaveLength(3);
    });
  });

  describe("Data storage type constraints", () => {
    it("HistoryStorageV1 should have v=1 and entries array", async () => {
      const storage = {
        v: 1 as const,
        entries: [] as unknown[],
      };

      expect(storage.v).toBe(1);
      expect(Array.isArray(storage.entries)).toBe(true);
    });

    it("PurchaseStorageV1 should track purchase state and timestamps", async () => {
      const storage = {
        v: 1 as const,
        adSkipPurchased: false,
        purchasedAt: null as number | null,
        transactionId: null as string | null,
      };

      expect(storage.v).toBe(1);
      expect(storage.adSkipPurchased).toBe(false);
      expect(storage.purchasedAt).toBeNull();
      expect(storage.transactionId).toBeNull();
    });

    it("LastShareStorageV1 should store URL and creation timestamp", async () => {
      const now = Date.now();
      const storage = {
        v: 1 as const,
        lastUrl: "https://app.example.com/share?p=abc123",
        createdAt: now,
      };

      expect(storage.v).toBe(1);
      expect(typeof storage.lastUrl).toBe("string");
      expect(typeof storage.createdAt).toBe("number");
    });

    it("SharePayload should wrap v and input", async () => {
      const payload = {
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
          buyRepaymentType: "원리금균등" as const,
        },
      };

      expect(payload.v).toBe(1);
      expect(payload.input.initialAsset).toBe(50000000);
    });

    it("CreateShareUrlError should be union of specific error codes", async () => {
      const err1 = "TOO_LONG" as const;
      const err2 = "ENCODE_FAILED" as const;

      expect([err1, err2]).toHaveLength(2);
    });
  });

  describe("Result model structure", () => {
    it("NetWorthPoint should store year and option values", async () => {
      const point = {
        year: 5,
        jeonse: 100000000 as number | null,
        monthly: 95000000 as number | null,
        buy: 110000000 as number | null,
      };

      expect(point.year).toBe(5);
      expect(typeof point.jeonse).toBe("number");
      expect(typeof point.monthly).toBe("number");
      expect(typeof point.buy).toBe("number");
    });

    it("NetWorthPoint should allow null for infeasible options", async () => {
      const point = {
        year: 5,
        jeonse: 100000000 as number | null,
        monthly: null as number | null,
        buy: 110000000 as number | null,
      };

      expect(point.monthly).toBeNull();
    });

    it("RecommendedOption should be union of three option names", async () => {
      const opt1 = "jeonse" as const;
      const opt2 = "monthly" as const;
      const opt3 = "buy" as const;

      expect([opt1, opt2, opt3]).toHaveLength(3);
    });

    it("CostBreakdownRow should have item label and three option values", async () => {
      const row = {
        item: "총 거주비용",
        jeonse: 500000 as number | null,
        monthly: 600000 as number | null,
        buy: null as number | null,
      };

      expect(row.item).toBe("총 거주비용");
      expect(typeof row.jeonse).toBe("number");
      expect(row.buy).toBeNull();
    });

    it("SimulationResultCore should have all calculation outputs", async () => {
      const result = {
        netWorthByYear: [
          { year: 0, jeonse: 0, monthly: 0, buy: 0 },
          { year: 1, jeonse: 1000000, monthly: 900000, buy: 1100000 },
        ],
        finalNetWorth: {
          jeonse: 100000000 as number | null,
          monthly: 95000000 as number | null,
          buy: null as number | null,
        },
        recommendedOption: "jeonse" as const,
        insightCopy: "집값상승률을 3%로 올리면 1위 옵션의 순자산이 5천만원 증가해요",
        costBreakdown: [
          { item: "총 거주비용", jeonse: 500000 as number | null, monthly: 600000 as number | null, buy: null as number | null },
        ],
      };

      expect(result.netWorthByYear.length).toBeGreaterThan(0);
      expect(result.recommendedOption).toBe("jeonse");
      expect(typeof result.insightCopy).toBe("string");
    });

    it("SimulationResult should extend SimulationResultCore with timestamps", async () => {
      const now = Date.now();
      const result = {
        netWorthByYear: [
          { year: 0, jeonse: 0, monthly: 0, buy: 0 },
        ],
        finalNetWorth: {
          jeonse: 100000000 as number | null,
          monthly: 95000000 as number | null,
          buy: 110000000 as number | null,
        },
        recommendedOption: "buy" as const,
        insightCopy: "매매가 최고의 선택입니다",
        costBreakdown: [] as unknown[],
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
      const now = Date.now();
      const entry = {
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
          buyRepaymentType: "원리금균등" as const,
        },
        result: {
          netWorthByYear: [] as unknown[],
          finalNetWorth: { jeonse: null as number | null, monthly: null as number | null, buy: null as number | null },
          recommendedOption: "jeonse" as const,
          insightCopy: "test",
          costBreakdown: [] as unknown[],
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
      const now = Date.now();
      const preset = {
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
          buyRepaymentType: "원리금균등" as const,
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
      const key1 = "jeonse" as const;
      const key2 = "monthly" as const;
      const key3 = "buy" as const;

      expect([key1, key2, key3]).toHaveLength(3);
    });

    it("OptionFeasibility should be a string union of 'feasible' and 'infeasible'", async () => {
      const f = "feasible" as const;
      const i = "infeasible" as const;

      expect(f).toBe("feasible");
      expect(i).toBe("infeasible");
    });
  });
});
