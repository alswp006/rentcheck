import type {
  LastInputSnapshot,
  LastInputStorage,
  SimulationInput,
  EpochMs,
  Result,
} from '@/lib/types';
import { storageErr } from '@/lib/storage/storageErrors';

const STORAGE_KEY = 'rentcheck_last_input_v1';

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

export const lastInputStorage: LastInputStorage = {
  load(): Result<
    LastInputSnapshot | null,
    { code: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE' | 'STORAGE_SCHEMA' }
  > {
    if (!isLocalStorageAvailable()) {
      return storageErr('STORAGE_UNAVAILABLE');
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return { ok: true, value: null };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return storageErr('STORAGE_PARSE');
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as Record<string, unknown>)['version'] !== 1 ||
      typeof (parsed as Record<string, unknown>)['input'] !== 'object' ||
      (parsed as Record<string, unknown>)['input'] === null
    ) {
      return storageErr('STORAGE_SCHEMA');
    }

    return { ok: true, value: parsed as LastInputSnapshot };
  },

  save(
    input: SimulationInput,
    now: EpochMs
  ): Result<LastInputSnapshot, { code: 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA' }> {
    if (!isLocalStorageAvailable()) {
      return storageErr('STORAGE_UNAVAILABLE');
    }

    const snapshot: LastInputSnapshot = {
      version: 1,
      createdAt: now,
      updatedAt: now,
      input,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      return { ok: true, value: snapshot };
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        return storageErr('STORAGE_QUOTA');
      }
      return storageErr('STORAGE_UNAVAILABLE');
    }
  },

  clear(): Result<void, { code: 'STORAGE_UNAVAILABLE' }> {
    if (!isLocalStorageAvailable()) {
      return storageErr('STORAGE_UNAVAILABLE');
    }
    localStorage.removeItem(STORAGE_KEY);
    return { ok: true, value: undefined };
  },
};
