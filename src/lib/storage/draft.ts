const DRAFT_KEY_PREFIX = 'draft:';

const DEFAULT_DRAFT_INPUT = {
  location: '',
  roomCount: 1,
  priceMin: 0,
  priceMax: 10_000_000,
};

type DraftReadResult =
  | { ok: true; value: typeof DEFAULT_DRAFT_INPUT }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE_ERROR'; fallback: 'DEFAULT_INPUT' };

type DraftWriteResult =
  | { ok: true }
  | { ok: false; errorCode: 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA_EXCEEDED' | 'STORAGE_WRITE_FAILED' };

function draftKey(tossUserId: string): string {
  return `${DRAFT_KEY_PREFIX}${tossUserId}`;
}

export function readDraftInput(tossUserId: string): DraftReadResult {
  const key = draftKey(tossUserId);
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { ok: true, value: { ...DEFAULT_DRAFT_INPUT } };
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('location' in parsed) ||
      !('roomCount' in parsed) ||
      !('priceMin' in parsed) ||
      !('priceMax' in parsed)
    ) {
      return { ok: false, errorCode: 'STORAGE_PARSE_ERROR', fallback: 'DEFAULT_INPUT' };
    }
    const value = parsed as typeof DEFAULT_DRAFT_INPUT;
    return { ok: true, value };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { ok: false, errorCode: 'STORAGE_PARSE_ERROR', fallback: 'DEFAULT_INPUT' };
    }
    return { ok: false, errorCode: 'STORAGE_UNAVAILABLE', fallback: 'DEFAULT_INPUT' };
  }
}

export function writeDraftInput(tossUserId: string, input: unknown): DraftWriteResult {
  const key = draftKey(tossUserId);
  try {
    const serialized = JSON.stringify(input);
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
