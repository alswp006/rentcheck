import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("localStorage 저장소 헬퍼(History + UIState)", () => {
  const HISTORY_KEY = "rentcheck.history.v1";
  const UI_STATE_KEY = "rentcheck.ui.v1";

  // Mock localStorage
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    // Setup localStorage mock
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      length: Object.keys(store).length,
    };
    vi.stubGlobal("localStorage", mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ===== loadHistory() tests =====

  it("AC-1: loadHistory() returns { ok:true, entries:[] } when key doesn't exist", async () => {
    const { loadHistory } = await import("@/lib/storage");
    const result = loadHistory();

    expect(result).toEqual({ ok: true, entries: [] });
  });

  it("AC-2: loadHistory() returns { ok:false, error:'PARSE_FAIL' } on invalid JSON", async () => {
    store[HISTORY_KEY] = "NOT_JSON";

    const { loadHistory } = await import("@/lib/storage");
    const result = loadHistory();

    expect(result).toEqual({ ok: false, error: "PARSE_FAIL" });
  });

  it("AC-3: loadHistory() skips entries with missing required 'input' field and keeps valid ones", async () => {
    const validEntry1 = { input: "valid-1", timestamp: "2026-03-28T00:00:00Z" };
    const validEntry2 = { input: "valid-2", timestamp: "2026-03-28T00:01:00Z" };
    const malformedEntry = { timestamp: "2026-03-28T00:02:00Z" }; // missing 'input'

    store[HISTORY_KEY] = JSON.stringify([
      validEntry1,
      malformedEntry,
      validEntry2,
    ]);

    const { loadHistory } = await import("@/lib/storage");
    const result = loadHistory();

    expect(result.ok).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].input).toBe("valid-1");
    expect(result.entries[1].input).toBe("valid-2");
  });

  // ===== upsertHistory() tests =====

  it("AC-4: upsertHistory() maintains max 5 entries with newest at index 0 (FIFO eviction)", async () => {
    // Setup: 5 existing entries
    const existing = [
      { input: "input-1", timestamp: "2026-03-28T00:00:01Z" },
      { input: "input-2", timestamp: "2026-03-28T00:00:02Z" },
      { input: "input-3", timestamp: "2026-03-28T00:00:03Z" },
      { input: "input-4", timestamp: "2026-03-28T00:00:04Z" },
      { input: "input-5", timestamp: "2026-03-28T00:00:05Z" },
    ];
    store[HISTORY_KEY] = JSON.stringify(existing);

    const { upsertHistory } = await import("@/lib/storage");
    const newISO = "2026-03-28T00:00:06Z";
    const result = upsertHistory("new-input", newISO);

    expect(result.ok).toBe(true);
    expect(result.entries).toHaveLength(5); // exactly 5
    expect(result.entries[0].input).toBe("new-input"); // newest at index 0
    expect(result.entries[0].timestamp).toBe(newISO);
    // Verify the oldest was evicted
    expect(result.entries.map((e) => e.input)).not.toContain("input-5");
  });

  it("AC-5: upsertHistory() handles QuotaExceededError and returns { ok:false, error:'QUOTA_EXCEEDED' }", async () => {
    store[HISTORY_KEY] = JSON.stringify([]);
    const originalValue = store[HISTORY_KEY];

    // Mock setItem to throw QuotaExceededError on upsertHistory call
    const quotaError = new Error("QuotaExceededError");
    quotaError.name = "QuotaExceededError";

    let callCount = 0;
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        callCount++;
        // Throw only on the second call (upsertHistory's setItem)
        if (callCount > 1) {
          throw quotaError;
        }
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      length: Object.keys(store).length,
    };
    vi.stubGlobal("localStorage", mockStorage);

    const { upsertHistory } = await import("@/lib/storage");
    const result = upsertHistory("test-input", "2026-03-28T00:00:00Z");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("QUOTA_EXCEEDED");
    // Verify the original value wasn't changed
    expect(store[HISTORY_KEY]).toBe(originalValue);
  });

  // ===== saveUiState() tests =====

  it("AC-6: saveUiState() saves UiState object as JSON string to 'rentcheck.ui.v1'", async () => {
    const { saveUiState } = await import("@/lib/storage");
    const uiState = { lastPresetId: "P2" as const };

    saveUiState(uiState);

    const saved = store[UI_STATE_KEY];
    expect(saved).toBe(JSON.stringify(uiState));
  });

  // ===== loadUiState() tests =====

  it("AC-7: loadUiState() returns { ok:false } on error and never throws", async () => {
    // Mock localStorage.getItem to throw an error
    const testError = new Error("Storage read error");
    const mockStorage = {
      getItem: () => {
        throw testError;
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    vi.stubGlobal("localStorage", mockStorage);

    const { loadUiState } = await import("@/lib/storage");

    // Should not throw
    let result;
    expect(() => {
      result = loadUiState();
    }).not.toThrow();

    // Should return { ok: false }
    expect(result?.ok).toBe(false);
  });

  it("loadUiState() returns { ok:true, uiState } when valid JSON exists", async () => {
    const validUiState = { lastPresetId: "P1" as const };
    store[UI_STATE_KEY] = JSON.stringify(validUiState);

    const { loadUiState } = await import("@/lib/storage");
    const result = loadUiState();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.uiState).toEqual(validUiState);
    }
  });

  it("loadUiState() returns { ok:false } when key doesn't exist", async () => {
    const { loadUiState } = await import("@/lib/storage");
    const result = loadUiState();

    expect(result.ok).toBe(false);
  });
});
