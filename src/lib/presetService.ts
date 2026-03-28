import type { PresetScenario, PresetService, Paginated, Result } from '@/lib/types';

const PRESET_CREATED_AT = 1735689600000; // 2025-01-01T00:00:00Z

function makeInput(
  id: string,
  overrides: Partial<{
    jeonseDepositKRW: number;
    jeonseLoanRatio: number;
    jeonseLoanRateAPR: number;
    monthlyDepositKRW: number;
    monthlyRentKRW: number;
    monthlyRentIncreaseRateAnnual: number;
    buyPriceKRW: number;
    buyEquityKRW: number;
    buyLoanRateAPR: number;
    buyLoanPeriodYears: number;
    initialAssetKRW: number;
    stayPeriodYears: number;
    investmentReturnRateAnnual: number;
    housePriceGrowthRateAnnual: number;
    presetId: string | null;
  }>
) {
  return {
    id,
    createdAt: PRESET_CREATED_AT,
    updatedAt: PRESET_CREATED_AT,
    presetId: overrides.presetId ?? null,
    jeonseDepositKRW: overrides.jeonseDepositKRW ?? 300_000_000,
    jeonseLoanRatio: overrides.jeonseLoanRatio ?? 0.8,
    jeonseLoanRateAPR: overrides.jeonseLoanRateAPR ?? 3.5,
    monthlyDepositKRW: overrides.monthlyDepositKRW ?? 50_000_000,
    monthlyRentKRW: overrides.monthlyRentKRW ?? 1_200_000,
    monthlyRentIncreaseRateAnnual: overrides.monthlyRentIncreaseRateAnnual ?? 2.0,
    buyPriceKRW: overrides.buyPriceKRW ?? 900_000_000,
    buyEquityKRW: overrides.buyEquityKRW ?? 300_000_000,
    buyLoanRateAPR: overrides.buyLoanRateAPR ?? 4.0,
    buyLoanPeriodYears: overrides.buyLoanPeriodYears ?? 30,
    buyRepaymentType: '원리금균등' as const,
    initialAssetKRW: overrides.initialAssetKRW ?? 300_000_000,
    stayPeriodYears: overrides.stayPeriodYears ?? 5,
    investmentReturnRateAnnual: overrides.investmentReturnRateAnnual ?? 5.0,
    housePriceGrowthRateAnnual: overrides.housePriceGrowthRateAnnual ?? 3.0,
  };
}

const PRESETS: PresetScenario[] = [
  {
    id: 'preset-gangnam-jeonse',
    name: '서울 강남 전세',
    createdAt: PRESET_CREATED_AT,
    updatedAt: PRESET_CREATED_AT,
    defaultInput: makeInput('input-preset-gangnam-jeonse', {
      presetId: 'preset-gangnam-jeonse',
      jeonseDepositKRW: 700_000_000,
      jeonseLoanRatio: 0.8,
      jeonseLoanRateAPR: 3.2,
      monthlyDepositKRW: 100_000_000,
      monthlyRentKRW: 2_500_000,
      buyPriceKRW: 1_500_000_000,
      buyEquityKRW: 500_000_000,
      buyLoanRateAPR: 4.0,
      initialAssetKRW: 500_000_000,
      stayPeriodYears: 5,
      housePriceGrowthRateAnnual: 4.0,
    }),
  },
  {
    id: 'preset-gyeonggi-monthly',
    name: '수도권 월세',
    createdAt: PRESET_CREATED_AT,
    updatedAt: PRESET_CREATED_AT,
    defaultInput: makeInput('input-preset-gyeonggi-monthly', {
      presetId: 'preset-gyeonggi-monthly',
      jeonseDepositKRW: 250_000_000,
      jeonseLoanRatio: 0.8,
      jeonseLoanRateAPR: 3.5,
      monthlyDepositKRW: 20_000_000,
      monthlyRentKRW: 900_000,
      monthlyRentIncreaseRateAnnual: 2.0,
      buyPriceKRW: 550_000_000,
      buyEquityKRW: 150_000_000,
      buyLoanRateAPR: 4.2,
      initialAssetKRW: 150_000_000,
      stayPeriodYears: 7,
      housePriceGrowthRateAnnual: 2.5,
    }),
  },
  {
    id: 'preset-seoul-buy',
    name: '서울 매매',
    createdAt: PRESET_CREATED_AT,
    updatedAt: PRESET_CREATED_AT,
    defaultInput: makeInput('input-preset-seoul-buy', {
      presetId: 'preset-seoul-buy',
      jeonseDepositKRW: 500_000_000,
      jeonseLoanRatio: 0.8,
      jeonseLoanRateAPR: 3.3,
      monthlyDepositKRW: 80_000_000,
      monthlyRentKRW: 1_800_000,
      buyPriceKRW: 1_000_000_000,
      buyEquityKRW: 400_000_000,
      buyLoanRateAPR: 3.8,
      buyLoanPeriodYears: 30,
      initialAssetKRW: 400_000_000,
      stayPeriodYears: 10,
      housePriceGrowthRateAnnual: 3.5,
    }),
  },
  {
    id: 'preset-affordable',
    name: '실속형 지방',
    createdAt: PRESET_CREATED_AT,
    updatedAt: PRESET_CREATED_AT,
    defaultInput: makeInput('input-preset-affordable', {
      presetId: 'preset-affordable',
      jeonseDepositKRW: 150_000_000,
      jeonseLoanRatio: 0.8,
      jeonseLoanRateAPR: 3.5,
      monthlyDepositKRW: 10_000_000,
      monthlyRentKRW: 500_000,
      monthlyRentIncreaseRateAnnual: 1.5,
      buyPriceKRW: 300_000_000,
      buyEquityKRW: 100_000_000,
      buyLoanRateAPR: 4.5,
      buyLoanPeriodYears: 20,
      initialAssetKRW: 100_000_000,
      stayPeriodYears: 5,
      investmentReturnRateAnnual: 4.0,
      housePriceGrowthRateAnnual: 1.5,
    }),
  },
];

export const presetService: PresetService = {
  listPresets(): Paginated<PresetScenario> {
    return {
      items: PRESETS,
      total: PRESETS.length,
      page: 1,
    };
  },

  getPresetById(id: string): Result<PresetScenario, { code: 'NOT_FOUND' }> {
    const found = PRESETS.find((p) => p.id === id);
    if (found) {
      return { ok: true, value: found };
    }
    return { ok: false, error: { code: 'NOT_FOUND' } };
  },
};
