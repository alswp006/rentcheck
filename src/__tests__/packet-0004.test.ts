import { describe, it, expect } from 'vitest';
import type { SimulationInput, PresetScenario, BuyRepaymentType } from '@/lib/types';
import { PRESET_SCENARIOS, getDefaultInput } from '@/lib/presets';

/**
 * Packet 0004: 프리셋 4종 상수 + 기본 입력 팩토리
 *
 * Bundle에 포함되는 4종 프리셋과 기본 입력 생성 함수를 테스트합니다.
 * 모든 입력은 완전한 SimulationInput 형태여야 합니다 (undefined 필드 금지).
 */

describe('프리셋 4종 상수 + 기본 입력 팩토리', () => {
  // ============================================================================
  // AC-1: PRESET_SCENARIOS가 길이 4인 배열로 export 된다
  // ============================================================================
  describe('AC-1: PRESET_SCENARIOS를 길이 4인 배열로 export', () => {
    it('should export PRESET_SCENARIOS as an array of length 4', () => {
      expect(Array.isArray(PRESET_SCENARIOS)).toBe(true);
      expect(PRESET_SCENARIOS).toHaveLength(4);
    });

    it('should have 4 distinct preset IDs', () => {
      const ids = PRESET_SCENARIOS.map((p) => p.id);
      expect(ids).toHaveLength(4);

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(4);
    });

    it('should include all 4 required preset IDs', () => {
      const ids = PRESET_SCENARIOS.map((p) => p.id);
      expect(ids).toContain('preset_young_jeonse');
      expect(ids).toContain('preset_newlyweds_compare');
      expect(ids).toContain('preset_monthly_invest');
      expect(ids).toContain('preset_buy_focus');
    });

    it('should have name property for each preset (1-20 chars)', () => {
      PRESET_SCENARIOS.forEach((preset) => {
        expect(typeof preset.name).toBe('string');
        expect(preset.name.length).toBeGreaterThanOrEqual(1);
        expect(preset.name.length).toBeLessThanOrEqual(20);
      });
    });
  });

  // ============================================================================
  // AC-2: 각 preset의 defaultInput은 SimulationInput의 모든 필드를 포함하며
  //       undefined 필드가 없다
  // ============================================================================
  describe('AC-2: 각 preset의 defaultInput이 모든 필드를 포함', () => {
    it('should have all SimulationInput fields in each preset defaultInput', () => {
      const requiredFields: (keyof SimulationInput)[] = [
        'presetId',
        'jeonseDeposit',
        'jeonseLoanRatio',
        'jeonseInterestRate',
        'monthlyDeposit',
        'monthlyRent',
        'monthlyRentIncreaseRate',
        'buyPrice',
        'buyEquity',
        'buyLoanInterestRate',
        'buyLoanPeriodYears',
        'buyRepaymentType',
        'initialAsset',
        'residencePeriodYears',
        'investmentReturnRate',
        'housePriceGrowthRate',
      ];

      PRESET_SCENARIOS.forEach((preset) => {
        const input = preset.defaultInput;
        requiredFields.forEach((field) => {
          expect(input).toHaveProperty(field);
          expect(input[field]).not.toBeUndefined();
        });
      });
    });

    it('should have exactly 16 fields in each defaultInput (no extras)', () => {
      PRESET_SCENARIOS.forEach((preset) => {
        const fieldCount = Object.keys(preset.defaultInput).length;
        expect(fieldCount).toBe(16);
      });
    });

    it('should have correct presetId matching the preset id', () => {
      PRESET_SCENARIOS.forEach((preset) => {
        expect(preset.defaultInput.presetId).toBe(preset.id);
      });
    });

    it('should have numeric values within valid ranges for all presets', () => {
      PRESET_SCENARIOS.forEach((preset) => {
        const input = preset.defaultInput;

        // Jeonse fields
        expect(input.jeonseDeposit).toBeGreaterThanOrEqual(0);
        expect(input.jeonseDeposit).toBeLessThanOrEqual(2_000_000_000);
        expect(input.jeonseLoanRatio).toBeGreaterThanOrEqual(0);
        expect(input.jeonseLoanRatio).toBeLessThanOrEqual(0.9);
        expect(input.jeonseInterestRate).toBeGreaterThanOrEqual(0);
        expect(input.jeonseInterestRate).toBeLessThanOrEqual(0.2);

        // Monthly rent fields
        expect(input.monthlyDeposit).toBeGreaterThanOrEqual(0);
        expect(input.monthlyDeposit).toBeLessThanOrEqual(200_000_000);
        expect(input.monthlyRent).toBeGreaterThanOrEqual(0);
        expect(input.monthlyRent).toBeLessThanOrEqual(10_000_000);
        expect(input.monthlyRentIncreaseRate).toBeGreaterThanOrEqual(0);
        expect(input.monthlyRentIncreaseRate).toBeLessThanOrEqual(0.2);

        // Buy fields
        expect(input.buyPrice).toBeGreaterThanOrEqual(0);
        expect(input.buyPrice).toBeLessThanOrEqual(3_000_000_000);
        expect(input.buyEquity).toBeGreaterThanOrEqual(0);
        expect(input.buyEquity).toBeLessThanOrEqual(input.buyPrice);
        expect(input.buyLoanInterestRate).toBeGreaterThanOrEqual(0);
        expect(input.buyLoanInterestRate).toBeLessThanOrEqual(0.2);
        expect(input.buyLoanPeriodYears).toBeGreaterThanOrEqual(1);
        expect(input.buyLoanPeriodYears).toBeLessThanOrEqual(40);

        // Common fields
        expect(input.initialAsset).toBeGreaterThanOrEqual(0);
        expect(input.initialAsset).toBeLessThanOrEqual(2_000_000_000);
        expect(input.residencePeriodYears).toBeGreaterThanOrEqual(1);
        expect(input.residencePeriodYears).toBeLessThanOrEqual(30);
        expect(input.investmentReturnRate).toBeGreaterThanOrEqual(0);
        expect(input.investmentReturnRate).toBeLessThanOrEqual(0.2);
        expect(input.housePriceGrowthRate).toBeGreaterThanOrEqual(-0.1);
        expect(input.housePriceGrowthRate).toBeLessThanOrEqual(0.2);
      });
    });

    it('should have valid buyRepaymentType in each preset', () => {
      const validTypes: BuyRepaymentType[] = ['equal_payment', 'equal_principal'];

      PRESET_SCENARIOS.forEach((preset) => {
        expect(validTypes).toContain(preset.defaultInput.buyRepaymentType);
      });
    });

    it('should have integer values for years and period fields', () => {
      PRESET_SCENARIOS.forEach((preset) => {
        const input = preset.defaultInput;
        expect(Number.isInteger(input.buyLoanPeriodYears)).toBe(true);
        expect(Number.isInteger(input.residencePeriodYears)).toBe(true);
      });
    });
  });

  // ============================================================================
  // AC-3: getDefaultInput()은 SimulationInput의 모든 필드를 포함한 새 객체를
  //       반환한다 (호출 간 참조 동일성 공유 금지)
  // ============================================================================
  describe('AC-3: getDefaultInput()이 새 객체를 매번 반환', () => {
    it('should return a complete SimulationInput object with all 16 fields', () => {
      const defaultInput = getDefaultInput();

      const requiredFields: (keyof SimulationInput)[] = [
        'presetId',
        'jeonseDeposit',
        'jeonseLoanRatio',
        'jeonseInterestRate',
        'monthlyDeposit',
        'monthlyRent',
        'monthlyRentIncreaseRate',
        'buyPrice',
        'buyEquity',
        'buyLoanInterestRate',
        'buyLoanPeriodYears',
        'buyRepaymentType',
        'initialAsset',
        'residencePeriodYears',
        'investmentReturnRate',
        'housePriceGrowthRate',
      ];

      requiredFields.forEach((field) => {
        expect(defaultInput).toHaveProperty(field);
        expect(defaultInput[field]).not.toBeUndefined();
      });

      expect(Object.keys(defaultInput)).toHaveLength(16);
    });

    it('should return a new object on each call (not reference sharing)', () => {
      const input1 = getDefaultInput();
      const input2 = getDefaultInput();

      // Should not be the same reference
      expect(input1).not.toBe(input2);

      // But should have deep equality
      expect(input1).toEqual(input2);
    });

    it('should return independent copies (modifications do not affect next call)', () => {
      const input1 = getDefaultInput();
      const initialJeonseDeposit = input1.jeonseDeposit;

      // Modify the first object
      input1.jeonseDeposit = 999_999_999;

      // Get a new object
      const input2 = getDefaultInput();

      // Should have original value, not the modified one
      expect(input2.jeonseDeposit).toBe(initialJeonseDeposit);
      expect(input2.jeonseDeposit).not.toBe(999_999_999);
    });

    it('should return values within valid ranges', () => {
      const input = getDefaultInput();

      // Jeonse fields
      expect(input.jeonseDeposit).toBeGreaterThanOrEqual(0);
      expect(input.jeonseDeposit).toBeLessThanOrEqual(2_000_000_000);
      expect(input.jeonseLoanRatio).toBeGreaterThanOrEqual(0);
      expect(input.jeonseLoanRatio).toBeLessThanOrEqual(0.9);
      expect(input.jeonseInterestRate).toBeGreaterThanOrEqual(0);
      expect(input.jeonseInterestRate).toBeLessThanOrEqual(0.2);

      // Monthly rent fields
      expect(input.monthlyDeposit).toBeGreaterThanOrEqual(0);
      expect(input.monthlyDeposit).toBeLessThanOrEqual(200_000_000);
      expect(input.monthlyRent).toBeGreaterThanOrEqual(0);
      expect(input.monthlyRent).toBeLessThanOrEqual(10_000_000);
      expect(input.monthlyRentIncreaseRate).toBeGreaterThanOrEqual(0);
      expect(input.monthlyRentIncreaseRate).toBeLessThanOrEqual(0.2);

      // Buy fields
      expect(input.buyPrice).toBeGreaterThanOrEqual(0);
      expect(input.buyPrice).toBeLessThanOrEqual(3_000_000_000);
      expect(input.buyEquity).toBeGreaterThanOrEqual(0);
      expect(input.buyEquity).toBeLessThanOrEqual(input.buyPrice);
      expect(input.buyLoanInterestRate).toBeGreaterThanOrEqual(0);
      expect(input.buyLoanInterestRate).toBeLessThanOrEqual(0.2);
      expect(input.buyLoanPeriodYears).toBeGreaterThanOrEqual(1);
      expect(input.buyLoanPeriodYears).toBeLessThanOrEqual(40);

      // Common fields
      expect(input.initialAsset).toBeGreaterThanOrEqual(0);
      expect(input.initialAsset).toBeLessThanOrEqual(2_000_000_000);
      expect(input.residencePeriodYears).toBeGreaterThanOrEqual(1);
      expect(input.residencePeriodYears).toBeLessThanOrEqual(30);
      expect(input.investmentReturnRate).toBeGreaterThanOrEqual(0);
      expect(input.investmentReturnRate).toBeLessThanOrEqual(0.2);
      expect(input.housePriceGrowthRate).toBeGreaterThanOrEqual(-0.1);
      expect(input.housePriceGrowthRate).toBeLessThanOrEqual(0.2);
    });

    it('should return presetId as null', () => {
      const input = getDefaultInput();
      expect(input.presetId).toBeNull();
    });

    it('should return a valid buyRepaymentType', () => {
      const input = getDefaultInput();
      const validTypes: BuyRepaymentType[] = ['equal_payment', 'equal_principal'];
      expect(validTypes).toContain(input.buyRepaymentType);
    });
  });

  // ============================================================================
  // AC-4: 프로젝트가 컴파일되며, 다른 모듈에서
  //       PRESET_SCENARIOS.map(p=>p.id) 사용이 가능하다
  // ============================================================================
  describe('AC-4: 프로젝트 컴파일 + 다른 모듈에서 사용 가능', () => {
    it('should allow mapping preset IDs from PRESET_SCENARIOS', () => {
      const presetIds = PRESET_SCENARIOS.map((p) => p.id);
      expect(presetIds).toEqual([
        'preset_young_jeonse',
        'preset_newlyweds_compare',
        'preset_monthly_invest',
        'preset_buy_focus',
      ]);
    });

    it('should allow filtering PRESET_SCENARIOS by id', () => {
      const targetPreset = PRESET_SCENARIOS.find((p) => p.id === 'preset_buy_focus');
      expect(targetPreset).toBeDefined();
      expect(targetPreset?.id).toBe('preset_buy_focus');
    });

    it('should maintain type safety with defaultInput', () => {
      PRESET_SCENARIOS.forEach((preset) => {
        // Should be able to use defaultInput as SimulationInput
        const input: SimulationInput = preset.defaultInput;
        expect(input.presetId).toBe(preset.id);
      });
    });

    it('should allow accessing individual presets by iteration', () => {
      let foundCount = 0;

      for (const preset of PRESET_SCENARIOS) {
        if (preset.id === 'preset_young_jeonse') foundCount++;
        if (preset.id === 'preset_newlyweds_compare') foundCount++;
        if (preset.id === 'preset_monthly_invest') foundCount++;
        if (preset.id === 'preset_buy_focus') foundCount++;
      }

      expect(foundCount).toBe(4);
    });

    it('should support using getDefaultInput in async/component contexts', async () => {
      // Simulate component usage
      const input = getDefaultInput();
      expect(input).toBeDefined();

      // Should work in async context
      await Promise.resolve();
      const input2 = getDefaultInput();
      expect(input2).toBeDefined();
    });
  });
});
