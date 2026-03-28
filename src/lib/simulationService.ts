import type {
  SimulationInput,
  SimulationResult,
  SimulationService,
  OptionResult,
  OptionType,
  CostBreakdownRow,
  Result,
} from '@/lib/types';
import { validationService } from '@/lib/validationService';
import { generateUUID } from '@/lib/uuid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n);
}

function computeAnnuityPayment(principal: number, rate: number, periods: number): number {
  if (rate === 0) return principal / periods;
  return (principal * rate) / (1 - Math.pow(1 + rate, -periods));
}

// ─── Option Calculators ───────────────────────────────────────────────────────

function computeJeonse(
  input: SimulationInput
): { netWorthByYear: number[]; totalCost: number } {
  const {
    jeonseDepositKRW: deposit,
    jeonseLoanRatio: loanRatio,
    jeonseLoanRateAPR: loanRate,
    initialAssetKRW: initialAsset,
    stayPeriodYears,
    investmentReturnRateAnnual: invRate,
  } = input;

  const loanAmount = deposit * loanRatio;
  const selfPaid = deposit * (1 - loanRatio);
  const annualInterest = loanAmount * loanRate;

  // portfolio = free investable cash after paying the deposit's self-funded portion
  let portfolio = initialAsset - selfPaid;
  // netWorth[0] = portfolio + locked_deposit - loan_liability = initialAsset
  const netWorthByYear: number[] = [portfolio + deposit - loanAmount];

  for (let y = 1; y <= stayPeriodYears; y++) {
    portfolio = portfolio * (1 + invRate) - annualInterest;
    netWorthByYear.push(portfolio + deposit - loanAmount);
  }

  return { netWorthByYear, totalCost: annualInterest * stayPeriodYears };
}

function computeMonthly(
  input: SimulationInput
): { netWorthByYear: number[]; totalCost: number } {
  const {
    monthlyDepositKRW: deposit,
    monthlyRentKRW: monthlyRent,
    monthlyRentIncreaseRateAnnual: rentIncrRate,
    initialAssetKRW: initialAsset,
    stayPeriodYears,
    investmentReturnRateAnnual: invRate,
  } = input;

  let portfolio = initialAsset - deposit;
  // netWorth[0] = portfolio + locked_deposit = initialAsset
  const netWorthByYear: number[] = [portfolio + deposit];

  let totalRent = 0;
  for (let y = 1; y <= stayPeriodYears; y++) {
    // Rent for year y (0-indexed: first year has no increase)
    const annualRent = monthlyRent * 12 * Math.pow(1 + rentIncrRate, y - 1);
    portfolio = portfolio * (1 + invRate) - annualRent;
    totalRent += annualRent;
    netWorthByYear.push(portfolio + deposit);
  }

  return { netWorthByYear, totalCost: totalRent };
}

function computeBuy(
  input: SimulationInput
): { netWorthByYear: number[]; totalCost: number } {
  const {
    buyPriceKRW: price,
    buyEquityKRW: equity,
    buyLoanRateAPR: rate,
    buyLoanPeriodYears: loanPeriod,
    buyRepaymentType: repayType,
    initialAssetKRW: initialAsset,
    stayPeriodYears,
    investmentReturnRateAnnual: invRate,
    housePriceGrowthRateAnnual: houseGrowthRate,
  } = input;

  const loanAmount = price - equity;
  let portfolio = initialAsset - equity;
  let remainingLoan = loanAmount;
  let totalInterest = 0;

  // netWorth[0] = portfolio + house_value - loan = initialAsset
  const netWorthByYear: number[] = [portfolio + price - remainingLoan];

  const annuityPayment =
    repayType === '원리금균등'
      ? computeAnnuityPayment(loanAmount, rate, loanPeriod)
      : 0;

  const principalPerYear = loanAmount / loanPeriod;

  for (let y = 1; y <= stayPeriodYears; y++) {
    const houseValue = price * Math.pow(1 + houseGrowthRate, y);
    let annualPayment = 0;

    if (remainingLoan > 0 && y <= loanPeriod) {
      if (repayType === '원리금균등') {
        const interest = remainingLoan * rate;
        totalInterest += interest;
        annualPayment = annuityPayment;
        remainingLoan = Math.max(0, remainingLoan * (1 + rate) - annuityPayment);
      } else if (repayType === '원금균등') {
        const interest = remainingLoan * rate;
        totalInterest += interest;
        annualPayment = principalPerYear + interest;
        remainingLoan = Math.max(0, remainingLoan - principalPerYear);
      } else {
        // '만기일시': interest-only; repay principal on final year
        const interest = remainingLoan * rate;
        totalInterest += interest;
        if (y === loanPeriod) {
          annualPayment = remainingLoan + interest;
          remainingLoan = 0;
        } else {
          annualPayment = interest;
        }
      }
    } else if (y > loanPeriod) {
      remainingLoan = 0;
    }

    portfolio = portfolio * (1 + invRate) - annualPayment;
    netWorthByYear.push(portfolio + houseValue - remainingLoan);
  }

  return { netWorthByYear, totalCost: totalInterest };
}

// ─── Service ──────────────────────────────────────────────────────────────────

const OPTION_NAMES: Record<OptionType, string> = {
  JEONSE: '전세',
  MONTHLY: '월세',
  BUY: '매매',
};

export const simulationService: SimulationService = {
  calculate(
    input: SimulationInput
  ): Result<SimulationResult, { code: 'INVALID_INPUT' | 'CALC_ERROR' }> {
    const validation = validationService.validate(input);
    if (!validation.ok) {
      return { ok: false, error: { code: 'INVALID_INPUT' } };
    }
    const v = validation.value;

    try {
      const now = Date.now();

      const jeonseCalc = computeJeonse(v);
      const monthlyCalc = computeMonthly(v);
      const buyCalc = computeBuy(v);

      // Guard against NaN / Infinity in any computed value
      const allValues = [
        ...jeonseCalc.netWorthByYear,
        ...monthlyCalc.netWorthByYear,
        ...buyCalc.netWorthByYear,
        jeonseCalc.totalCost,
        monthlyCalc.totalCost,
        buyCalc.totalCost,
      ];
      if (!allValues.every(isFiniteNumber)) {
        return { ok: false, error: { code: 'CALC_ERROR' } };
      }

      // Fixed order: JEONSE → MONTHLY → BUY
      const results: OptionResult[] = [
        {
          id: generateUUID(),
          option: 'JEONSE',
          netWorthByYearKRW: jeonseCalc.netWorthByYear,
          finalNetWorthKRW: jeonseCalc.netWorthByYear[v.stayPeriodYears],
          totalCostKRW: jeonseCalc.totalCost,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: generateUUID(),
          option: 'MONTHLY',
          netWorthByYearKRW: monthlyCalc.netWorthByYear,
          finalNetWorthKRW: monthlyCalc.netWorthByYear[v.stayPeriodYears],
          totalCostKRW: monthlyCalc.totalCost,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: generateUUID(),
          option: 'BUY',
          netWorthByYearKRW: buyCalc.netWorthByYear,
          finalNetWorthKRW: buyCalc.netWorthByYear[v.stayPeriodYears],
          totalCostKRW: buyCalc.totalCost,
          createdAt: now,
          updatedAt: now,
        },
      ];

      // Determine best option
      const sorted = [...results].sort((a, b) => b.finalNetWorthKRW - a.finalNetWorthKRW);
      const best = sorted[0];
      const secondBest = sorted[1];
      const delta = best.finalNetWorthKRW - secondBest.finalNetWorthKRW;

      const deltaManwon = Math.round(Math.abs(delta) / 10000).toLocaleString('ko-KR');
      const insightCopy = `${OPTION_NAMES[best.option]}이 ${v.stayPeriodYears}년 거주 시 가장 유리해요. 2위 대비 약 ${deltaManwon}만원 앞서요.`;

      const costBreakdownRows: CostBreakdownRow[] = [
        {
          id: generateUUID(),
          label: '전세 대출 이자',
          valueKRW: jeonseCalc.totalCost,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: generateUUID(),
          label: '월세 납입 총액',
          valueKRW: monthlyCalc.totalCost,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: generateUUID(),
          label: '주택담보대출 이자',
          valueKRW: buyCalc.totalCost,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result: SimulationResult = {
        id: generateUUID(),
        stayPeriodYears: v.stayPeriodYears,
        results,
        recommendedOption: best.option,
        deltaToSecondBestKRW: delta,
        insightCopy,
        costBreakdownRows,
        createdAt: now,
        updatedAt: now,
      };

      return { ok: true, value: result };
    } catch {
      return { ok: false, error: { code: 'CALC_ERROR' } };
    }
  },

  createInsight(
    input: SimulationInput
  ): Result<string, { code: 'INVALID_INPUT' | 'CALC_ERROR' }> {
    const calcResult = simulationService.calculate(input);
    if (!calcResult.ok) return calcResult;
    return { ok: true, value: calcResult.value.insightCopy };
  },
};
