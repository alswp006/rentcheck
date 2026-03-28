export type StringifySuccess = { ok: true; value: string };
export type StringifyFailure = { ok: false; error: string };
export type StringifyResult = StringifySuccess | StringifyFailure;

/**
 * Safely parses a JSON string, returning `fallback` on any parse error.
 *
 * @remarks No runtime shape validation is performed; callers should validate
 * with a schema guard (e.g., zod) when the schema may have changed.
 */
export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeStringifyJson<T>(value: T): StringifyResult {
  try {
    return { ok: true, value: JSON.stringify(value) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
