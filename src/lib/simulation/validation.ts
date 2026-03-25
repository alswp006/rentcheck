import type { SimulationInput } from "@/lib/types";

const MAX_RESIDENCE_YEARS = 50;

const NUMERIC_FIELDS: (keyof SimulationInput)[] = [
  "jeonseDeposit",
  "jeonseLoanRatio",
  "jeonseInterestRate",
  "monthlyDeposit",
  "monthlyRent",
  "monthlyRentIncreaseRate",
  "buyPrice",
  "buyEquity",
  "buyLoanRate",
  "buyLoanPeriodYears",
  "initialAsset",
  "residenceYears",
  "investmentReturnRate",
  "housePriceGrowthRate",
];

type ValidationOk = { ok: true };
type ValidationFail = { ok: false; code: string; message: string };
type ValidationResult = ValidationOk | ValidationFail;

export function validateSimulationInput(input: SimulationInput): ValidationResult {
  // Check for NaN or Infinity in numeric fields
  for (const field of NUMERIC_FIELDS) {
    const value = input[field] as number;
    if (typeof value === "number" && (!isFinite(value) || isNaN(value))) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "입력값을 확인해주세요",
      };
    }
  }

  // Check for negative residenceYears
  if (input.residenceYears < 0) {
    return {
      ok: false,
      code: "INVALID_RESIDENCE_YEARS",
      message: "거주기간은 0 이상이어야 해요",
    };
  }

  // Check for excessive residenceYears
  if (input.residenceYears > MAX_RESIDENCE_YEARS) {
    return {
      ok: false,
      code: "RESIDENCE_YEARS_TOO_LARGE",
      message: "거주기간이 너무 커요",
    };
  }

  return { ok: true };
}
