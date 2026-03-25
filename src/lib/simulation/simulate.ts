import type { SimulationInput, SimulationResult, OptionKey, CostBreakdownMap } from "@/lib/types";
import { validateSimulationInput } from "./validation";
import { createUuid } from "@/lib/utils/uuid";

type SimulateOk = { ok: true; data: SimulationResult };
type SimulateFail = { ok: false; code: string; message: string };
type SimulateResult = SimulateOk | SimulateFail;

function round(n: number): number {
  return Math.round(n);
}

/**
 * Compute AMORTIZED monthly payment (PMT).
 */
function computePMT(principal: number, monthlyRate: number, totalMonths: number): number {
  if (principal <= 0) return 0;
  if (monthlyRate === 0) return principal / totalMonths;
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );
}

/**
 * Remaining loan balance after `yearsPaid` years for an amortized loan.
 */
function loanBalanceAfterYears(
  principal: number,
  monthlyRate: number,
  totalMonths: number,
  yearsPaid: number,
): number {
  if (principal <= 0) return 0;
  if (yearsPaid >= totalMonths / 12) return 0;
  if (monthlyRate === 0) {
    return Math.max(0, principal - (principal / totalMonths) * yearsPaid * 12);
  }
  const monthsPaid = yearsPaid * 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const paidFactor = Math.pow(1 + monthlyRate, monthsPaid);
  return principal * (factor - paidFactor) / (factor - 1);
}

function simulateJeonse(input: SimulationInput): number[] {
  const {
    jeonseDeposit,
    jeonseLoanRatio,
    jeonseInterestRate,
    initialAsset,
    investmentReturnRate,
    residenceYears,
  } = input;

  const loan = jeonseDeposit * jeonseLoanRatio;
  const ownDeposit = jeonseDeposit - loan;
  const annualInterest = loan * jeonseInterestRate;

  // Liquid cash after paying own portion of deposit
  let liquid = initialAsset - ownDeposit;

  const netWorthByYear: number[] = [];

  for (let y = 0; y <= residenceYears; y++) {
    // Net worth = liquid + deposit (full) - loan
    // = liquid + jeonseDeposit - loan
    // = liquid + ownDeposit
    const nw = liquid + ownDeposit;
    netWorthByYear.push(round(nw));

    if (y < residenceYears) {
      // Grow liquid, then pay interest
      liquid = liquid * (1 + investmentReturnRate) - annualInterest;
    }
  }

  return netWorthByYear;
}

function simulateMonthly(input: SimulationInput): number[] {
  const {
    monthlyDeposit,
    monthlyRent,
    monthlyRentIncreaseRate,
    initialAsset,
    investmentReturnRate,
    residenceYears,
  } = input;

  let liquid = initialAsset - monthlyDeposit;

  const netWorthByYear: number[] = [];

  for (let y = 0; y <= residenceYears; y++) {
    // Net worth = liquid + deposit
    const nw = liquid + monthlyDeposit;
    netWorthByYear.push(round(nw));

    if (y < residenceYears) {
      // Annual rent for year y (year index starts at 0)
      const annualRent = monthlyRent * 12 * Math.pow(1 + monthlyRentIncreaseRate, y);
      liquid = liquid * (1 + investmentReturnRate) - annualRent;
    }
  }

  return netWorthByYear;
}

function simulateBuy(input: SimulationInput): number[] {
  const {
    buyPrice,
    buyEquity,
    buyLoanRate,
    buyLoanPeriodYears,
    initialAsset,
    investmentReturnRate,
    housePriceGrowthRate,
    residenceYears,
  } = input;

  const loanPrincipal = buyPrice - buyEquity;
  const monthlyRate = buyLoanRate / 12;
  const totalMonths = buyLoanPeriodYears * 12;
  const pmt = computePMT(loanPrincipal, monthlyRate, totalMonths);
  const annualPayment = pmt * 12;

  let liquid = initialAsset - buyEquity;

  const netWorthByYear: number[] = [];

  for (let y = 0; y <= residenceYears; y++) {
    const houseValue = buyPrice * Math.pow(1 + housePriceGrowthRate, y);
    const loanBalance = loanBalanceAfterYears(loanPrincipal, monthlyRate, totalMonths, y);
    const nw = liquid + houseValue - loanBalance;
    netWorthByYear.push(round(nw));

    if (y < residenceYears) {
      // Annual mortgage payment (capped to actual remaining balance to avoid over-deduction)
      const effectivePayment = loanBalance > 0 ? Math.min(annualPayment, loanBalance * (1 + buyLoanRate)) : 0;
      liquid = liquid * (1 + investmentReturnRate) - effectivePayment;
    }
  }

  return netWorthByYear;
}

function buildInsightCopy(
  recommendedOption: OptionKey,
  diffFromBest: Record<OptionKey, number>,
): string {
  const labels: Record<OptionKey, string> = {
    jeonse: "전세",
    monthly: "월세",
    buy: "매매",
  };

  const label = labels[recommendedOption];

  // Find second best diff for comparison copy
  const options: OptionKey[] = ["jeonse", "monthly", "buy"];
  const secondBestOption = options
    .filter((o) => o !== recommendedOption)
    .sort((a, b) => diffFromBest[a] - diffFromBest[b])[0];

  const diffWon = Math.abs(diffFromBest[secondBestOption]);
  const diffManwon = Math.round(diffWon / 10_000);

  if (diffManwon > 0) {
    return `${label}가 ${labels[secondBestOption]}보다 약 ${diffManwon.toLocaleString()}만원 유리해요`;
  }
  return `${label}가 가장 유리한 선택이에요`;
}

export function simulate(input: SimulationInput): SimulateResult {
  try {
    const validation = validateSimulationInput(input);
    if (!validation.ok) {
      return { ok: false, code: validation.code, message: validation.message };
    }

    const jeonseYears = simulateJeonse(input);
    const monthlyYears = simulateMonthly(input);
    const buyYears = simulateBuy(input);

    const finalNetWorth: Record<OptionKey, number> = {
      jeonse: jeonseYears[jeonseYears.length - 1],
      monthly: monthlyYears[monthlyYears.length - 1],
      buy: buyYears[buyYears.length - 1],
    };

    const maxNetWorth = Math.max(
      finalNetWorth.jeonse,
      finalNetWorth.monthly,
      finalNetWorth.buy,
    );

    const options: OptionKey[] = ["jeonse", "monthly", "buy"];
    const recommendedOption: OptionKey =
      options.find((o) => finalNetWorth[o] === maxNetWorth) ?? "jeonse";

    const diffFromBest: Record<OptionKey, number> = {
      jeonse: round(maxNetWorth - finalNetWorth.jeonse),
      monthly: round(maxNetWorth - finalNetWorth.monthly),
      buy: round(maxNetWorth - finalNetWorth.buy),
    };

    const costBreakdown: Record<OptionKey, CostBreakdownMap> = {
      jeonse: {
        loanRepayment: round(
          input.jeonseDeposit * input.jeonseLoanRatio * input.jeonseInterestRate * input.residenceYears,
        ),
        deposit: round(input.jeonseDeposit),
      },
      monthly: {
        rent: round(
          input.monthlyRent *
            12 *
            ((Math.pow(1 + input.monthlyRentIncreaseRate, input.residenceYears) - 1) /
              (input.monthlyRentIncreaseRate > 0 ? input.monthlyRentIncreaseRate : 1)),
        ),
        deposit: round(input.monthlyDeposit),
      },
      buy: {
        loanRepayment: round(
          computePMT(
            input.buyPrice - input.buyEquity,
            input.buyLoanRate / 12,
            input.buyLoanPeriodYears * 12,
          ) *
            12 *
            Math.min(input.residenceYears, input.buyLoanPeriodYears),
        ),
        deposit: round(input.buyEquity),
      },
    };

    const insightCopy = buildInsightCopy(recommendedOption, diffFromBest);

    const now = Date.now();
    const result: SimulationResult = {
      id: createUuid(),
      netWorthByYear: {
        jeonse: jeonseYears,
        monthly: monthlyYears,
        buy: buyYears,
      },
      finalNetWorth,
      recommendedOption,
      diffFromBest,
      insightCopy,
      costBreakdown,
      createdAt: now,
      updatedAt: now,
    };

    return { ok: true, data: result };
  } catch (err) {
    console.error("[simulate] unexpected error", err);
    return { ok: false, code: "UNKNOWN", message: "시뮬레이션 중 오류가 발생했어요" };
  }
}
