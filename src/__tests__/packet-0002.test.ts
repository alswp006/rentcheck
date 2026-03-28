import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { HistoryEntry, SimulationInput } from "@/lib/types";
import { readDraftInput, writeDraftInput } from "@/lib/storage/draft";
import { readHistory, upsertHistory, deleteAllHistory } from "@/lib/storage/history";

/**
 * SC-1/SC-2 localStorage 헬퍼 구현(draft/history) — TDD RED Phase
 *
 * These tests define the expected behavior for:
 * - readDraftInput(tossUserId) → returns default or stored draft
 * - writeDraftInput(tossUserId, input) → stores draft or returns error
 * - readHistory(tossUserId) → returns [] or stored history
 * - upsertHistory(tossUserId, entry) → maintains 5-item queue with FIFO eviction
 * - deleteAllHistory(tossUserId) → clears history
 */

// Helper to create test HistoryEntry
function makeTestEntry(id: string, timestamp: number): HistoryEntry {
  const mockInput: SimulationInput = {
    presetId: null,
    jeonseDeposit: 300_000_000,
    jeonseLoanRatio: 0.5,
    jeonseInterestRate: 0.035,
    monthlyDeposit: 50_000_000,
    monthlyRent: 800_000,
    monthlyRentIncreaseRate: 0.03,
    buyPrice: 500_000_000,
    buyEquity: 100_000_000,
    buyLoanInterestRate: 0.04,
    buyLoanPeriodYears: 30,
    buyRepaymentType: "equal_payment",
    initialAsset: 100_000_000,
    residencePeriodYears: 5,
    investmentReturnRate: 0.05,
    housePriceGrowthRate: 0.03,
  };

  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    label: `시나리오 ${id}`,
    input: mockInput,
    result: {
      netWorthSeries: [],
      finalNetWorth: { jeonse: 0, monthly: 0, buy: 0 },
      recommendedOption: "jeonse",
      insightCopy: "test insight",
      costBreakdown: { jeonse: {}, monthly: {}, buy: {} },
    },
  };
}

describe("SC-1/SC-2 localStorage 헬퍼 구현(draft/history)", () => {
  const TOSS_USER_ID = "test-user-12345";
  const DRAFT_KEY = `draft:${TOSS_USER_ID}`;
  const HISTORY_KEY = `history:${TOSS_USER_ID}`;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // AC-1: readDraftInput returns default when key missing
  // ============================================================================
  it("AC-1: readDraftInput(tossUserId) returns default value when key does not exist", () => {
    const DEFAULT_INPUT = {
      location: "",
      roomCount: 1,
      priceMin: 0,
      priceMax: 10000000,
    };

    const result = readDraftInput(TOSS_USER_ID);

    expect(result).toEqual({
      ok: true,
      value: DEFAULT_INPUT,
    });
  });

  // ============================================================================
  // AC-2: Draft READ parse error returns error union, no throw
  // ============================================================================
  it("AC-2: readDraftInput returns error union on JSON.parse failure (corrupted storage)", () => {
    // Simulate corrupted JSON in localStorage
    localStorage.setItem(DRAFT_KEY, "{ invalid json");

    const result = readDraftInput(TOSS_USER_ID);

    expect(result).toEqual({
      ok: false,
      errorCode: "STORAGE_PARSE_ERROR",
      fallback: "DEFAULT_INPUT",
    });
    // Must not throw
    expect(result.ok).toBe(false);
  });

  // ============================================================================
  // AC-3: Draft WRITE stores value correctly (deep equality)
  // ============================================================================
  it("AC-3: writeDraftInput(tossUserId, input) successfully stores draft (primitive deep-equal)", () => {
    const testInput = {
      location: "서울시 강남구",
      roomCount: 2,
      priceMin: 500000,
      priceMax: 3000000,
    };

    const writeResult = writeDraftInput(TOSS_USER_ID, testInput);
    expect(writeResult).toEqual({ ok: true });

    // Verify by reading back
    const readResult = readDraftInput(TOSS_USER_ID);
    expect(readResult).toEqual({
      ok: true,
      value: testInput,
    });

    // Also verify direct localStorage check matches
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    expect(stored).toEqual(testInput);
  });

  // ============================================================================
  // AC-4: Draft WRITE quota exceeded error, storage not corrupted
  // ============================================================================
  it("AC-4: writeDraftInput returns error on QuotaExceededError, storage unchanged", () => {
    const testInput = {
      location: "test",
      roomCount: 1,
      priceMin: 0,
      priceMax: 999999999,
    };

    // Mock setItem to throw QuotaExceededError
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    // Capture pre-write state
    const preWriteValue = localStorage.getItem(DRAFT_KEY);

    // Try to write (will fail due to quota)
    const writeResult = writeDraftInput(TOSS_USER_ID, testInput);

    expect(writeResult).toEqual({
      ok: false,
      errorCode: "STORAGE_QUOTA_EXCEEDED",
    });

    // Verify storage not corrupted (unchanged)
    const postWriteValue = localStorage.getItem(DRAFT_KEY);
    expect(postWriteValue).toBe(preWriteValue);
  });

  // ============================================================================
  // AC-5: readHistory returns empty array when key missing
  // ============================================================================
  it("AC-5: readHistory(tossUserId) returns { ok: true, value: [] } when key does not exist", () => {
    const result = readHistory(TOSS_USER_ID);

    expect(result).toEqual({
      ok: true,
      value: [],
    });
  });

  // ============================================================================
  // AC-6: History UPSERT maintains 5-item limit, new at index 0, FIFO eviction
  // ============================================================================
  it("AC-6: upsertHistory(tossUserId, entry) maintains 5-item max with new entry at index 0", () => {
    const entries = [
      makeTestEntry("h1", 1000),
      makeTestEntry("h2", 2000),
      makeTestEntry("h3", 3000),
      makeTestEntry("h4", 4000),
      makeTestEntry("h5", 5000),
    ];

    // Write 5 entries
    entries.forEach((entry) => {
      const result = upsertHistory(TOSS_USER_ID, entry);
      expect(result.ok).toBe(true);
    });

    // Now add a 6th entry (should evict oldest)
    const newEntry = makeTestEntry("h6", 6000);
    const upsertResult = upsertHistory(TOSS_USER_ID, newEntry);
    expect(upsertResult.ok).toBe(true);

    // Verify state: [h6,h5,h4,h3,h2] — h1 dropped (oldest)
    const readResult = readHistory(TOSS_USER_ID);
    expect(readResult.ok).toBe(true);
    if (!readResult.ok) return;
    expect(readResult.value).toHaveLength(5);
    expect(readResult.value[0]).toEqual(newEntry); // New at index 0
    expect(readResult.value[4]).toEqual(entries[1]); // h1 dropped (oldest)
  });

  // ============================================================================
  // AC-7: History READ parse error returns error union, no throw
  // ============================================================================
  it("AC-7: readHistory returns error union on JSON.parse failure (corrupted storage)", () => {
    // Simulate corrupted JSON
    localStorage.setItem(HISTORY_KEY, "[ invalid json");

    const result = readHistory(TOSS_USER_ID);

    expect(result).toEqual({
      ok: false,
      errorCode: "STORAGE_PARSE_ERROR",
      fallback: "EMPTY_ARRAY",
    });
    expect(result.ok).toBe(false);
  });

  // ============================================================================
  // AC-8: History UPSERT doesn't write if READ fails (no corruption overwrite)
  // ============================================================================
  it("AC-8: upsertHistory returns READ error without calling setItem when READ fails", () => {
    // Corrupt the history storage
    localStorage.setItem(HISTORY_KEY, "{ bad json [");

    const newEntry = { id: "h-new", timestamp: Date.now(), address: "test" } as unknown as import("@/lib/types").HistoryEntry;

    // Try to upsert — should fail at READ, not attempt WRITE
    const result = upsertHistory(TOSS_USER_ID, newEntry);

    // Should return READ error
    expect(result).toEqual({
      ok: false,
      errorCode: "STORAGE_PARSE_ERROR",
      fallback: "EMPTY_ARRAY",
    });

    // Verify storage still contains corrupted data (not overwritten)
    const stored = localStorage.getItem(HISTORY_KEY);
    expect(stored).toBe("{ bad json [");
  });

  // ============================================================================
  // AC-9: deleteAllHistory clears history storage
  // ============================================================================
  it("AC-9: deleteAllHistory(tossUserId) removes storage, readHistory returns empty", () => {
    // Create some history first
    const entry = { id: "h1", timestamp: 1000, address: "addr1" } as unknown as import("@/lib/types").HistoryEntry;
    upsertHistory(TOSS_USER_ID, entry);

    // Verify it exists
    let result = readHistory(TOSS_USER_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);

    // Delete
    const deleteResult = deleteAllHistory(TOSS_USER_ID);
    expect(deleteResult.ok).toBe(true);

    // Verify it's gone
    result = readHistory(TOSS_USER_ID);
    expect(result).toEqual({
      ok: true,
      value: [],
    });

    // Verify localStorage key is gone
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
  });

  // ============================================================================
  // Integration: Multiple tossUserIds are isolated (scoped by key)
  // ============================================================================
  it("Multiple tossUserIds maintain isolated storage (keys scoped)", () => {
    const user1 = "user-1";
    const user2 = "user-2";

    const input1 = {
      location: "서울",
      roomCount: 1,
      priceMin: 1000000,
      priceMax: 2000000,
    };

    const input2 = {
      location: "부산",
      roomCount: 3,
      priceMin: 500000,
      priceMax: 1500000,
    };

    writeDraftInput(user1, input1);
    writeDraftInput(user2, input2);

    const result1 = readDraftInput(user1);
    const result2 = readDraftInput(user2);

    expect(result1.ok).toBe(true);
    if (!result1.ok) return;
    expect(result2.ok).toBe(true);
    if (!result2.ok) return;

    expect(result1.value).toEqual(input1);
    expect(result2.value).toEqual(input2);
  });

  // ============================================================================
  // Error type validation: ensure error codes are specific
  // ============================================================================
  it("Error codes are specific and distinguishable", () => {
    localStorage.setItem(`draft:${TOSS_USER_ID}`, "bad json");
    localStorage.setItem(`history:${TOSS_USER_ID}`, "bad json");

    const draftErr = readDraftInput(TOSS_USER_ID);
    const historyErr = readHistory(TOSS_USER_ID);

    expect(draftErr.ok).toBe(false);
    if (draftErr.ok) return;
    expect(historyErr.ok).toBe(false);
    if (historyErr.ok) return;

    expect(draftErr.errorCode).toBe("STORAGE_PARSE_ERROR");
    expect(historyErr.errorCode).toBe("STORAGE_PARSE_ERROR");
    expect(draftErr.fallback).toBe("DEFAULT_INPUT");
    expect(historyErr.fallback).toBe("EMPTY_ARRAY");
  });
});
