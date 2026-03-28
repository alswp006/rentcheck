export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
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

// ──── History Storage ────

interface HistoryEntry {
  input: string;
  timestamp: string;
}

interface HistoryResult {
  ok: boolean;
  entries?: HistoryEntry[];
  error?: string;
}

const HISTORY_KEY = "rentcheck.history.v1";

export function loadHistory(): HistoryResult {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return { ok: true, entries: [] };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "PARSE_FAIL" };
    }
    // Filter out entries missing the required 'input' field
    const entries = parsed.filter(
      (entry: unknown): entry is HistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        "input" in entry &&
        typeof (entry as Record<string, unknown>).input === "string"
    );
    return { ok: true, entries };
  } catch {
    return { ok: false, error: "PARSE_FAIL" };
  }
}

interface UpsertHistoryResult {
  ok: boolean;
  entries?: HistoryEntry[];
  error?: string;
}

export function upsertHistory(
  input: string,
  timestamp: string
): UpsertHistoryResult {
  try {
    const result = loadHistory();
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const entries = result.entries || [];
    const newEntry: HistoryEntry = { input, timestamp };

    // Add new entry at the beginning (index 0)
    const updated = [newEntry, ...entries];

    // Keep only the first 5 entries
    const capped = updated.slice(0, 5);

    // Save to localStorage
    localStorage.setItem(HISTORY_KEY, JSON.stringify(capped));

    return { ok: true, entries: capped };
  } catch (e) {
    // Handle QuotaExceededError
    if (
      e instanceof DOMException &&
      e.name === "QuotaExceededError"
    ) {
      return { ok: false, error: "QUOTA_EXCEEDED" };
    }
    return { ok: false, error: "WRITE_FAIL" };
  }
}

// ──── UI State Storage ────

interface UIState {
  [key: string]: unknown;
}

interface UIStateResultSuccess {
  ok: true;
  uiState: UIState;
}

interface UIStateResultError {
  ok: false;
  error?: string;
}

type UIStateResult = UIStateResultSuccess | UIStateResultError;

const UI_STATE_KEY = "rentcheck.ui.v1";

export function saveUiState(state: UIState): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    if (
      e instanceof DOMException &&
      e.name === "QuotaExceededError"
    ) {
      return { ok: false, error: "QUOTA_EXCEEDED" };
    }
    return { ok: false, error: "WRITE_FAIL" };
  }
}

export function loadUiState(): UIStateResult {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw) {
      return { ok: false };
    }
    const uiState = JSON.parse(raw) as UIState;
    return { ok: true, uiState };
  } catch {
    return { ok: false };
  }
}
