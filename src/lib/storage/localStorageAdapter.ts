import type {
  AppSettings,
  Entitlement,
  HistoryEntry,
  HistoryListResponse,
  ListHistoryParams,
  StorageAdapter,
  StorageResult,
} from "@/lib/types";
import { STORAGE_KEYS } from "./keys";

const MAX_HISTORY = 5;

function isQuotaExceeded(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.message.toLowerCase().includes("quota")
  );
}

function readJSON<T>(key: string): { ok: true; data: T | null } | { ok: false; code: "READ_ERROR" | "PARSE_ERROR"; message: string } {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch (e) {
    return { ok: false, code: "READ_ERROR", message: String(e) };
  }
  if (raw === null) return { ok: true, data: null };
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch (e) {
    return { ok: false, code: "PARSE_ERROR", message: String(e) };
  }
}

function writeJSON<T>(key: string, value: T): StorageResult<true, "QUOTA_EXCEEDED" | "WRITE_ERROR" | "SERIALIZE_ERROR"> {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (e) {
    return { ok: false, code: "SERIALIZE_ERROR", message: String(e) };
  }
  try {
    localStorage.setItem(key, serialized);
    return { ok: true, data: true };
  } catch (e) {
    if (isQuotaExceeded(e)) {
      return { ok: false, code: "QUOTA_EXCEEDED", message: String(e) };
    }
    return { ok: false, code: "WRITE_ERROR", message: String(e) };
  }
}

function removeKey(key: string): StorageResult<true, "WRITE_ERROR"> {
  try {
    localStorage.removeItem(key);
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, code: "WRITE_ERROR", message: String(e) };
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  hasSeenSimulationDisclaimer: false,
  createdAt: 0,
  updatedAt: 0,
};

function makeDefaultEntitlement(): Entitlement {
  return {
    id: crypto.randomUUID(),
    isPremium: false,
    premiumSince: null,
    ownerUserId: null,
    maxResidenceYears: 10,
    createdAt: 0,
    updatedAt: 0,
  };
}

export const localStorageAdapter: StorageAdapter = {
  async getSettings() {
    const result = readJSON<AppSettings>(STORAGE_KEYS.settings);
    if (!result.ok) return result;
    return { ok: true, data: result.data ?? DEFAULT_SETTINGS };
  },

  async setSettings(next) {
    return writeJSON(STORAGE_KEYS.settings, next);
  },

  async getEntitlement() {
    const result = readJSON<Entitlement>(STORAGE_KEYS.entitlement);
    if (!result.ok) return result;
    return { ok: true, data: result.data ?? makeDefaultEntitlement() };
  },

  async setEntitlement(next) {
    return writeJSON(STORAGE_KEYS.entitlement, next);
  },

  async clearEntitlement() {
    return removeKey(STORAGE_KEYS.entitlement);
  },

  async listHistory(params: ListHistoryParams) {
    if (params.page < 1 || params.pageSize !== MAX_HISTORY) {
      return { ok: false, code: "INVALID_PARAMS", message: `page must be >= 1 and pageSize must be ${MAX_HISTORY}` };
    }

    const result = readJSON<HistoryEntry[]>(STORAGE_KEYS.history);
    if (!result.ok) return result;

    const all = (result.data ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
    const total = all.length;
    const start = (params.page - 1) * params.pageSize;
    const items = all.slice(start, start + params.pageSize);

    const response: HistoryListResponse = { items, total, page: params.page };
    return { ok: true, data: response };
  },

  async getHistoryById(id: string) {
    if (!id) {
      return { ok: false, code: "VALIDATION_ERROR", message: "id is required" };
    }

    const result = readJSON<HistoryEntry[]>(STORAGE_KEYS.history);
    if (!result.ok) return result;

    const entry = (result.data ?? []).find((e) => e.id === id);
    if (!entry) {
      return { ok: false, code: "NOT_FOUND", message: `History entry ${id} not found` };
    }
    return { ok: true, data: entry };
  },

  async saveHistoryEntry(entry: HistoryEntry) {
    const result = readJSON<HistoryEntry[]>(STORAGE_KEYS.history);
    if (!result.ok) {
      // Remap read errors to UNAVAILABLE (READ_ERROR, PARSE_ERROR -> UNAVAILABLE)
      return { ok: false, code: "UNAVAILABLE" as const, message: result.message };
    }
    const existing = result.data ?? [];

    if (existing.some((e) => e.id === entry.id)) {
      return { ok: false, code: "VALIDATION_ERROR", message: `Duplicate id: ${entry.id}` };
    }

    const updated = [...existing, entry].sort((a, b) => a.createdAt - b.createdAt);
    // Keep max 5, removing oldest (smallest createdAt) first
    const trimmed = updated.length > MAX_HISTORY ? updated.slice(updated.length - MAX_HISTORY) : updated;

    return writeJSON(STORAGE_KEYS.history, trimmed);
  },

  async deleteHistoryById(id: string) {
    if (!id) {
      return { ok: false, code: "VALIDATION_ERROR", message: "id is required" };
    }

    const result = readJSON<HistoryEntry[]>(STORAGE_KEYS.history);
    if (!result.ok) {
      // Remap read errors to UNAVAILABLE (READ_ERROR, PARSE_ERROR -> UNAVAILABLE)
      return { ok: false, code: "UNAVAILABLE" as const, message: result.message };
    }
    const all = result.data ?? [];

    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) {
      return { ok: false, code: "NOT_FOUND", message: `History entry ${id} not found` };
    }

    const updated = all.filter((e) => e.id !== id);
    const writeResult = writeJSON(STORAGE_KEYS.history, updated);
    if (!writeResult.ok) {
      // Remap QUOTA_EXCEEDED and SERIALIZE_ERROR to UNKNOWN for deleteHistoryById
      if (writeResult.code === "QUOTA_EXCEEDED" || writeResult.code === "SERIALIZE_ERROR") {
        return { ok: false, code: "UNKNOWN" as const, message: writeResult.message };
      }
      // At this point, code is WRITE_ERROR, which is allowed by the return type
      return { ok: false, code: writeResult.code, message: writeResult.message };
    }
    return writeResult;
  },

  async clearHistory() {
    return removeKey(STORAGE_KEYS.history);
  },
};

// Alias for compatibility
export const storageAdapter = localStorageAdapter;
