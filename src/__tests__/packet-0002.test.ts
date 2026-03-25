import { describe, it, expect, beforeEach } from "vitest";
import type { HistoryEntry, SimulationInput } from "@/lib/types";

// These files do not exist yet — tests are expected to FAIL (TDD red phase)
// The Coder will implement them to make these tests pass.

// ============================================================
// Helpers
// ============================================================

function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    id: "input-1",
    presetId: null,
    jeonseDeposit: 0,
    jeonseLoanRatio: 0,
    jeonseInterestRate: 0,
    monthlyDeposit: 0,
    monthlyRent: 0,
    monthlyRentIncreaseRate: 0,
    buyPrice: 0,
    buyEquity: 0,
    buyLoanRate: 0,
    buyLoanPeriodYears: 0,
    buyRepaymentType: "AMORTIZED",
    initialAsset: 0,
    residenceYears: 5,
    investmentReturnRate: 0,
    housePriceGrowthRate: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  const now = Date.now();
  return {
    id: `entry-${now}-${Math.random()}`,
    createdAt: now,
    updatedAt: now,
    label: "test entry",
    input: makeInput(),
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe("localStorage keys + StorageAdapter 구현", () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear();
  });

  // ----------------------------------------------------------
  // AC-1: STORAGE_KEYS 상수 값 확인
  // ----------------------------------------------------------
  it("AC-1: STORAGE_KEYS exports correct runtime constant values", async () => {
    const { STORAGE_KEYS } = await import("@/lib/storage/keys");
    expect(STORAGE_KEYS).toEqual({
      history: "rc_history_v1",
      settings: "rc_settings_v1",
      entitlement: "rc_entitlement_v1",
    });
  });

  // ----------------------------------------------------------
  // AC-2: getSettings() 키 없을 때 기본값 반환
  // ----------------------------------------------------------
  it("AC-2: getSettings() returns default when key is absent", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    const result = await localStorageAdapter.getSettings();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      hasSeenSimulationDisclaimer: false,
      createdAt: 0,
      updatedAt: 0,
    });
  });

  // ----------------------------------------------------------
  // AC-3: getEntitlement() 키 없을 때 기본값 반환
  // ----------------------------------------------------------
  it("AC-3: getEntitlement() returns default with correct shape when key is absent", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    const result = await localStorageAdapter.getEntitlement();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.isPremium).toBe(false);
    expect(result.data.premiumSince).toBe(null);
    expect(result.data.ownerUserId).toBe(null);
    expect(result.data.maxResidenceYears).toBe(10);
    expect(result.data.createdAt).toBe(0);
    expect(result.data.updatedAt).toBe(0);
    expect(typeof result.data.id).toBe("string");
    expect(result.data.id.length).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------
  // AC-4: listHistory invalid params → INVALID_PARAMS
  // ----------------------------------------------------------
  it("AC-4a: listHistory({page:0, pageSize:5}) returns INVALID_PARAMS", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    const result = await localStorageAdapter.listHistory({ page: 0, pageSize: 5 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_PARAMS");
  });

  it("AC-4b: listHistory({page:1, pageSize:10}) returns INVALID_PARAMS", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    const result = await localStorageAdapter.listHistory({ page: 1, pageSize: 10 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_PARAMS");
  });

  // ----------------------------------------------------------
  // AC-5: listHistory items are sorted by createdAt descending
  // ----------------------------------------------------------
  it("AC-5: listHistory({page:1, pageSize:5}) items sorted by createdAt descending", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    const entries: HistoryEntry[] = [
      makeEntry({ id: "a", createdAt: 1000, updatedAt: 1000 }),
      makeEntry({ id: "b", createdAt: 3000, updatedAt: 3000 }),
      makeEntry({ id: "c", createdAt: 2000, updatedAt: 2000 }),
    ];
    for (const e of entries) {
      await localStorageAdapter.saveHistoryEntry(e);
    }
    const result = await localStorageAdapter.listHistory({ page: 1, pageSize: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.data.items.map((i) => i.id);
    expect(ids).toEqual(["b", "c", "a"]);
  });

  // ----------------------------------------------------------
  // AC-6: listHistory page>1 → ok:true, items:[], total maintained
  // ----------------------------------------------------------
  it("AC-6: listHistory page 2 when only 3 entries returns ok:true with empty items", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    await localStorageAdapter.saveHistoryEntry(makeEntry({ id: "x1", createdAt: 1 }));
    await localStorageAdapter.saveHistoryEntry(makeEntry({ id: "x2", createdAt: 2 }));
    await localStorageAdapter.saveHistoryEntry(makeEntry({ id: "x3", createdAt: 3 }));

    const result = await localStorageAdapter.listHistory({ page: 2, pageSize: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toEqual([]);
    expect(result.data.total).toBe(3);
    expect(result.data.page).toBe(2);
  });

  // ----------------------------------------------------------
  // AC-7: saveHistoryEntry duplicate id → VALIDATION_ERROR
  // ----------------------------------------------------------
  it("AC-7: saveHistoryEntry with duplicate id returns VALIDATION_ERROR", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    const entry = makeEntry({ id: "dup-id" });
    const first = await localStorageAdapter.saveHistoryEntry(entry);
    expect(first.ok).toBe(true);

    const second = await localStorageAdapter.saveHistoryEntry(entry);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe("VALIDATION_ERROR");
  });

  // ----------------------------------------------------------
  // AC-8: saveHistoryEntry max 5 entries — oldest removed on 6th
  // ----------------------------------------------------------
  it("AC-8: saveHistoryEntry keeps max 5 entries, removes oldest on overflow", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    // Save 5 entries with known createdAt values
    for (let i = 1; i <= 5; i++) {
      await localStorageAdapter.saveHistoryEntry(
        makeEntry({ id: `e${i}`, createdAt: i * 100 })
      );
    }

    // Save 6th — createdAt=100 (id=e1) is oldest, should be evicted
    const sixth = makeEntry({ id: "e6", createdAt: 600 });
    const result = await localStorageAdapter.saveHistoryEntry(sixth);
    expect(result.ok).toBe(true);

    const list = await localStorageAdapter.listHistory({ page: 1, pageSize: 5 });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data.total).toBe(5);
    const ids = list.data.items.map((i) => i.id);
    expect(ids).not.toContain("e1"); // oldest was evicted
    expect(ids).toContain("e6");
  });

  // ----------------------------------------------------------
  // AC-9: deleteHistoryById missing id → NOT_FOUND
  // ----------------------------------------------------------
  it("AC-9: deleteHistoryById non-existent id returns NOT_FOUND", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");
    const result = await localStorageAdapter.deleteHistoryById("does-not-exist");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NOT_FOUND");
  });

  // ----------------------------------------------------------
  // AC-10: QuotaExceededError maps to QUOTA_EXCEEDED
  // ----------------------------------------------------------
  it("AC-10: QuotaExceededError during save maps to QUOTA_EXCEEDED", async () => {
    const { localStorageAdapter } = await import("@/lib/storage/localStorageAdapter");

    // Simulate QuotaExceededError by overriding setItem
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };

    try {
      const entry = makeEntry({ id: "quota-test" });
      const result = await localStorageAdapter.saveHistoryEntry(entry);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("QUOTA_EXCEEDED");
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
