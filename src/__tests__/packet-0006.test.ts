import { describe, it, expect } from 'vitest';
import {
  encodeSharePayloadV1,
  decodeSharePayloadV1,
  validateSimulateState,
  validateResultState,
} from '@/lib/share';

/**
 * Packet 0006: 공유 인코드/디코드 + SC-4 라우팅 가드(순수)
 *
 * Tests for:
 * - encodeSharePayloadV1(input): base64 encode utility
 * - decodeSharePayloadV1(encoded): base64 decode with validation
 * - validateSimulateState(state): validate state for /simulate route
 * - validateResultState(state): validate state for /result route
 */

describe('packet-0006: 공유 인코드/디코드 + SC-4 라우팅 가드(순수)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // AC-1: encodeSharePayloadV1 should return base64 string
  // ─────────────────────────────────────────────────────────────────────────────
  it('AC-1: encodeSharePayloadV1 should encode input to valid base64 string', () => {
    const input = {
      presetId: 'preset_young_jeonse',
      jeonseDeposit: 100000000,
      jeonseLoanRatio: 0.5,
      jeonseInterestRate: 0.02,
      monthlyDeposit: 0,
      monthlyRent: 500000,
      monthlyRentIncreaseRate: 0.03,
      buyPrice: 500000000,
      buyEquity: 100000000,
      buyLoanInterestRate: 0.03,
      buyLoanPeriodYears: 20,
      buyRepaymentType: 'equal_payment' as const,
      initialAsset: 50000000,
      residencePeriodYears: 10,
      investmentReturnRate: 0.05,
      housePriceGrowthRate: 0.02,
    };

    const encoded = encodeSharePayloadV1(input);

    // Should be a string
    expect(typeof encoded).toBe('string');

    // Should be valid base64 (decodable without error)
    expect(() => {
      Buffer.from(encoded, 'base64').toString('utf8');
    }).not.toThrow();

    // Should contain no url-unsafe characters
    expect(encoded).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC-2: decodeSharePayloadV1 should return { ok: false } on all error cases
  // ─────────────────────────────────────────────────────────────────────────────
  it('AC-2a: decodeSharePayloadV1 should return { ok: false } when v !== 1', () => {
    const invalidV2 = Buffer.from(JSON.stringify({ v: 2, input: {} })).toString('base64');
    const result = decodeSharePayloadV1(invalidV2);
    expect(result).toEqual({ ok: false });
  });

  it('AC-2b: decodeSharePayloadV1 should return { ok: false } for invalid base64', () => {
    const result = decodeSharePayloadV1('!!!invalid-base64!!!');
    expect(result).toEqual({ ok: false });
  });

  it('AC-2c: decodeSharePayloadV1 should return { ok: false } for invalid JSON inside base64', () => {
    const invalidJson = Buffer.from('not json at all').toString('base64');
    const result = decodeSharePayloadV1(invalidJson);
    expect(result).toEqual({ ok: false });
  });

  it('AC-2d: decodeSharePayloadV1 should return { ok: false } for missing required shape (no v field)', () => {
    const missingV = Buffer.from(JSON.stringify({ input: {} })).toString('base64');
    const result = decodeSharePayloadV1(missingV);
    expect(result).toEqual({ ok: false });
  });

  it('AC-2e: decodeSharePayloadV1 should return { ok: false } for missing input field', () => {
    const missingInput = Buffer.from(JSON.stringify({ v: 1 })).toString('base64');
    const result = decodeSharePayloadV1(missingInput);
    expect(result).toEqual({ ok: false });
  });

  it('AC-2f: decodeSharePayloadV1 should successfully decode valid SharePayloadV1', () => {
    const validInput = {
      presetId: null,
      jeonseDeposit: 100000000,
      jeonseLoanRatio: 0.5,
      jeonseInterestRate: 0.02,
      monthlyDeposit: 0,
      monthlyRent: 500000,
      monthlyRentIncreaseRate: 0.03,
      buyPrice: 500000000,
      buyEquity: 100000000,
      buyLoanInterestRate: 0.03,
      buyLoanPeriodYears: 20,
      buyRepaymentType: 'equal_payment' as const,
      initialAsset: 50000000,
      residencePeriodYears: 10,
      investmentReturnRate: 0.05,
      housePriceGrowthRate: 0.02,
    };

    const encoded = encodeSharePayloadV1(validInput);
    const result = decodeSharePayloadV1(encoded);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.v).toBe(1);
      expect(result.payload.input).toEqual(validInput);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC-3: validateSimulateState(null) should return STATE_NULL
  // ─────────────────────────────────────────────────────────────────────────────
  it('AC-3: validateSimulateState should return { ok: false, reason: "STATE_NULL" } for null state', () => {
    const result = validateSimulateState(null);
    expect(result).toEqual({ ok: false, reason: 'STATE_NULL' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC-4: validateSimulateState with invalid preset
  // ─────────────────────────────────────────────────────────────────────────────
  it('AC-4: validateSimulateState should return { ok: false, reason: "INVALID_PRESET_ID" } for non-existent preset', () => {
    const result = validateSimulateState({
      presetId: 'not-exist',
      source: 'home' as const,
    });
    expect(result).toEqual({ ok: false, reason: 'INVALID_PRESET_ID' });
  });

  it('AC-4: validateSimulateState should return { ok: true } for valid preset', () => {
    const result = validateSimulateState({
      presetId: 'preset_young_jeonse',
      source: 'home' as const,
    });
    expect(result.ok).toBe(true);
  });

  it('AC-4: validateSimulateState should accept all valid preset IDs', () => {
    const validPresets = [
      'preset_young_jeonse',
      'preset_newlyweds_compare',
      'preset_monthly_invest',
      'preset_buy_focus',
    ];

    validPresets.forEach((presetId) => {
      const result = validateSimulateState({
        presetId,
        source: 'share' as const,
      });
      expect(result.ok).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC-5: validateResultState(null) should return STATE_NULL
  // ─────────────────────────────────────────────────────────────────────────────
  it('AC-5: validateResultState should return { ok: false, reason: "STATE_NULL" } for null state', () => {
    const result = validateResultState(null);
    expect(result).toEqual({ ok: false, reason: 'STATE_NULL' });
  });

  it('AC-5: validateResultState should return { ok: true } for valid state with input', () => {
    const validInput = {
      presetId: null,
      jeonseDeposit: 100000000,
      jeonseLoanRatio: 0.5,
      jeonseInterestRate: 0.02,
      monthlyDeposit: 0,
      monthlyRent: 500000,
      monthlyRentIncreaseRate: 0.03,
      buyPrice: 500000000,
      buyEquity: 100000000,
      buyLoanInterestRate: 0.03,
      buyLoanPeriodYears: 20,
      buyRepaymentType: 'equal_payment' as const,
      initialAsset: 50000000,
      residencePeriodYears: 10,
      investmentReturnRate: 0.05,
      housePriceGrowthRate: 0.02,
    };

    const result = validateResultState({
      input: validInput,
      source: 'simulate' as const,
    });
    expect(result.ok).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC-6: All functions should accept unknown input without throwing
  // ─────────────────────────────────────────────────────────────────────────────
  it('AC-6: all functions should accept unknown input without throwing', () => {
    const unknownInput: unknown = { random: 'data', nested: { value: 123 } };

    // encodeSharePayloadV1 with unknown input
    expect(() => {
      encodeSharePayloadV1(unknownInput as any);
    }).not.toThrow();

    // decodeSharePayloadV1 with unknown input
    expect(() => {
      decodeSharePayloadV1(unknownInput as any);
    }).not.toThrow();

    // validateSimulateState with unknown input
    expect(() => {
      validateSimulateState(unknownInput);
    }).not.toThrow();

    // validateResultState with unknown input
    expect(() => {
      validateResultState(unknownInput);
    }).not.toThrow();
  });

  it('AC-6: functions should handle undefined input gracefully', () => {
    expect(() => {
      encodeSharePayloadV1(undefined as any);
    }).not.toThrow();

    expect(() => {
      decodeSharePayloadV1(undefined as any);
    }).not.toThrow();

    expect(() => {
      validateSimulateState(undefined);
    }).not.toThrow();

    expect(() => {
      validateResultState(undefined);
    }).not.toThrow();
  });
});
