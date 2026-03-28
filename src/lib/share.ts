import type { SimulationInput, SharePayloadV1 } from '@/lib/types';

export { validateSimulateState, validateResultState } from '@/lib/routing/guards';

// ── UTF-8 safe base64 helpers ─────────────────────────────────────────────────
// Works in modern browsers (btoa/atob) and Node 16+ (same globals).

function utf8ToBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
  );
}

function base64ToUtf8(b64: string): string {
  return decodeURIComponent(
    Array.from(atob(b64), (ch) => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  );
}

// Encode accepts a relaxed presetId type because TypeScript widens string literals
// in object literals without `as const`. The value is serialised as-is.
type SimulationInputForEncode = Omit<SimulationInput, 'presetId'> & { presetId: string | null };

// ── Encode ────────────────────────────────────────────────────────────────────

export function encodeSharePayloadV1(input: SimulationInputForEncode): string {
  const payload = { v: 1 as const, input };
  return utf8ToBase64(JSON.stringify(payload));
}

// ── Decode ────────────────────────────────────────────────────────────────────

type DecodeResult =
  | { ok: true; payload: SharePayloadV1 }
  | { ok: false };

export function decodeSharePayloadV1(encoded: string): DecodeResult {
  try {
    const json = base64ToUtf8(encoded);
    const parsed: unknown = JSON.parse(json);

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      (parsed as Record<string, unknown>).v !== 1 ||
      !('input' in (parsed as object)) ||
      (parsed as Record<string, unknown>).input === null ||
      typeof (parsed as Record<string, unknown>).input !== 'object'
    ) {
      return { ok: false };
    }

    return { ok: true, payload: parsed as SharePayloadV1 };
  } catch {
    return { ok: false };
  }
}
