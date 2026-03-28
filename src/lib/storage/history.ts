import type { HistoryEntry } from '@/lib/types';

const HISTORY_KEY_PREFIX = 'history:';
const MAX_HISTORY_ITEMS = 5;

type HistoryReadResult =
  | { ok: true; value: HistoryEntry[] }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE_ERROR'; fallback: 'EMPTY_ARRAY' };

type HistoryUpsertResult =
  | { ok: true }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE_ERROR' | 'STORAGE_QUOTA_EXCEEDED' | 'STORAGE_WRITE_FAILED'; fallback?: 'EMPTY_ARRAY' };

type HistoryDeleteResult =
  | { ok: true }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_WRITE_FAILED' };

function historyKey(tossUserId: string): string {
  return `${HISTORY_KEY_PREFIX}${tossUserId}`;
}

export function readHistory(tossUserId: string): HistoryReadResult {
  const key = historyKey(tossUserId);
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { ok: true, value: [] };
    }
    const value = JSON.parse(raw) as HistoryEntry[];
    return { ok: true, value };
  } catch {
    return { ok: false, errorCode: 'STORAGE_PARSE_ERROR', fallback: 'EMPTY_ARRAY' };
  }
}

export function upsertHistory(tossUserId: string, entry: HistoryEntry): HistoryUpsertResult {
  const key = historyKey(tossUserId);

  // First, try to read existing history
  const readResult = readHistory(tossUserId);
  if (!readResult.ok) {
    // If read fails, don't attempt to write — return the read error
    return {
      ok: false,
      errorCode: readResult.errorCode,
      fallback: readResult.fallback,
    };
  }

  try {
    // Deduplicate by id, then prepend new entry
    const history = readResult.value.filter(e => e.id !== entry.id);
    const newHistory = [entry, ...history].slice(0, MAX_HISTORY_ITEMS);

    const serialized = JSON.stringify(newHistory);
    localStorage.setItem(key, serialized);
    return { ok: true };
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      return { ok: false, errorCode: 'STORAGE_QUOTA_EXCEEDED' };
    }
    return { ok: false, errorCode: 'STORAGE_WRITE_FAILED' };
  }
}

export function deleteAllHistory(tossUserId: string): HistoryDeleteResult {
  const key = historyKey(tossUserId);
  try {
    localStorage.removeItem(key);
    return { ok: true };
  } catch {
    return { ok: false, errorCode: 'STORAGE_WRITE_FAILED' };
  }
}
