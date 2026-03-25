import type { SimulationInput } from "@/lib/types";

interface SharePayloadV1 {
  version: 1;
  input: SimulationInput;
}

type DecodeOk = { ok: true; data: SharePayloadV1 };
type DecodeFail = { ok: false; code: string; message: string };
type DecodeResult = DecodeOk | DecodeFail;

export function encodeShareParamV1(input: SimulationInput): string {
  try {
    const payload: SharePayloadV1 = { version: 1, input };
    const json = JSON.stringify(payload);
    // Encode UTF-8 bytes via TextEncoder, then base64
    const bytes = new TextEncoder().encode(json);
    return btoa(String.fromCharCode(...bytes));
  } catch {
    // Fallback: should never happen for valid SimulationInput
    return btoa(JSON.stringify({ version: 1, input: {} }));
  }
}

export function decodeShareParam(s: string): DecodeResult {
  let json: string;
  try {
    const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } catch {
    return { ok: false, code: "DECODE_ERROR", message: "base64 디코딩에 실패했어요" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, code: "PARSE_ERROR", message: "JSON 파싱에 실패했어요" };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "유효하지 않은 페이로드예요" };
  }

  const payload = parsed as Record<string, unknown>;

  if (payload.version !== 1) {
    return { ok: false, code: "VERSION_MISMATCH", message: `지원하지 않는 버전이에요 (version=${payload.version})` };
  }

  if (typeof payload.input !== "object" || payload.input === null) {
    return { ok: false, code: "INVALID_INPUT", message: "입력 데이터가 손상되었어요" };
  }

  const inputObj = payload.input as Record<string, unknown>;
  if (typeof inputObj.jeonseDeposit !== "number") {
    return { ok: false, code: "INVALID_INPUT", message: "입력 데이터가 손상되었어요" };
  }

  return {
    ok: true,
    data: {
      version: 1,
      input: payload.input as SimulationInput,
    },
  };
}
