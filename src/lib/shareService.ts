import type {
  SimulationInput,
  SharePayload,
  ShareService,
  Result,
} from '@/lib/types';
import { validationService } from '@/lib/validationService';
import { generateUUID } from '@/lib/uuid';
import { encodeBase64, decodeBase64 } from '@/lib/base64';

const SHARE_VERSION = 1;

export const shareService: ShareService = {
  buildShareUrl(
    input: SimulationInput
  ): Result<{ url: string; payload: SharePayload }, { code: 'ENCODE_ERROR' }> {
    try {
      const json = JSON.stringify(input);
      const encoded = encodeBase64(json);

      const now = Date.now();
      const payload: SharePayload = {
        id: generateUUID(),
        encoded,
        version: SHARE_VERSION,
        createdAt: now,
        updatedAt: now,
      };

      const base =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : '/';
      const url = `${base}?v=${SHARE_VERSION}&s=${encoded}`;

      return { ok: true, value: { url, payload } };
    } catch {
      return { ok: false, error: { code: 'ENCODE_ERROR' } };
    }
  },

  parseShareSearch(
    search: string
  ): Result<
    { input: SimulationInput },
    { code: 'DECODE_ERROR' | 'UNSUPPORTED_VERSION' | 'INVALID_INPUT' }
  > {
    try {
      const params = new URLSearchParams(search);
      const v = params.get('v');
      const s = params.get('s');

      if (v !== String(SHARE_VERSION)) {
        return { ok: false, error: { code: 'UNSUPPORTED_VERSION' } };
      }

      if (!s) {
        return { ok: false, error: { code: 'DECODE_ERROR' } };
      }

      let json: string;
      try {
        json = decodeBase64(s);
      } catch {
        return { ok: false, error: { code: 'DECODE_ERROR' } };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        return { ok: false, error: { code: 'DECODE_ERROR' } };
      }

      const validation = validationService.validate(parsed);
      if (!validation.ok) {
        return { ok: false, error: { code: 'INVALID_INPUT' } };
      }

      return { ok: true, value: { input: validation.value } };
    } catch {
      return { ok: false, error: { code: 'DECODE_ERROR' } };
    }
  },
};
