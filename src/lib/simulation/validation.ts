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
  // Check for non-numeric, NaN, or Infinity in numeric fields
  for (const field of NUMERIC_FIELDS) {
    const value = input[field] as unknown;
    if (typeof value !== "number" || !isFinite(value)) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "입력값을 확인해주세요",
      };
    }
  }

  // Check money-amount fields are non-negative
  const MONEY_FIELDS: (keyof SimulationInput)[] = [
    "jeonseDeposit",
    "monthlyDeposit",
    "monthlyRent",
    "buyPrice",
    "buyEquity",
    "initialAsset",
  ];
  for (const field of MONEY_FIELDS) {
    if ((input[field] as number) < 0) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "입력값은 0 이상이어야 해요",
      };
    }
  }

  // Check buyEquity does not exceed buyPrice
  if (input.buyEquity > input.buyPrice) {
    return {
      ok: false,
      code: "INVALID_BUY_EQUITY",
      message: "자기자본이 매매가를 초과할 수 없어요",
    };
  }

  // Check jeonseLoanRatio is within [0, 1]
  if (input.jeonseLoanRatio < 0 || input.jeonseLoanRatio > 1) {
    return {
      ok: false,
      code: "INVALID_JEONSE_LOAN_RATIO",
      message: "전세 대출 비율은 0~100% 사이여야 해요",
    };
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
