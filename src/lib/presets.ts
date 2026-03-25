import type { PresetScenario, SimulationInput } from "@/lib/types";
import { deepClone } from "@/lib/utils/clone";
import { createUuid } from "@/lib/utils/uuid";

const BASE_TIMESTAMP = 1700000000000;

function makeInput(overrides: Partial<SimulationInput> & { id: string; presetId: string }): SimulationInput {
  return {
    id: overrides.id,
    presetId: overrides.presetId,
    jeonseDeposit: overrides.jeonseDeposit ?? 0,
    jeonseLoanRatio: overrides.jeonseLoanRatio ?? 0.6,
    jeonseInterestRate: overrides.jeonseInterestRate ?? 0.035,
    monthlyDeposit: overrides.monthlyDeposit ?? 0,
    monthlyRent: overrides.monthlyRent ?? 0,
    monthlyRentIncreaseRate: overrides.monthlyRentIncreaseRate ?? 0.05,
    buyPrice: overrides.buyPrice ?? 0,
    buyEquity: overrides.buyEquity ?? 0,
    buyLoanRate: overrides.buyLoanRate ?? 0.04,
    buyLoanPeriodYears: overrides.buyLoanPeriodYears ?? 30,
    buyRepaymentType: "AMORTIZED",
    initialAsset: overrides.initialAsset ?? 100000000,
    residenceYears: overrides.residenceYears ?? 5,
    investmentReturnRate: overrides.investmentReturnRate ?? 0.05,
    housePriceGrowthRate: overrides.housePriceGrowthRate ?? 0.03,
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  };
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "preset-1",
    name: "프리셋1",
    defaultInput: makeInput({
      id: "preset-input-1",
      presetId: "preset-1",
      jeonseDeposit: 300000000,
      residenceYears: 10,
      initialAsset: 100000000,
    }),
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: "preset-2",
    name: "프리셋2",
    defaultInput: makeInput({
      id: "preset-input-2",
      presetId: "preset-2",
      monthlyDeposit: 50000000,
      monthlyRent: 1000000,
      residenceYears: 5,
      initialAsset: 80000000,
    }),
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: "preset-3",
    name: "프리셋3",
    defaultInput: makeInput({
      id: "preset-input-3",
      presetId: "preset-3",
      buyPrice: 500000000,
      buyEquity: 150000000,
      residenceYears: 20,
      initialAsset: 150000000,
    }),
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
  {
    id: "preset-4",
    name: "프리셋4",
    defaultInput: makeInput({
      id: "preset-input-4",
      presetId: "preset-4",
      jeonseDeposit: 200000000,
      buyPrice: 400000000,
      buyEquity: 100000000,
      residenceYears: 7,
      initialAsset: 120000000,
    }),
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  },
];

export function createDefaultSimulationInput(): SimulationInput {
  const now = Date.now();
  return {
    id: createUuid(),
    presetId: null,
    jeonseDeposit: 0,
    jeonseLoanRatio: 0.6,
    jeonseInterestRate: 0.035,
    monthlyDeposit: 0,
    monthlyRent: 0,
    monthlyRentIncreaseRate: 0.05,
    buyPrice: 0,
    buyEquity: 0,
    buyLoanRate: 0.04,
    buyLoanPeriodYears: 30,
    buyRepaymentType: "AMORTIZED",
    initialAsset: 100000000,
    residenceYears: 5,
    investmentReturnRate: 0.05,
    housePriceGrowthRate: 0.03,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSimulationInputFromPreset(preset: PresetScenario): SimulationInput {
  return deepClone(preset.defaultInput);
}
