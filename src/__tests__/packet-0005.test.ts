import { describe, it, expect } from 'vitest';
import type { SimulationInput, SimulationResult, NetWorthPoint } from '@/lib/types';
import { runSimulation } from '@/lib/simulation/engine';

/**
 * Packet 0005: 시뮬레이션 엔진(runSimulation) 순수 함수 구현
 *
 * SimulationInput을 SimulationResult로 변환하는 순수 함수를 테스트합니다.
 * 외부 상태(localStorage/Date.now 등)에 의존하지 않으며, 다음을 만족합니다:
 * - 순자산 시리즈(0..N years)
 * - 추천 옵션(최대 순자산, 동률시 전세 우선)
 * - 인사이트 문구
 * - 계산 결과 유한성 검증
 * - 지원하지 않는 상환방식 거부
 */

describe('시뮬레이션 엔진(runSimulation) 순수 함수 구현', () => {
  // Helper to create minimal valid input
  const createValidInput = (overrides?: Partial<SimulationInput>): SimulationInput => ({
    presetId: null,
    jeonseDeposit: 0,
    jeonseLoanRatio: 0,
    jeonseInterestRate: 0,
    monthlyDeposit: 0,
    monthlyRent: 0,
    monthlyRentIncreaseRate: 0,
    buyPrice: 0,
    buyEquity: 0,
    buyLoanInterestRate: 0,
    buyLoanPeriodYears: 30,
    buyRepaymentType: 'equal_payment',
    initialAsset: 10_000_000,
    residencePeriodYears: 1,
    investmentReturnRate: 0,
    housePriceGrowthRate: 0,
    ...overrides,
  });

  // ============================================================================
  // AC-1: runSimulation(input)이 SimulationResult를 반환하며 외부 상태에 의존하지 않는다
  // ============================================================================
  describe('AC-1: Pure function returning SimulationResult', () => {
    it('should return SimulationResult object with all required fields', () => {
      const input = createValidInput();
      const result = runSimulation(input);

      expect(result).toBeDefined();
      expect(typeof result === 'object').toBe(true);

      // Check all required fields exist
      expect(result).toHaveProperty('netWorthSeries');
      expect(result).toHaveProperty('finalNetWorth');
      expect(result).toHaveProperty('recommendedOption');
      expect(result).toHaveProperty('insightCopy');
      expect(result).toHaveProperty('costBreakdown');
    });

    it('should be deterministic - same input produces same output', () => {
      const input = createValidInput({
        initialAsset: 50_000_000,
        residencePeriodYears: 5,
      });

      const result1 = runSimulation(input);
      const result2 = runSimulation(input);

      // Compare key values
      expect(result1.finalNetWorth).toEqual(result2.finalNetWorth);
      expect(result1.recommendedOption).toEqual(result2.recommendedOption);
      expect(result1.insightCopy).toEqual(result2.insightCopy);
    });

    it('should not depend on Date.now() or time', () => {
      const input = createValidInput();
      const result = runSimulation(input);

      // Result should not contain any timestamp-like fields
      // (all fields should be computed from input only)
      expect(result.finalNetWorth.jeonse).toBe(typeof 'number');
      expect(result.netWorthSeries[0]).toBeDefined();
    });

    it('should not mutate the input object', () => {
      const input = createValidInput({
        initialAsset: 100_000_000,
      });

      const inputCopy = JSON.parse(JSON.stringify(input));
      runSimulation(input);

      // Input should remain unchanged
      expect(input).toEqual(inputCopy);
    });
  });

  // ============================================================================
  // AC-2: netWorthSeries.length === residencePeriodYears + 1, years 0..N
  // ============================================================================
  describe('AC-2: netWorthSeries length and year range (F3-AC-1)', () => {
    it('should generate netWorthSeries with length = residencePeriodYears + 1', () => {
      const input = createValidInput({ residencePeriodYears: 10 });
      const result = runSimulation(input);

      expect(result.netWorthSeries).toHaveLength(11);
    });

    it('should start with year 0', () => {
      const input = createValidInput({ residencePeriodYears: 5 });
      const result = runSimulation(input);

      expect(result.netWorthSeries[0].year).toBe(0);
    });

    it('should end with year = residencePeriodYears', () => {
      const input = createValidInput({ residencePeriodYears: 10 });
      const result = runSimulation(input);

      const lastPoint = result.netWorthSeries[result.netWorthSeries.length - 1];
      expect(lastPoint.year).toBe(10);
    });

    it('should have sequential year values 0..N', () => {
      const input = createValidInput({ residencePeriodYears: 8 });
      const result = runSimulation(input);

      result.netWorthSeries.forEach((point, index) => {
        expect(point.year).toBe(index);
      });
    });

    it('should work with residencePeriodYears = 1 (minimum)', () => {
      const input = createValidInput({ residencePeriodYears: 1 });
      const result = runSimulation(input);

      expect(result.netWorthSeries).toHaveLength(2);
      expect(result.netWorthSeries[0].year).toBe(0);
      expect(result.netWorthSeries[1].year).toBe(1);
    });

    it('should work with residencePeriodYears = 30 (maximum)', () => {
      const input = createValidInput({ residencePeriodYears: 30 });
      const result = runSimulation(input);

      expect(result.netWorthSeries).toHaveLength(31);
      expect(result.netWorthSeries[30].year).toBe(30);
    });

    it('each NetWorthPoint should have year, jeonse, monthly, buy fields', () => {
      const input = createValidInput({ residencePeriodYears: 2 });
      const result = runSimulation(input);

      result.netWorthSeries.forEach((point) => {
        expect(point).toHaveProperty('year');
        expect(point).toHaveProperty('jeonse');
        expect(point).toHaveProperty('monthly');
        expect(point).toHaveProperty('buy');

        expect(typeof point.year).toBe('number');
        expect(typeof point.jeonse).toBe('number');
        expect(typeof point.monthly).toBe('number');
        expect(typeof point.buy).toBe('number');
      });
    });
  });

  // ============================================================================
  // AC-3: recommendedOption is the option with max finalNetWorth (F3-AC-2)
  // ============================================================================
  describe('AC-3: Recommended option is max finalNetWorth (F3-AC-2)', () => {
    it('should recommend "monthly" when monthly has highest finalNetWorth', () => {
      const input = createValidInput({
        monthlyRent: 2_000_000, // Monthly rent is favorable
        monthlyRentIncreaseRate: 0.02,
        residencePeriodYears: 5,
      });
      const result = runSimulation(input);

      // Setup: monthly should have higher finalNetWorth than jeonse and buy
      expect(result.finalNetWorth.monthly).toBeGreaterThanOrEqual(
        result.finalNetWorth.jeonse,
      );
      expect(result.finalNetWorth.monthly).toBeGreaterThanOrEqual(
        result.finalNetWorth.buy,
      );
      expect(result.recommendedOption).toBe('monthly');
    });

    it('should recommend "buy" when buy has highest finalNetWorth', () => {
      const input = createValidInput({
        buyPrice: 500_000_000,
        buyEquity: 100_000_000,
        housePriceGrowthRate: 0.05, // House appreciates
        residencePeriodYears: 10,
      });
      const result = runSimulation(input);

      // Buy should have higher finalNetWorth when house appreciates
      expect(result.finalNetWorth.buy).toBeGreaterThanOrEqual(
        result.finalNetWorth.jeonse,
      );
      expect(result.finalNetWorth.buy).toBeGreaterThanOrEqual(
        result.finalNetWorth.monthly,
      );
      expect(result.recommendedOption).toBe('buy');
    });

    it('should recommend "jeonse" when jeonse has highest finalNetWorth', () => {
      const input = createValidInput({
        jeonseDeposit: 300_000_000,
        jeonseLoanRatio: 0.5,
        investmentReturnRate: 0.08,
        residencePeriodYears: 8,
      });
      const result = runSimulation(input);

      // Jeonse deposit can be invested at return rate
      expect(result.finalNetWorth.jeonse).toBeGreaterThanOrEqual(
        result.finalNetWorth.monthly,
      );
      expect(result.finalNetWorth.jeonse).toBeGreaterThanOrEqual(
        result.finalNetWorth.buy,
      );
      expect(result.recommendedOption).toBe('jeonse');
    });
  });

  // ============================================================================
  // AC-4: Tie case → recommendedOption === 'jeonse' (F3-AC-3)
  // ============================================================================
  describe('AC-4: Tie case prefers jeonse (F3-AC-3)', () => {
    it('should recommend "jeonse" when all three options tie at same finalNetWorth', () => {
      const input = createValidInput({
        initialAsset: 10_000_000,
        residencePeriodYears: 1,
        // All growth/return rates are 0
        investmentReturnRate: 0,
        housePriceGrowthRate: 0,
        monthlyRentIncreaseRate: 0,
        jeonseInterestRate: 0,
        buyLoanInterestRate: 0,
      });
      const result = runSimulation(input);

      // All should be equal
      expect(result.finalNetWorth.jeonse).toBe(result.finalNetWorth.monthly);
      expect(result.finalNetWorth.monthly).toBe(result.finalNetWorth.buy);

      // Should recommend jeonse in tie case
      expect(result.recommendedOption).toBe('jeonse');
    });

    it('should prefer jeonse over monthly when tied', () => {
      // Create a scenario where jeonse and monthly end up with same finalNetWorth
      const input = createValidInput({
        initialAsset: 20_000_000,
        residencePeriodYears: 2,
        investmentReturnRate: 0,
        housePriceGrowthRate: 0,
      });
      const result = runSimulation(input);

      if (result.finalNetWorth.jeonse === result.finalNetWorth.monthly) {
        expect(result.recommendedOption).toBe('jeonse');
      }
    });
  });

  // ============================================================================
  // AC-5: All 0% case → finalNetWorth of all options === initialAsset (F3-AC-4)
  // ============================================================================
  describe('AC-5: Zero growth case arithmetic (F3-AC-4)', () => {
    it('should return finalNetWorth equal to initialAsset when all rates are 0', () => {
      const input = createValidInput({
        presetId: null,
        jeonseDeposit: 0,
        jeonseLoanRatio: 0,
        jeonseInterestRate: 0,
        monthlyDeposit: 0,
        monthlyRent: 0,
        monthlyRentIncreaseRate: 0,
        buyPrice: 0,
        buyEquity: 0,
        buyLoanInterestRate: 0,
        buyLoanPeriodYears: 30,
        buyRepaymentType: 'equal_payment',
        initialAsset: 10_000_000,
        residencePeriodYears: 1,
        investmentReturnRate: 0,
        housePriceGrowthRate: 0,
      });
      const result = runSimulation(input);

      expect(result.finalNetWorth.jeonse).toBe(10_000_000);
      expect(result.finalNetWorth.monthly).toBe(10_000_000);
      expect(result.finalNetWorth.buy).toBe(10_000_000);
    });

    it('should handle larger initialAsset in zero-rate scenario', () => {
      const input = createValidInput({
        initialAsset: 100_000_000,
        residencePeriodYears: 5,
      });
      const result = runSimulation(input);

      expect(result.finalNetWorth.jeonse).toBe(100_000_000);
      expect(result.finalNetWorth.monthly).toBe(100_000_000);
      expect(result.finalNetWorth.buy).toBe(100_000_000);
    });

    it('should preserve initialAsset throughout series in zero-rate case', () => {
      const input = createValidInput({
        initialAsset: 50_000_000,
        residencePeriodYears: 3,
      });
      const result = runSimulation(input);

      result.netWorthSeries.forEach((point) => {
        expect(point.jeonse).toBe(50_000_000);
        expect(point.monthly).toBe(50_000_000);
        expect(point.buy).toBe(50_000_000);
      });
    });
  });

  // ============================================================================
  // AC-6: All netWorth values must be finite (F3-AC-6)
  // ============================================================================
  describe('AC-6: Finiteness validation (F3-AC-6)', () => {
    it('should ensure all netWorthSeries values are finite', () => {
      const input = createValidInput({
        initialAsset: 50_000_000,
        residencePeriodYears: 10,
        investmentReturnRate: 0.1,
        housePriceGrowthRate: 0.05,
        monthlyRentIncreaseRate: 0.02,
      });
      const result = runSimulation(input);

      result.netWorthSeries.forEach((point) => {
        expect(Number.isFinite(point.jeonse)).toBe(true);
        expect(Number.isFinite(point.monthly)).toBe(true);
        expect(Number.isFinite(point.buy)).toBe(true);
      });
    });

    it('should ensure finalNetWorth values are finite', () => {
      const input = createValidInput({
        initialAsset: 100_000_000,
        residencePeriodYears: 20,
        investmentReturnRate: 0.15,
        housePriceGrowthRate: 0.1,
      });
      const result = runSimulation(input);

      expect(Number.isFinite(result.finalNetWorth.jeonse)).toBe(true);
      expect(Number.isFinite(result.finalNetWorth.monthly)).toBe(true);
      expect(Number.isFinite(result.finalNetWorth.buy)).toBe(true);
    });

    it('should not produce NaN with valid high rates', () => {
      const input = createValidInput({
        initialAsset: 200_000_000,
        residencePeriodYears: 30,
        investmentReturnRate: 0.2, // Maximum rate
        housePriceGrowthRate: 0.2,
        monthlyRentIncreaseRate: 0.2,
        jeonseInterestRate: 0.2,
        buyLoanInterestRate: 0.2,
      });
      const result = runSimulation(input);

      result.netWorthSeries.forEach((point) => {
        expect(Number.isNaN(point.jeonse)).toBe(false);
        expect(Number.isNaN(point.monthly)).toBe(false);
        expect(Number.isNaN(point.buy)).toBe(false);
      });
    });
  });

  // ============================================================================
  // AC-7: Unsupported buyRepaymentType throws error (F3-AC-7)
  // ============================================================================
  describe('AC-7: Unsupported buyRepaymentType rejection (F3-AC-7)', () => {
    it('should throw error with correct message for unsupported buyRepaymentType', () => {
      const input = createValidInput({
        buyRepaymentType: 'balloon' as any,
      });

      expect(() => {
        runSimulation(input);
      }).toThrow('지원하지 않는 상환방식입니다');
    });

    it('should throw error for invalid buyRepaymentType string', () => {
      const input = createValidInput({
        buyRepaymentType: 'invalid_type' as any,
      });

      expect(() => {
        runSimulation(input);
      }).toThrow('지원하지 않는 상환방식입니다');
    });

    it('should accept "equal_payment" buyRepaymentType', () => {
      const input = createValidInput({
        buyRepaymentType: 'equal_payment',
      });

      expect(() => {
        runSimulation(input);
      }).not.toThrow();
    });

    it('should accept "equal_principal" buyRepaymentType', () => {
      const input = createValidInput({
        buyRepaymentType: 'equal_principal',
      });

      expect(() => {
        runSimulation(input);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // AC-5 (from spec): insightCopy matches regex (F3-AC-5)
  // ============================================================================
  describe('AC-5: insightCopy format validation (F3-AC-5)', () => {
    it('should generate insightCopy matching the regex pattern', () => {
      const input = createValidInput({
        residencePeriodYears: 10,
        investmentReturnRate: 0.05,
      });
      const result = runSimulation(input);

      const pattern =
        /^\+1%p 집값상승 시: (전세|월세|매매) 1위, 2위와 차이 \d+원$/;
      expect(result.insightCopy).toMatch(pattern);
    });

    it('should include housePriceGrowthRate sensitivity analysis', () => {
      const input = createValidInput({
        residencePeriodYears: 5,
        housePriceGrowthRate: 0.02,
      });
      const result = runSimulation(input);

      expect(result.insightCopy).toContain('집값상승');
      expect(result.insightCopy).toContain('1위');
      expect(result.insightCopy).toContain('차이');
      expect(result.insightCopy).toContain('원');
    });

    it('insightCopy should indicate a Korean option name', () => {
      const input = createValidInput({
        initialAsset: 50_000_000,
        residencePeriodYears: 8,
      });
      const result = runSimulation(input);

      expect(
        result.insightCopy.includes('전세') ||
          result.insightCopy.includes('월세') ||
          result.insightCopy.includes('매매'),
      ).toBe(true);
    });
  });

  // ============================================================================
  // costBreakdown structure validation
  // ============================================================================
  describe('costBreakdown structure', () => {
    it('should provide costBreakdown with jeonse, monthly, buy keys', () => {
      const input = createValidInput();
      const result = runSimulation(input);

      expect(result.costBreakdown).toHaveProperty('jeonse');
      expect(result.costBreakdown).toHaveProperty('monthly');
      expect(result.costBreakdown).toHaveProperty('buy');

      expect(typeof result.costBreakdown.jeonse).toBe('object');
      expect(typeof result.costBreakdown.monthly).toBe('object');
      expect(typeof result.costBreakdown.buy).toBe('object');
    });

    it('should not have NaN values in costBreakdown', () => {
      const input = createValidInput({
        initialAsset: 100_000_000,
        residencePeriodYears: 10,
        investmentReturnRate: 0.1,
      });
      const result = runSimulation(input);

      const checkBreakdown = (breakdown: Record<string, number>) => {
        Object.values(breakdown).forEach((value) => {
          expect(Number.isNaN(value)).toBe(false);
          expect(Number.isFinite(value)).toBe(true);
        });
      };

      checkBreakdown(result.costBreakdown.jeonse);
      checkBreakdown(result.costBreakdown.monthly);
      checkBreakdown(result.costBreakdown.buy);
    });
  });

  // ============================================================================
  // Integration: Various realistic scenarios
  // ============================================================================
  describe('Integration: Realistic scenarios', () => {
    it('should handle jeonse scenario with loan', () => {
      const input = createValidInput({
        jeonseDeposit: 300_000_000,
        jeonseLoanRatio: 0.5,
        jeonseInterestRate: 0.03,
        initialAsset: 50_000_000,
        residencePeriodYears: 5,
        investmentReturnRate: 0.05,
      });

      expect(() => {
        const result = runSimulation(input);
        expect(result.netWorthSeries).toHaveLength(6);
        expect(result.recommendedOption).toBeDefined();
      }).not.toThrow();
    });

    it('should handle monthly rent scenario with price increase', () => {
      const input = createValidInput({
        monthlyDeposit: 10_000_000,
        monthlyRent: 1_500_000,
        monthlyRentIncreaseRate: 0.03,
        initialAsset: 30_000_000,
        residencePeriodYears: 10,
        investmentReturnRate: 0.04,
      });

      expect(() => {
        const result = runSimulation(input);
        expect(result.finalNetWorth.monthly).toBeDefined();
      }).not.toThrow();
    });

    it('should handle buy scenario with equal_payment repayment', () => {
      const input = createValidInput({
        buyPrice: 500_000_000,
        buyEquity: 100_000_000,
        buyLoanInterestRate: 0.03,
        buyLoanPeriodYears: 20,
        buyRepaymentType: 'equal_payment',
        housePriceGrowthRate: 0.03,
        residencePeriodYears: 15,
      });

      expect(() => {
        const result = runSimulation(input);
        expect(result.finalNetWorth.buy).toBeDefined();
      }).not.toThrow();
    });

    it('should handle buy scenario with equal_principal repayment', () => {
      const input = createValidInput({
        buyPrice: 600_000_000,
        buyEquity: 150_000_000,
        buyLoanInterestRate: 0.025,
        buyLoanPeriodYears: 25,
        buyRepaymentType: 'equal_principal',
        housePriceGrowthRate: 0.02,
        residencePeriodYears: 12,
      });

      expect(() => {
        const result = runSimulation(input);
        expect(result.finalNetWorth.buy).toBeDefined();
      }).not.toThrow();
    });
  });
});
