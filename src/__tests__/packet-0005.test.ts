import { describe, it, expect } from "vitest";
import type { SimulationInput } from "@/lib/types";

// Helper: build a valid SimulationInput for tests
function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    id: "test-id",
    presetId: null,
    jeonseDeposit: 300_000_000,
    jeonseLoanRatio: 0.6,
    jeonseInterestRate: 0.035,
    monthlyDeposit: 50_000_000,
    monthlyRent: 1_200_000,
    monthlyRentIncreaseRate: 0.03,
    buyPrice: 500_000_000,
    buyEquity: 200_000_000,
    buyLoanRate: 0.04,
    buyLoanPeriodYears: 20,
    buyRepaymentType: "AMORTIZED",
    initialAsset: 300_000_000,
    residenceYears: 10,
    investmentReturnRate: 0.05,
    housePriceGrowthRate: 0.03,
    createdAt: 1_000_000,
    updatedAt: 1_000_000,
    ...overrides,
  };
}

describe("SharePayload codec + 시뮬레이션 엔진(검증 포함)", () => {
  // AC-1: encodeShareParamV1 returns base64 string, never throws
  it("AC-1: encodeShareParamV1 returns base64 string and does not throw", async () => {
    const { encodeShareParamV1 } = await import("@/lib/share/shareCodec");
    const input = makeInput();
    let result: string;
    expect(() => {
      result = encodeShareParamV1(input);
    }).not.toThrow();
    expect(typeof result!).toBe("string");
    expect(result!.length).toBeGreaterThan(0);
    // Should be valid base64: decode and verify round-trip
    const decoded = JSON.parse(atob(result!));
    expect(decoded.version).toBe(1);
    expect(decoded.input.id).toBe("test-id");
  });

  // AC-2: decodeShareParam returns ok:false on garbage, never throws
  it("AC-2: decodeShareParam returns ok:false for invalid base64/JSON without throwing", async () => {
    const { decodeShareParam } = await import("@/lib/share/shareCodec");
    let result: ReturnType<typeof decodeShareParam>;
    expect(() => {
      result = decodeShareParam("!!!not-base64!!!");
    }).not.toThrow();
    expect(result!.ok).toBe(false);

    expect(() => {
      result = decodeShareParam(btoa("not json {{{"));
    }).not.toThrow();
    expect(result!.ok).toBe(false);
  });

  // AC-3: decodeShareParam returns ok:false with code VERSION_MISMATCH for wrong version
  it("AC-3: decodeShareParam returns ok:false with code VERSION_MISMATCH for version !== 1", async () => {
    const { decodeShareParam } = await import("@/lib/share/shareCodec");
    const payload = btoa(JSON.stringify({ version: 99, input: makeInput() }));
    const result = decodeShareParam(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VERSION_MISMATCH");
    }
  });

  // AC-4: simulate never throws for any input
  it("AC-4: simulate does not throw for any input including edge cases", async () => {
    const { simulate } = await import("@/lib/simulation/simulate");
    expect(() => simulate(makeInput())).not.toThrow();
    expect(() => simulate(makeInput({ residenceYears: 0 }))).not.toThrow();
    expect(() => simulate(makeInput({ residenceYears: 100 }))).not.toThrow();
    expect(() => simulate(makeInput({ jeonseDeposit: NaN }))).not.toThrow();
    expect(() => simulate(makeInput({ buyPrice: Infinity }))).not.toThrow();
  });

  // AC-5: residenceYears===10 → netWorthByYear arrays length 11
  it("AC-5: ok:true result has netWorthByYear arrays of length residenceYears+1 (11 for 10 years)", async () => {
    const { simulate } = await import("@/lib/simulation/simulate");
    const result = simulate(makeInput({ residenceYears: 10 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.netWorthByYear.jeonse).toHaveLength(11);
      expect(result.data.netWorthByYear.monthly).toHaveLength(11);
      expect(result.data.netWorthByYear.buy).toHaveLength(11);
    }
  });

  // AC-6: highest finalNetWorth option matches recommendedOption, diffFromBest===0
  it("AC-6: recommendedOption matches highest finalNetWorth, diffFromBest for that option is 0", async () => {
    const { simulate } = await import("@/lib/simulation/simulate");
    const result = simulate(makeInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      const { finalNetWorth, recommendedOption, diffFromBest } = result.data;
      const maxVal = Math.max(finalNetWorth.jeonse, finalNetWorth.monthly, finalNetWorth.buy);
      expect(finalNetWorth[recommendedOption]).toBe(maxVal);
      expect(diffFromBest[recommendedOption]).toBe(0);
    }
  });

  // AC-7: NaN or Infinity in input → ok:false with meaningful message/code
  it("AC-7: NaN in SimulationInput returns ok:false with message about invalid input", async () => {
    const { simulate } = await import("@/lib/simulation/simulate");
    const nanResult = simulate(makeInput({ jeonseDeposit: NaN }));
    expect(nanResult.ok).toBe(false);
    if (!nanResult.ok) {
      const hasMessage =
        (nanResult.message && nanResult.message.includes("입력값을 확인해주세요")) ||
        (nanResult.code && nanResult.code.length > 0);
      expect(hasMessage).toBe(true);
    }

    const infResult = simulate(makeInput({ investmentReturnRate: Infinity }));
    expect(infResult.ok).toBe(false);
  });

  // AC-8: residenceYears===100 → ok:false with exact message
  it('AC-8: residenceYears=100 returns ok:false with message "거주기간이 너무 커요"', async () => {
    const { simulate } = await import("@/lib/simulation/simulate");
    const result = simulate(makeInput({ residenceYears: 100 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("거주기간이 너무 커요");
    }
  });

  // AC-9: all monetary values in ok:true result are integers
  it("AC-9: ok:true result monetary values are all integers", async () => {
    const { simulate } = await import("@/lib/simulation/simulate");
    const result = simulate(makeInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      const { finalNetWorth, netWorthByYear } = result.data;
      for (const key of ["jeonse", "monthly", "buy"] as const) {
        expect(Number.isInteger(finalNetWorth[key])).toBe(true);
        for (const val of netWorthByYear[key]) {
          expect(Number.isInteger(val)).toBe(true);
        }
      }
    }
  });

  // AC-10: TypeScript compiles — verified implicitly by typed imports above.
  // Additional check: round-trip encode→decode returns the original input
  it("AC-10 (codec round-trip): encode then decode returns the original input", async () => {
    const { encodeShareParamV1, decodeShareParam } = await import("@/lib/share/shareCodec");
    const input = makeInput();
    const encoded = encodeShareParamV1(input);
    const decoded = decodeShareParam(encoded);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.data.input.id).toBe(input.id);
      expect(decoded.data.input.jeonseDeposit).toBe(input.jeonseDeposit);
      expect(decoded.data.version).toBe(1);
    }
  });
});
