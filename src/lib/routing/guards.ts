import type { PresetScenario, SimulationInput } from '@/lib/types';

const VALID_PRESET_IDS: ReadonlySet<string> = new Set<PresetScenario['id']>([
  'preset_young_jeonse',
  'preset_newlyweds_compare',
  'preset_monthly_invest',
  'preset_buy_focus',
]);

type GuardOk = { ok: true };
type GuardFail = { ok: false; reason: string };
type GuardResult = GuardOk | GuardFail;

/**
 * Validates location.state for the /simulate route.
 * Pure function — no routing side-effects.
 */
export function validateSimulateState(state: unknown): GuardResult {
  if (state === null || state === undefined) {
    return { ok: false, reason: 'STATE_NULL' };
  }

  if (typeof state !== 'object') {
    return { ok: false, reason: 'STATE_INVALID' };
  }

  const s = state as Record<string, unknown>;

  if ('presetId' in s) {
    if (typeof s.presetId !== 'string' || !VALID_PRESET_IDS.has(s.presetId)) {
      return { ok: false, reason: 'INVALID_PRESET_ID' };
    }
  }

  return { ok: true };
}

/**
 * Validates location.state for the /result route.
 * Pure function — no routing side-effects.
 */
export function validateResultState(state: unknown): GuardResult {
  if (state === null || state === undefined) {
    return { ok: false, reason: 'STATE_NULL' };
  }

  if (typeof state !== 'object') {
    return { ok: false, reason: 'STATE_INVALID' };
  }

  const s = state as Record<string, unknown>;

  if (!('input' in s) || s.input === null || typeof s.input !== 'object') {
    return { ok: false, reason: 'STATE_MISSING_INPUT' };
  }

  const input = s.input as Partial<SimulationInput>;
  if (typeof input.residencePeriodYears !== 'number') {
    return { ok: false, reason: 'STATE_INVALID_INPUT' };
  }

  return { ok: true };
}
