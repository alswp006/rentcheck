import { describe, it, expect } from "vitest";
import type {
  RouteState,
  SimulationInput,
  SimulationInputUserField,
  Result,
  AppErrorCode,
  Paginated,
  OptionResult,
  SimulationResult,
  HistoryEntry,
  LastInputSnapshot,
  SharePayload,
  PresetService,
  SimulationValidationService,
  SimulationService,
  ShareService,
  HistoryStorage,
  LastInputStorage,
} from "@/lib/types";

/**
 * Packet 0001: [Types] 코어 타입/데이터모델/서비스 인터페이스 + RouteState 계약
 *
 * types.ts is pure type-only — no runtime code.
 * Tests use compile-time type assertions and structural checks.
 */

describe("[Types] 코어 타입/데이터모델/서비스 인터페이스 + RouteState 계약", () => {
  // AC-1: types.ts에 런타임 코드(함수/상수/클래스/side-effect)가 0개여야 한다
  it("AC-1: types.ts module imports without runtime side-effects", async () => {
    // If the import fails or throws, this test fails.
    // Types are erased at runtime so we just verify the module loads cleanly.
    const mod = await import("@/lib/types");
    // A pure-type module should export nothing at runtime (all erased)
    const runtimeExports = Object.keys(mod);
    expect(runtimeExports).toHaveLength(0);
  });

  // AC-2: RouteState has exactly 4 route keys
  it("AC-2: RouteState type has exactly the 4 required route keys", () => {
    // Compile-time assertion: these assignments must be assignable to RouteState
    type AssertRouteKeys = [
      keyof RouteState extends "/" | "/input" | "/result" | "/history" ? true : false,
      "/" | "/input" | "/result" | "/history" extends keyof RouteState ? true : false,
    ];
    const _check: AssertRouteKeys = [true, true];
    expect(_check).toEqual([true, true]);
  });

  // AC-3: SimulationInputUserField excludes 'id' | 'createdAt' | 'updatedAt'
  it("AC-3: SimulationInputUserField excludes meta fields", () => {
    // Type-level: 'id', 'createdAt', 'updatedAt' must NOT be assignable to SimulationInputUserField
    type IdNotInUserField = "id" extends SimulationInputUserField ? false : true;
    type CreatedAtNotInUserField = "createdAt" extends SimulationInputUserField ? false : true;
    type UpdatedAtNotInUserField = "updatedAt" extends SimulationInputUserField ? false : true;
    // A user-facing field MUST be in SimulationInputUserField
    type PresetIdInUserField = "presetId" extends SimulationInputUserField ? true : false;

    const _idCheck: IdNotInUserField = true;
    const _caCheck: CreatedAtNotInUserField = true;
    const _uaCheck: UpdatedAtNotInUserField = true;
    const _presetCheck: PresetIdInUserField = true;

    expect(_idCheck).toBe(true);
    expect(_caCheck).toBe(true);
    expect(_uaCheck).toBe(true);
    expect(_presetCheck).toBe(true);
  });

  // AC-4: Result<T,E> is a discriminated union on 'ok'
  it("AC-4: Result<T,E> is a discriminated union with ok:true/value and ok:false/error", () => {
    type OkResult = Extract<Result<string, { code: AppErrorCode }>, { ok: true }>;
    type ErrResult = Extract<Result<string, { code: AppErrorCode }>, { ok: false }>;

    // ok:true branch must have 'value', no 'error'
    type HasValue = "value" extends keyof OkResult ? true : false;
    type NoErrorOnOk = "error" extends keyof OkResult ? false : true;

    // ok:false branch must have 'error', no 'value'
    type HasError = "error" extends keyof ErrResult ? true : false;
    type NoValueOnErr = "value" extends keyof ErrResult ? false : true;

    const _v: HasValue = true;
    const _noE: NoErrorOnOk = true;
    const _e: HasError = true;
    const _noV: NoValueOnErr = true;

    expect(_v).toBe(true);
    expect(_noE).toBe(true);
    expect(_e).toBe(true);
    expect(_noV).toBe(true);
  });

  it("should be able to construct conforming SimulationInput objects", () => {
    const input: SimulationInput = {
      id: "test-id",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      presetId: null,
      jeonseDepositKRW: 100_000_000,
      jeonseLoanRatio: 0.7,
      jeonseLoanRateAPR: 3.5,
      monthlyDepositKRW: 10_000_000,
      monthlyRentKRW: 800_000,
      monthlyRentIncreaseRateAnnual: 2,
      buyPriceKRW: 500_000_000,
      buyEquityKRW: 200_000_000,
      buyLoanRateAPR: 4,
      buyLoanPeriodYears: 30,
      buyRepaymentType: "원리금균등",
      initialAssetKRW: 200_000_000,
      stayPeriodYears: 5,
      investmentReturnRateAnnual: 5,
      housePriceGrowthRateAnnual: 3,
    };
    expect(input.id).toBe("test-id");
    expect(input.buyRepaymentType).toBe("원리금균등");
  });

  it("should be able to construct Paginated<T> objects", () => {
    const page: Paginated<string> = { items: ["a", "b"], total: 2, page: 1 };
    expect(page.total).toBe(2);
  });

  it("should be able to construct SimulationResult with 3 OptionResult entries", () => {
    const now = Date.now();
    const makeOption = (option: OptionResult["option"]): OptionResult => ({
      id: option,
      option,
      netWorthByYearKRW: [100, 200],
      finalNetWorthKRW: 200,
      totalCostKRW: 50,
      createdAt: now,
      updatedAt: now,
    });

    const result: SimulationResult = {
      id: "r1",
      stayPeriodYears: 1,
      results: [makeOption("JEONSE"), makeOption("MONTHLY"), makeOption("BUY")],
      recommendedOption: "BUY",
      deltaToSecondBestKRW: 100,
      insightCopy: "집값상승률을 1%p 높이면 매매가 1년 후 100원 더 유리해요.",
      costBreakdownRows: [],
      createdAt: now,
      updatedAt: now,
    };

    expect(result.results).toHaveLength(3);
    expect(result.results[0].option).toBe("JEONSE");
    expect(result.results[1].option).toBe("MONTHLY");
    expect(result.results[2].option).toBe("BUY");
  });

  it("should be able to construct HistoryEntry and LastInputSnapshot", () => {
    const now = Date.now();
    const input: SimulationInput = {
      id: "x",
      createdAt: now,
      updatedAt: now,
      presetId: null,
      jeonseDepositKRW: 0,
      jeonseLoanRatio: 0,
      jeonseLoanRateAPR: 0,
      monthlyDepositKRW: 0,
      monthlyRentKRW: 0,
      monthlyRentIncreaseRateAnnual: 0,
      buyPriceKRW: 0,
      buyEquityKRW: 0,
      buyLoanRateAPR: 0,
      buyLoanPeriodYears: 1,
      buyRepaymentType: "만기일시",
      initialAssetKRW: 0,
      stayPeriodYears: 1,
      investmentReturnRateAnnual: 0,
      housePriceGrowthRateAnnual: 0,
    };

    const entry: HistoryEntry = { id: "h1", createdAt: now, updatedAt: now, label: "직접 입력 · 집값 0% · 1년", input };
    const snapshot: LastInputSnapshot = { version: 1, createdAt: now, updatedAt: now, input };
    const payload: SharePayload = { id: "sp1", encoded: "abc==", version: 1, createdAt: now, updatedAt: now };

    expect(entry.id).toBe("h1");
    expect(snapshot.version).toBe(1);
    expect(payload.version).toBe(1);
  });

  it("should compile service interface shapes without error", () => {
    // These are just compile-time shape checks — if they typecheck, we're good.
    type _PS = PresetService;
    type _VS = SimulationValidationService;
    type _SS = SimulationService;
    type _SH = ShareService;
    type _HS = HistoryStorage;
    type _LI = LastInputStorage;
    expect(true).toBe(true);
  });
});
