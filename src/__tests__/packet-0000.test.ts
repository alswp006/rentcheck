import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadHistory,
  upsertHistory,
  saveUiState,
  loadUiState,
} from "@/lib/storage";

// ──── localStorage mock ───────────────────────────────────────────────────────

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const HISTORY_KEY = "rentcheck.history.v1";
const UI_STATE_KEY = "rentcheck.ui.v1";

beforeEach(() => {
  localStorageMock.clear();
  vi.restoreAllMocks();
});

// ──── loadHistory ─────────────────────────────────────────────────────────────

describe("loadHistory", () => {
  it("AC1: key missing → { ok:true, entries:[] }", () => {
    const result = loadHistory();
    expect(result).toEqual({ ok: true, entries: [] });
  });

  it("AC2: 'NOT_JSON' → { ok:false, error:'PARSE_FAIL' }", () => {
    store[HISTORY_KEY] = "NOT_JSON";
    const result = loadHistory();
    expect(result).toEqual({ ok: false, error: "PARSE_FAIL" });
  });

  it("AC3: entry with null/missing input is skipped; valid entry kept", () => {
    store[HISTORY_KEY] = JSON.stringify([
      { input: "good", timestamp: "2026-03-28T00:00:00Z" },
      { timestamp: "2026-03-28T00:00:01Z" }, // missing input
      { input: null, timestamp: "2026-03-28T00:00:02Z" }, // null input
    ]);
    const result = loadHistory();
    expect(result.ok).toBe(true);
    expect(result.entries!).toHaveLength(1);
    expect(result.entries![0].input).toBe("good");
  });
});

// ──── upsertHistory ───────────────────────────────────────────────────────────

describe("upsertHistory", () => {
  it("AC4: 5 existing + new → length 5, new at index 0, oldest evicted", () => {
    store[HISTORY_KEY] = JSON.stringify(
      Array.from({ length: 5 }, (_, i) => ({
        input: `input-${i}`,
        timestamp: `2026-03-28T00:00:0${i}Z`,
      }))
    );
    const result = upsertHistory("brand-new", "2026-03-28T01:00:00Z");
    expect(result.ok).toBe(true);
    expect(result.entries!).toHaveLength(5);
    expect(result.entries![0].input).toBe("brand-new");
  });

  it("AC5: QuotaExceededError → { ok:false, error:'QUOTA_EXCEEDED' }, data unchanged", () => {
    const original = JSON.stringify([
      { input: "existing", timestamp: "2026-03-28T00:00:00Z" },
    ]);
    store[HISTORY_KEY] = original;

    const quotaError = new DOMException("quota exceeded", "QuotaExceededError");
    vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
      throw quotaError;
    });

    const result = upsertHistory("new", "2026-03-28T01:00:00Z");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("QUOTA_EXCEEDED");
    expect(store[HISTORY_KEY]).toBe(original);
  });
});

// ──── saveUiState / loadUiState ───────────────────────────────────────────────

describe("saveUiState / loadUiState", () => {
  it("AC6: saveUiState stores valid JSON object string", () => {
    const result = saveUiState({ lastPresetId: "P3" });
    expect(result.ok).toBe(true);
    const raw = store[UI_STATE_KEY];
    expect(typeof raw).toBe("string");
    const parsed = JSON.parse(raw);
    expect(typeof parsed).toBe("object");
    expect(parsed).not.toBeNull();
    expect(parsed.lastPresetId).toBe("P3");
  });

  it("AC7: loadUiState on invalid JSON → { ok:false } without throwing", () => {
    store[UI_STATE_KEY] = "{{invalid}}";
    let result: ReturnType<typeof loadUiState> | undefined;
    expect(() => {
      result = loadUiState();
    }).not.toThrow();
    expect(result!.ok).toBe(false);
  });
});
