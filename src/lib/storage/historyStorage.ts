import type { HistoryEntry, HistoryStorage, Paginated, Result } from '@/lib/types';
import { storageErr } from '@/lib/storage/storageErrors';

const STORAGE_KEY = 'rentcheck_history_v1';
const MAX_ENTRIES = 5;

type ListError = {
  code: 'INVALID_INPUT' | 'PAGE_OUT_OF_RANGE' | 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE' | 'STORAGE_SCHEMA';
};

type PrependError = {
  code: 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA' | 'STORAGE_PARSE' | 'STORAGE_SCHEMA';
};

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__ls_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function readEntries(): Result<HistoryEntry[], { code: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE' | 'STORAGE_SCHEMA' }> {
  if (!isLocalStorageAvailable()) {
    return storageErr('STORAGE_UNAVAILABLE');
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return { ok: true, value: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return storageErr('STORAGE_PARSE');
  }

  if (!Array.isArray(parsed)) {
    return storageErr('STORAGE_SCHEMA');
  }

  return { ok: true, value: parsed as HistoryEntry[] };
}

function writeEntries(
  entries: HistoryEntry[]
): Result<void, { code: 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA' }> {
  if (!isLocalStorageAvailable()) {
    return storageErr('STORAGE_UNAVAILABLE');
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return { ok: true, value: undefined };
  } catch (err) {
    // QuotaExceededError
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      return storageErr('STORAGE_QUOTA');
    }
    return storageErr('STORAGE_UNAVAILABLE');
  }
}

export const historyStorage: HistoryStorage = {
  list(params: {
    page: number;
    pageSize: number;
  }): Result<Paginated<HistoryEntry>, ListError> {
    if (params.page !== 1) {
      return storageErr('PAGE_OUT_OF_RANGE');
    }

    const readResult = readEntries();
    if (!readResult.ok) {
      return readResult;
    }

    const sorted = [...readResult.value].sort((a, b) => b.createdAt - a.createdAt);
    const items = sorted.slice(0, params.pageSize);

    return {
      ok: true,
      value: {
        items,
        total: sorted.length,
        page: 1,
      },
    };
  },

  prepend(entry: HistoryEntry): Result<void, PrependError> {
    const readResult = readEntries();
    if (!readResult.ok) {
      return readResult;
    }

    const existing = readResult.value.filter((e) => e.id !== entry.id);
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);

    return writeEntries(updated);
  },
};
