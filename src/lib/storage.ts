// ──── Base helpers ────────────────────────────────────────────────────────────

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// ──── History ─────────────────────────────────────────────────────────────────

const HISTORY_KEY = "rentcheck.history.v1";
const MAX_HISTORY = 5;

interface StoredHistoryEntry {
  input: string;
  timestamp: string;
}

// Non-discriminated union so callers can use result.entries! / result.error
// without explicit narrowing (required by pre-written tests)
export interface HistoryResult {
  ok: boolean;
  entries?: StoredHistoryEntry[];
  error?: string;
}

export interface UpsertHistoryResult {
  ok: boolean;
  entries?: StoredHistoryEntry[];
  error?: string;
}

function isValidEntry(e: unknown): e is StoredHistoryEntry {
  if (typeof e !== "object" || e === null) return false;
  const obj = e as Record<string, unknown>;
  return "input" in obj && obj.input !== null && obj.input !== undefined;
}

export function loadHistory(): HistoryResult {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw === null) return { ok: true, entries: [] };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "PARSE_FAIL" };
    }

    if (!Array.isArray(parsed)) {
      return { ok: false, error: "PARSE_FAIL" };
    }

    // Skip corrupted entries (missing/null input), keep valid ones
    const entries = parsed.filter(isValidEntry);
    return { ok: true, entries };
  } catch {
    return { ok: false, error: "PARSE_FAIL" };
  }
}

export function upsertHistory(
  input: string,
  timestamp: string
): UpsertHistoryResult {
  const loaded = loadHistory();
  if (!loaded.ok) {
    return { ok: false, error: loaded.error };
  }

  const entries = loaded.entries ?? [];

  // Deep-equal dedup: for strings, strict equality suffices
  const existingIndex = entries.findIndex((e) => e.input === input);

  let updated: StoredHistoryEntry[];
  if (existingIndex !== -1) {
    // Duplicate: update timestamp, move to index 0
    const moved: StoredHistoryEntry = { input, timestamp };
    updated = [moved, ...entries.filter((_, i) => i !== existingIndex)];
  } else {
    updated = [{ input, timestamp }, ...entries];
  }

  // Evict oldest entries beyond MAX_HISTORY
  const capped = updated.slice(0, MAX_HISTORY);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(capped));
    return { ok: true, entries: capped };
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      return { ok: false, error: "QUOTA_EXCEEDED" };
    }
    // Also handle Error objects whose name was set to QuotaExceededError
    if (e instanceof Error && e.name === "QuotaExceededError") {
      return { ok: false, error: "QUOTA_EXCEEDED" };
    }
    return { ok: false, error: "WRITE_FAIL" };
  }
}

// ──── UI State ────────────────────────────────────────────────────────────────

const UI_STATE_KEY = "rentcheck.ui.v1";

export interface UIState {
  lastPresetId?: "P1" | "P2" | "P3" | "P4";
}

export type UIStateResult =
  | { ok: true; uiState: UIState }
  | { ok: false; error?: string };

export function saveUiState(state: UIState): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      return { ok: false, error: "QUOTA_EXCEEDED" };
    }
    if (e instanceof Error && e.name === "QuotaExceededError") {
      return { ok: false, error: "QUOTA_EXCEEDED" };
    }
    return { ok: false, error: "WRITE_FAIL" };
  }
}

export function loadUiState(): UIStateResult {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (raw === null) return { ok: false };
    const uiState = JSON.parse(raw) as UIState;
    return { ok: true, uiState };
  } catch {
    return { ok: false };
  }
}
