import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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
    // Import will happen when implementation exists
    const { readDraftInput } = require("@/lib/storage/draft");
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
    const { readDraftInput } = require("@/lib/storage/draft");

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
    const { writeDraftInput, readDraftInput } = require("@/lib/storage/draft");

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
    const { writeDraftInput } = require("@/lib/storage/draft");

    const testInput = {
      location: "x".repeat(100000), // Large object to trigger quota
      roomCount: 1,
      priceMin: 0,
      priceMax: 999999999,
    };

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
    const { readHistory } = require("@/lib/storage/history");

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
    const { readHistory, upsertHistory } = require("@/lib/storage/history");

    const entries = [
      { id: "h1", timestamp: 1000, address: "addr1" },
      { id: "h2", timestamp: 2000, address: "addr2" },
      { id: "h3", timestamp: 3000, address: "addr3" },
      { id: "h4", timestamp: 4000, address: "addr4" },
      { id: "h5", timestamp: 5000, address: "addr5" },
    ];

    // Write 5 entries
    entries.forEach((entry) => {
      const result = upsertHistory(TOSS_USER_ID, entry);
      expect(result.ok).toBe(true);
    });

    // Now add a 6th entry (should evict oldest)
    const newEntry = { id: "h6", timestamp: 6000, address: "addr6" };
    const upsertResult = upsertHistory(TOSS_USER_ID, newEntry);
    expect(upsertResult.ok).toBe(true);

    // Verify state
    const readResult = readHistory(TOSS_USER_ID);
    expect(readResult.ok).toBe(true);
    expect(readResult.value).toHaveLength(5);
    expect(readResult.value[0]).toEqual(newEntry); // New at index 0
    expect(readResult.value[4]).toEqual(entries[3]); // Last removed, h5 dropped
  });

  // ============================================================================
  // AC-7: History READ parse error returns error union, no throw
  // ============================================================================
  it("AC-7: readHistory returns error union on JSON.parse failure (corrupted storage)", () => {
    const { readHistory } = require("@/lib/storage/history");

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
    const { upsertHistory } = require("@/lib/storage/history");

    // Corrupt the history storage
    localStorage.setItem(HISTORY_KEY, "{ bad json [");

    const newEntry = { id: "h-new", timestamp: Date.now(), address: "test" };

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
    const { readHistory, upsertHistory, deleteAllHistory } =
      require("@/lib/storage/history");

    // Create some history first
    const entry = { id: "h1", timestamp: 1000, address: "addr1" };
    upsertHistory(TOSS_USER_ID, entry);

    // Verify it exists
    let result = readHistory(TOSS_USER_ID);
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
    const { readDraftInput, writeDraftInput } = require("@/lib/storage/draft");

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

    expect(result1.value).toEqual(input1);
    expect(result2.value).toEqual(input2);
  });

  // ============================================================================
  // Error type validation: ensure error codes are specific
  // ============================================================================
  it("Error codes are specific and distinguishable", () => {
    const { readDraftInput } = require("@/lib/storage/draft");
    const { readHistory } = require("@/lib/storage/history");

    localStorage.setItem(`draft:${TOSS_USER_ID}`, "bad json");
    localStorage.setItem(`history:${TOSS_USER_ID}`, "bad json");

    const draftErr = readDraftInput(TOSS_USER_ID);
    const historyErr = readHistory(TOSS_USER_ID);

    expect(draftErr.errorCode).toBe("STORAGE_PARSE_ERROR");
    expect(historyErr.errorCode).toBe("STORAGE_PARSE_ERROR");
    expect(draftErr.fallback).toBe("DEFAULT_INPUT");
    expect(historyErr.fallback).toBe("EMPTY_ARRAY");
  });
});
