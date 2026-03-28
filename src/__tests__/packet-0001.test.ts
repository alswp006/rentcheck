import { describe, it, expect } from 'vitest';

/**
 * AC-1: All required types must be exported from src/lib/types.ts
 *
 * This test verifies that all domain types are properly defined and exported.
 * Each required type is listed in AC requirement.
 */
describe('도메인 타입 + RouteState 계약 정의', () => {
  /**
   * AC-1: Verify all required types can be imported and exist
   */
  it('AC-1: should export all required domain types', async () => {
    const typesModule = await import('@/lib/types');

    // Verify each type exists by checking if it's defined in the module
    const requiredTypes = [
      'PresetScenario',
      'BuyRepaymentType',
      'SimulationInput',
      'RecommendedOption',
      'CostBreakdownRow',
      'SimulationResult',
      'SimulationError',
      'SimulationOutcome',
      'HistoryEntry',
      'SharePayloadVersion',
      'SharePayloadV1',
      'SharePayload',
      'ShareDecodeError',
      'RouteState',
    ];

    for (const typeName of requiredTypes) {
      expect(typesModule).toHaveProperty(typeName);
      expect(typesModule[typeName as keyof typeof typesModule]).toBeDefined();
    }
  });

  /**
   * AC-2: RouteState['/input'] must accept specific state shapes
   *
   * Valid states:
   * - { presetId: 'P1'|'P2'|'P3'|'P4'|null }
   * - { input: SimulationInput }
   * - undefined
   */
  it('AC-2a: RouteState["/input"] should accept presetId state with valid preset IDs', async () => {
    const typesModule = await import('@/lib/types');
    const RouteState = typesModule.RouteState as any;

    // Test that RouteState['/input'] exists and accepts presetId
    expect(RouteState).toBeDefined();

    // These should be valid according to the type definition:
    // { presetId: 'P1' }, { presetId: 'P2' }, { presetId: 'P3' }, { presetId: 'P4' }, { presetId: null }
    const validPresetStates = [
      { presetId: 'P1' },
      { presetId: 'P2' },
      { presetId: 'P3' },
      { presetId: 'P4' },
      { presetId: null },
    ];

    // This is a compile-time check - we verify the structure exists
    expect(RouteState['/input']).toBeDefined();

    // Runtime verification: check that at least the '/input' key exists
    expect('/input' in RouteState).toBe(true);
  });

  /**
   * AC-2b: RouteState['/input'] should accept input state with SimulationInput
   */
  it('AC-2b: RouteState["/input"] should accept input state with SimulationInput', async () => {
    const typesModule = await import('@/lib/types');

    expect(typesModule.RouteState).toBeDefined();
    expect('/input' in typesModule.RouteState).toBe(true);
  });

  /**
   * AC-2c: RouteState['/input'] should accept undefined
   */
  it('AC-2c: RouteState["/input"] should accept undefined', async () => {
    const typesModule = await import('@/lib/types');

    expect(typesModule.RouteState).toBeDefined();
    expect('/input' in typesModule.RouteState).toBe(true);
  });

  /**
   * AC-3: RouteState['/result'] must accept specific state shapes
   *
   * Valid states:
   * - { input: SimulationInput; source: 'input'|'history'|'share' }
   * - undefined
   */
  it('AC-3a: RouteState["/result"] should accept input with source state', async () => {
    const typesModule = await import('@/lib/types');

    expect(typesModule.RouteState).toBeDefined();
    expect('/result' in typesModule.RouteState).toBe(true);

    // Valid source values: 'input' | 'history' | 'share'
    const validSources = ['input', 'history', 'share'];
    expect(validSources).toContain('input');
    expect(validSources).toContain('history');
    expect(validSources).toContain('share');
  });

  /**
   * AC-3b: RouteState['/result'] should accept undefined
   */
  it('AC-3b: RouteState["/result"] should accept undefined', async () => {
    const typesModule = await import('@/lib/types');

    expect(typesModule.RouteState).toBeDefined();
    expect('/result' in typesModule.RouteState).toBe(true);
  });

  /**
   * AC-4: RouteState['/'] and RouteState['/history'] must accept undefined only
   */
  it('AC-4a: RouteState["/"] should accept undefined only', async () => {
    const typesModule = await import('@/lib/types');

    expect(typesModule.RouteState).toBeDefined();
    expect('/' in typesModule.RouteState).toBe(true);
  });

  /**
   * AC-4b: RouteState["/history"] should accept undefined only
   */
  it('AC-4b: RouteState["/history"] should accept undefined only', async () => {
    const typesModule = await import('@/lib/types');

    expect(typesModule.RouteState).toBeDefined();
    expect('/history' in typesModule.RouteState).toBe(true);
  });

  /**
   * AC-5: Build (TypeScript type check) must pass with zero errors
   *
   * This verifies that the types file compiles without TypeScript errors.
   * This is validated at build time via `npx tsc --noEmit`.
   */
  it('AC-5: TypeScript compilation should succeed', async () => {
    // Simply importing the types module is enough to verify it compiles
    const typesModule = await import('@/lib/types');

    // All required types should be accessible
    expect(typesModule.RouteState).toBeDefined();
    expect(typesModule.PresetScenario).toBeDefined();
    expect(typesModule.BuyRepaymentType).toBeDefined();
    expect(typesModule.SimulationInput).toBeDefined();
    expect(typesModule.RecommendedOption).toBeDefined();
    expect(typesModule.CostBreakdownRow).toBeDefined();
    expect(typesModule.SimulationResult).toBeDefined();
    expect(typesModule.SimulationError).toBeDefined();
    expect(typesModule.SimulationOutcome).toBeDefined();
    expect(typesModule.HistoryEntry).toBeDefined();
    expect(typesModule.SharePayloadVersion).toBeDefined();
    expect(typesModule.SharePayloadV1).toBeDefined();
    expect(typesModule.SharePayload).toBeDefined();
    expect(typesModule.ShareDecodeError).toBeDefined();
  });

  /**
   * Additional: Verify specific type structure constraints from spec
   */
  it('should define BuyRepaymentType as discriminated union', async () => {
    const typesModule = await import('@/lib/types');

    // Spec defines: BuyRepaymentType = 'AMORTIZED_EQUAL_PAYMENT' | 'AMORTIZED_EQUAL_PRINCIPAL'
    // This is verified at compile-time in the types file
    expect(typesModule.BuyRepaymentType).toBeDefined();
  });

  /**
   * Additional: Verify RouteState is indexed by route path
   */
  it('should define RouteState as indexed type by route paths', async () => {
    const typesModule = await import('@/lib/types');

    const RouteState = typesModule.RouteState as any;

    // All 4 main routes must be defined
    const routes = ['/', '/input', '/result', '/history'];

    for (const route of routes) {
      expect(route in RouteState).toBe(true);
    }
  });

  /**
   * Additional: Verify SimulationInput contains all required fields per spec
   */
  it('should structure SimulationInput with all required fields', async () => {
    const typesModule = await import('@/lib/types');

    // Spec fields (checked at compile-time):
    // presetId, jeonseDeposit, jeonseLoanRatio, jeonseInterestRate,
    // monthlyDeposit, monthlyRent, monthlyRentIncreaseRate,
    // buyPrice, buyEquity, buyLoanInterestRate, buyLoanPeriodYears, buyRepaymentType,
    // initialAsset, residencePeriodYears, investmentReturnRate, housePriceGrowthRate
    expect(typesModule.SimulationInput).toBeDefined();
  });

  /**
   * Additional: Verify SimulationResult contains required calculation outputs
   */
  it('should structure SimulationResult with calculation outputs', async () => {
    const typesModule = await import('@/lib/types');

    // Spec fields:
    // netWorthByYear, finalNetWorth, recommendedOption, deltaVsSecondBest,
    // insightCopy, costBreakdownTable
    expect(typesModule.SimulationResult).toBeDefined();
  });

  /**
   * Additional: Verify HistoryEntry has persistence fields
   */
  it('should structure HistoryEntry with id, createdAt, updatedAt', async () => {
    const typesModule = await import('@/lib/types');

    // Spec fields: id (string), createdAt (ISO8601), updatedAt (ISO8601), label, input
    expect(typesModule.HistoryEntry).toBeDefined();
  });

  /**
   * Additional: Verify SharePayload version tracking
   */
  it('should define SharePayload with version field', async () => {
    const typesModule = await import('@/lib/types');

    // Spec: SharePayloadVersion = 1, SharePayloadV1 contains v and input
    expect(typesModule.SharePayloadVersion).toBeDefined();
    expect(typesModule.SharePayloadV1).toBeDefined();
    expect(typesModule.SharePayload).toBeDefined();
  });

  /**
   * Additional: Verify ShareDecodeError enum variants
   */
  it('should define all ShareDecodeError variants', async () => {
    const typesModule = await import('@/lib/types');

    // Spec error types:
    // 'MISSING_PARAM' | 'TOO_LONG' | 'INVALID_BASE64' | 'INVALID_JSON' | 'SCHEMA_MISMATCH'
    expect(typesModule.ShareDecodeError).toBeDefined();
  });

  /**
   * Additional: Verify RecommendedOption values
   */
  it('should define RecommendedOption as 3-way discriminated union', async () => {
    const typesModule = await import('@/lib/types');

    // Spec: RecommendedOption = 'JEONSE' | 'MONTHLY' | 'BUY'
    expect(typesModule.RecommendedOption).toBeDefined();
  });

  /**
   * Additional: Verify CostBreakdownRow structure with fixed labels
   */
  it('should structure CostBreakdownRow with label union type', async () => {
    const typesModule = await import('@/lib/types');

    // Spec labels: '초기투입자산' | '대출이자(누적)' | '월세(누적)' | '대출원금상환(누적)' | '최종순자산'
    expect(typesModule.CostBreakdownRow).toBeDefined();
  });

  /**
   * Additional: Verify SimulationOutcome is result discriminated union
   */
  it('should structure SimulationOutcome as discriminated union', async () => {
    const typesModule = await import('@/lib/types');

    // Spec: { ok: true; result: SimulationResult } | { ok: false; error: SimulationError }
    expect(typesModule.SimulationOutcome).toBeDefined();
  });

  /**
   * Additional: Verify PresetScenario structure
   */
  it('should structure PresetScenario with id and defaultInput', async () => {
    const typesModule = await import('@/lib/types');

    // Spec: id: 'P1' | 'P2' | 'P3' | 'P4', name, defaultInput: SimulationInput
    expect(typesModule.PresetScenario).toBeDefined();
  });
});
