import type {
  SimulationInput,
  SimulationResult,
  RecommendedOption,
  NetWorthPoint,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Capital locked in housing (deposit / equity) that reduces investable cash. */
function clampedInvestable(initialAsset: number, capitalLocked: number): number {
  return Math.max(0, initialAsset - capitalLocked);
}

/**
 * Remaining loan balance after `paidMonths` payments.
 * Returns 0 if loan is paid off or totalLoan is 0.
 */
function calcRemainingLoan(
  totalLoan: number,
  monthlyRate: number,
  totalMonths: number,
  paidMonths: number,
  repaymentType: 'equal_payment' | 'equal_principal',
): number {
  if (totalLoan <= 0 || paidMonths >= totalMonths) return 0;

  if (repaymentType === 'equal_principal') {
    const monthlyPrincipal = totalLoan / totalMonths;
    return Math.max(0, totalLoan - monthlyPrincipal * paidMonths);
  }

  // equal_payment
  if (monthlyRate === 0) {
    return Math.max(0, totalLoan * (1 - paidMonths / totalMonths));
  }

  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const factorK = Math.pow(1 + monthlyRate, paidMonths);
  return Math.max(0, (totalLoan * (factor - factorK)) / (factor - 1));
}

// ---------------------------------------------------------------------------
// Net-worth series builders
// Model: housing costs (interest / rent / mortgage) come from external income.
// Only the capital locked in deposits / equity reduces investable cash.
// If locked capital exceeds initialAsset the investable amount is clamped to 0.
// ---------------------------------------------------------------------------

function jeonseWorthSeries(input: SimulationInput): number[] {
  const { jeonseDeposit, jeonseLoanRatio, initialAsset, residencePeriodYears, investmentReturnRate } =
    input;
  const ownPortion = jeonseDeposit * (1 - jeonseLoanRatio);
  const borrowedPortion = jeonseDeposit * jeonseLoanRatio;
  const effectiveEquity = Math.min(initialAsset, ownPortion);
  const investable = clampedInvestable(initialAsset, effectiveEquity) + borrowedPortion;

  const series: number[] = [];
  for (let t = 0; t <= residencePeriodYears; t++) {
    const nw = investable * Math.pow(1 + investmentReturnRate, t) + effectiveEquity;
    series.push(Math.round(nw));
  }
  return series;
}

function monthlyWorthSeries(input: SimulationInput): number[] {
  const { monthlyDeposit, initialAsset, residencePeriodYears, investmentReturnRate } = input;
  const effectiveDeposit = Math.min(initialAsset, monthlyDeposit);
  const investable = clampedInvestable(initialAsset, monthlyDeposit);

  const series: number[] = [];
  for (let t = 0; t <= residencePeriodYears; t++) {
    const nw = investable * Math.pow(1 + investmentReturnRate, t) + effectiveDeposit;
    series.push(Math.round(nw));
  }
  return series;
}

function buyWorthSeries(input: SimulationInput): number[] {
  const {
    buyPrice,
    buyEquity,
    buyLoanInterestRate,
    buyLoanPeriodYears,
    buyRepaymentType,
    initialAsset,
    residencePeriodYears,
    investmentReturnRate,
    housePriceGrowthRate,
  } = input;

  const effectiveBuyEquity = Math.min(initialAsset, buyEquity);
  const totalLoan = Math.max(0, buyPrice - effectiveBuyEquity);
  const monthlyRate = buyLoanInterestRate / 12;
  const totalMonths = buyLoanPeriodYears * 12;
  const investable = clampedInvestable(initialAsset, effectiveBuyEquity);

  const series: number[] = [];
  for (let t = 0; t <= residencePeriodYears; t++) {
    const investedCash = investable * Math.pow(1 + investmentReturnRate, t);
    const houseValue = buyPrice * Math.pow(1 + housePriceGrowthRate, t);
    const paidMonths = Math.min(t * 12, totalMonths);
    const remainingLoan = calcRemainingLoan(
      totalLoan,
      monthlyRate,
      totalMonths,
      paidMonths,
      buyRepaymentType,
    );
    const nw = investedCash + houseValue - remainingLoan;
    series.push(Math.round(nw));
  }
  return series;
}

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

function pickBest(jeonse: number, monthly: number, buy: number): RecommendedOption {
  // Tie-break priority: jeonse > monthly > buy
  if (jeonse >= monthly && jeonse >= buy) return 'jeonse';
  if (monthly > jeonse && monthly >= buy) return 'monthly';
  return 'buy';
}

// ---------------------------------------------------------------------------
// Insight copy  (sensitivity: house-price growth +1 %p)
// ---------------------------------------------------------------------------

const OPTION_LABEL: Record<RecommendedOption, string> = {
  jeonse: '전세',
  monthly: '월세',
  buy: '매매',
};

function computeInsightCopy(input: SimulationInput): string {
  const sensitized: SimulationInput = {
    ...input,
    housePriceGrowthRate: input.housePriceGrowthRate + 0.01,
  };

  const N = input.residencePeriodYears;
  const jFinal = jeonseWorthSeries(sensitized)[N];
  const mFinal = monthlyWorthSeries(sensitized)[N];
  const bFinal = buyWorthSeries(sensitized)[N];

  // Sort descending; tie-break: jeonse > monthly > buy
  const ORDER: Record<RecommendedOption, number> = { jeonse: 0, monthly: 1, buy: 2 };
  const ranked = (
    [
      { key: 'jeonse' as RecommendedOption, value: jFinal },
      { key: 'monthly' as RecommendedOption, value: mFinal },
      { key: 'buy' as RecommendedOption, value: bFinal },
    ] as Array<{ key: RecommendedOption; value: number }>
  ).sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return ORDER[a.key] - ORDER[b.key];
  });

  const best = ranked[0];
  const second = ranked[1];
  const diff = Math.round(Math.abs(best.value - second.value));

  return `+1%p 집값상승 시: ${OPTION_LABEL[best.key]} 1위, 2위와 차이 ${diff}원`;
}

// ---------------------------------------------------------------------------
// Cost breakdown
// ---------------------------------------------------------------------------

function computeCostBreakdown(input: SimulationInput): SimulationResult['costBreakdown'] {
  const {
    jeonseDeposit,
    jeonseLoanRatio,
    jeonseInterestRate,
    residencePeriodYears,
    monthlyDeposit,
    monthlyRent,
    monthlyRentIncreaseRate,
    buyPrice,
    buyEquity,
    buyLoanInterestRate,
    buyLoanPeriodYears,
    buyRepaymentType,
  } = input;

  // Jeonse
  const jLoanAmount = jeonseDeposit * jeonseLoanRatio;
  const jOwnPortion = jeonseDeposit - jLoanAmount;
  const jTotalInterest = jLoanAmount * jeonseInterestRate * residencePeriodYears;

  // Monthly
  let mTotalRent = 0;
  let annualRent = monthlyRent * 12;
  for (let t = 0; t < residencePeriodYears; t++) {
    mTotalRent += annualRent;
    annualRent = annualRent * (1 + monthlyRentIncreaseRate);
  }

  // Buy — total interest over the full loan period
  const bLoan = Math.max(0, buyPrice - buyEquity);
  const bMonthlyRate = buyLoanInterestRate / 12;
  const bTotalMonths = buyLoanPeriodYears * 12;
  let bTotalInterest = 0;

  if (bLoan > 0) {
    if (buyRepaymentType === 'equal_payment') {
      if (bMonthlyRate > 0) {
        const factor = Math.pow(1 + bMonthlyRate, bTotalMonths);
        const monthlyPayment = (bLoan * bMonthlyRate * factor) / (factor - 1);
        bTotalInterest = monthlyPayment * bTotalMonths - bLoan;
      }
    } else {
      // equal_principal: interest = sum of monthly interest
      const monthlyPrincipal = bLoan / bTotalMonths;
      for (let m = 1; m <= bTotalMonths; m++) {
        const outstanding = Math.max(0, bLoan - monthlyPrincipal * (m - 1));
        bTotalInterest += outstanding * bMonthlyRate;
      }
    }
  }

  return {
    jeonse: {
      deposit: jeonseDeposit,
      ownPortion: Math.round(jOwnPortion),
      loanAmount: Math.round(jLoanAmount),
      totalInterest: Math.round(jTotalInterest),
    },
    monthly: {
      deposit: monthlyDeposit,
      totalRent: Math.round(mTotalRent),
    },
    buy: {
      price: buyPrice,
      equity: buyEquity,
      loanAmount: Math.round(bLoan),
      totalInterest: Math.round(bTotalInterest),
    },
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function runSimulation(input: SimulationInput): SimulationResult {
  if (
    input.buyRepaymentType !== 'equal_payment' &&
    input.buyRepaymentType !== 'equal_principal'
  ) {
    throw new Error('지원하지 않는 상환방식입니다');
  }

  const N = input.residencePeriodYears;
  const jSeries = jeonseWorthSeries(input);
  const mSeries = monthlyWorthSeries(input);
  const bSeries = buyWorthSeries(input);

  const netWorthSeries: NetWorthPoint[] = [];
  for (let t = 0; t <= N; t++) {
    netWorthSeries.push({
      year: t,
      jeonse: jSeries[t],
      monthly: mSeries[t],
      buy: bSeries[t],
    });
  }

  const finalNetWorth = {
    jeonse: jSeries[N],
    monthly: mSeries[N],
    buy: bSeries[N],
  };

  const recommendedOption = pickBest(finalNetWorth.jeonse, finalNetWorth.monthly, finalNetWorth.buy);
  const insightCopy = computeInsightCopy(input);
  const costBreakdown = computeCostBreakdown(input);

  return {
    netWorthSeries,
    finalNetWorth,
    recommendedOption,
    insightCopy,
    costBreakdown,
  };
}
