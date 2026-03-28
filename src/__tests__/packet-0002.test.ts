import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── AC-1: Storage keys are string literals exported from keys.ts ───────────────

describe('AC-1: Storage keys should be exported as string literals', () => {
  it('should import STORAGE_KEY_HISTORY constant without errors', async () => {
    try {
      const keys = await import('@/lib/storage/keys');
      expect(keys.STORAGE_KEY_HISTORY).toBeDefined();
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should import STORAGE_KEY_PURCHASE constant without errors', async () => {
    try {
      const keys = await import('@/lib/storage/keys');
      expect(keys.STORAGE_KEY_PURCHASE).toBeDefined();
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should import STORAGE_KEY_LAST_SHARE constant without errors', async () => {
    try {
      const keys = await import('@/lib/storage/keys');
      expect(keys.STORAGE_KEY_LAST_SHARE).toBeDefined();
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should have exact key strings matching spec', async () => {
    // Dynamic import to allow test to run even if module doesn't exist yet
    try {
      const keys = await import('@/lib/storage/keys');
      expect(keys.STORAGE_KEY_HISTORY).toBe('rentcheck:history:v1');
      expect(keys.STORAGE_KEY_PURCHASE).toBe('rentcheck:purchase:v1');
      expect(keys.STORAGE_KEY_LAST_SHARE).toBe('rentcheck:lastShare:v1');
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });
});

// ─── AC-2: safeParseJson returns fallback on invalid JSON without throwing ──────

describe('AC-2: safeParseJson should handle invalid JSON gracefully', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return fallback value when JSON is invalid (malformed JSON)', async () => {
    try {
      const { safeParseJson } = await import('@/lib/storage/json');

      const fallback = { v: 1, entries: [] };
      const result = safeParseJson('{ invalid json }', fallback);

      expect(result).toEqual(fallback);
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should return fallback when input is null', async () => {
    try {
      const { safeParseJson } = await import('@/lib/storage/json');

      const fallback = { v: 1, entries: [] };
      const result = safeParseJson(null as any, fallback);

      expect(result).toEqual(fallback);
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should return fallback when input is undefined', async () => {
    try {
      const { safeParseJson } = await import('@/lib/storage/json');

      const fallback = { v: 1, entries: [] };
      const result = safeParseJson(undefined as any, fallback);

      expect(result).toEqual(fallback);
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should parse valid JSON and return parsed value, not fallback', async () => {
    try {
      const { safeParseJson } = await import('@/lib/storage/json');

      const fallback = { v: 1, entries: [] };
      const validJson = '{"v":1,"entries":[{"id":"test"}]}';
      const result = safeParseJson(validJson, fallback);

      expect(result).toEqual({ v: 1, entries: [{ id: 'test' }] });
      expect(result).not.toEqual(fallback);
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should never throw an exception on invalid JSON', async () => {
    try {
      const { safeParseJson } = await import('@/lib/storage/json');

      const fallback = null;
      expect(() => {
        safeParseJson('{ broken json', fallback);
      }).not.toThrow();
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should not call console.error when parsing fails', async () => {
    try {
      const { safeParseJson } = await import('@/lib/storage/json');
      safeParseJson('invalid', {});
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should support generic type parameter for type safety', async () => {
    try {
      const { safeParseJson } = await import('@/lib/storage/json');

      interface TestData {
        v: number;
        value: string;
      }

      const fallback: TestData = { v: 1, value: '' };
      const validJson = '{"v":1,"value":"test"}';

      const result = safeParseJson<TestData>(validJson, fallback);

      // Type is TestData, not any
      expect(result.v).toBe(1);
      expect(result.value).toBe('test');
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });
});

// ─── AC-3: safeStringifyJson returns {ok: false} on failure without throwing ────

describe('AC-3: safeStringifyJson should handle stringify failures gracefully', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return {ok:true, value:string} when stringify succeeds', async () => {
    try {
      const { safeStringifyJson } = await import('@/lib/storage/json');

      const data = { v: 1, entries: [] };
      const result = safeStringifyJson(data);

      expect(result).toEqual({
        ok: true,
        value: JSON.stringify(data),
      });
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should return {ok:false, error:string} on stringify failure', async () => {
    try {
      const { safeStringifyJson } = await import('@/lib/storage/json');

      // Create a circular reference to trigger stringify failure
      const circular: any = { v: 1 };
      circular.self = circular;

      const result = safeStringifyJson(circular);

      expect(result).toHaveProperty('ok', false);
      expect(result).toHaveProperty('error');
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should never throw an exception on stringify failure', async () => {
    try {
      const { safeStringifyJson } = await import('@/lib/storage/json');

      const circular: any = { v: 1 };
      circular.self = circular;

      expect(() => {
        safeStringifyJson(circular);
      }).not.toThrow();
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should not call console.error when stringify fails', async () => {
    try {
      const { safeStringifyJson } = await import('@/lib/storage/json');

      const circular: any = { v: 1 };
      circular.self = circular;

      safeStringifyJson(circular);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should support generic type parameter for type safety', async () => {
    try {
      const { safeStringifyJson } = await import('@/lib/storage/json');

      interface TestData {
        v: number;
        label: string;
      }

      const data: TestData = { v: 1, label: 'test' };
      const result = safeStringifyJson<TestData>(data);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(JSON.parse(result.value)).toEqual(data);
      }
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should stringify primitive values without error', async () => {
    try {
      const { safeStringifyJson } = await import('@/lib/storage/json');

      const stringResult = safeStringifyJson('test');
      expect(stringResult.ok).toBe(true);

      const numberResult = safeStringifyJson(42);
      expect(numberResult.ok).toBe(true);

      const boolResult = safeStringifyJson(true);
      expect(boolResult.ok).toBe(true);
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should stringify nested objects correctly', async () => {
    try {
      const { safeStringifyJson } = await import('@/lib/storage/json');

      const nested = {
        v: 1,
        entries: [
          { id: 'a', data: { x: 1, y: 2 } },
          { id: 'b', data: { x: 3, y: 4 } },
        ],
      };

      const result = safeStringifyJson(nested);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(JSON.parse(result.value)).toEqual(nested);
      }
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });
});

// ─── AC-4: App builds and runs successfully ──────────────────────────────────────

describe('AC-4: App should build and run after applying this packet', () => {
  it('should allow app to import storage utilities without build errors', async () => {
    try {
      // Verify that importing from @/lib/storage works
      const keys = await import('@/lib/storage/keys');
      const json = await import('@/lib/storage/json');

      expect(keys).toBeDefined();
      expect(json).toBeDefined();
      expect(typeof json.safeParseJson).toBe('function');
      expect(typeof json.safeStringifyJson).toBe('function');
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  // TypeScript interfaces (HistoryStorageV1, PurchaseStorageV1, LastShareStorageV1) are
  // type-only constructs erased at runtime — they cannot be tested via dynamic import.
  it.todo('should allow TypeScript to resolve all types correctly');

  it('should work with the existing storage helper functions', async () => {
    try {
      const { getItem, setItem, removeItem } = await import('@/lib/storage');

      expect(typeof getItem).toBe('function');
      expect(typeof setItem).toBe('function');
      expect(typeof removeItem).toBe('function');
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });
});

// ─── Integration: Keys and JSON utilities work together ───────────────────────────

describe('Integration: Storage keys with JSON utilities', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse history data from localStorage using keys and safeParseJson', async () => {
    try {
      const keys = await import('@/lib/storage/keys');
      const { safeParseJson } = await import('@/lib/storage/json');

      const mockHistoryJson = '{"v":1,"entries":[]}';
      const fallback = { v: 1, entries: [] };

      const result = safeParseJson(mockHistoryJson, fallback);

      expect(result.v).toBe(1);
      expect(Array.isArray(result.entries)).toBe(true);
      // Keys can be used to reference the storage location
      expect(keys.STORAGE_KEY_HISTORY).toBe('rentcheck:history:v1');
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should handle broken history storage gracefully', async () => {
    try {
      const keys = await import('@/lib/storage/keys');
      const { safeParseJson } = await import('@/lib/storage/json');

      // Simulate reading corrupted history data
      const brokenJson = 'NOT VALID JSON AT ALL';
      const fallback = { v: 1, entries: [] };

      expect(() => safeParseJson(brokenJson, fallback)).not.toThrow();
      const result = safeParseJson(brokenJson, fallback);
      expect(result).toEqual(fallback);
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });

  it('should stringify and parse purchase data round-trip correctly', async () => {
    try {
      const { safeStringifyJson } = await import('@/lib/storage/json');
      const { safeParseJson } = await import('@/lib/storage/json');

      const originalData = {
        v: 1,
        adSkipPurchased: true,
        purchasedAt: 1710000000000,
        transactionId: 'tx_abc123',
      };

      // Stringify
      const stringifyResult = safeStringifyJson(originalData);
      expect(stringifyResult.ok).toBe(true);

      if (stringifyResult.ok) {
        // Parse back
        const parseResult = safeParseJson(stringifyResult.value, null);
        expect(parseResult).toEqual(originalData);
      }
    } catch (e) {
      throw new Error(`Module import failed: ${(e as Error).message}`);
    }
  });
});
