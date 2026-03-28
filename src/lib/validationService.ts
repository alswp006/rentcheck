import type {
  SimulationInput,
  SimulationValidationService,
  FieldErrors,
  Result,
  BuyRepaymentType,
} from '@/lib/types';
import { generateUUID } from '@/lib/uuid';

const VALID_REPAYMENT_TYPES: BuyRepaymentType[] = ['원리금균등', '원금균등', '만기일시'];

function toNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function toRepaymentType(v: unknown): BuyRepaymentType {
  if (VALID_REPAYMENT_TYPES.includes(v as BuyRepaymentType)) {
    return v as BuyRepaymentType;
  }
  return '원리금균등';
}

export const validationService: SimulationValidationService = {
  validate(
    input: unknown
  ): Result<SimulationInput, { code: 'INVALID_INPUT'; fieldErrors: FieldErrors }> {
    const raw = (input != null && typeof input === 'object' ? input : {}) as Record<
      string,
      unknown
    >;

    const now = Date.now();

    // Meta fields — always normalized, never in fieldErrors
    const id = toStr(raw['id'], generateUUID());
    const createdAt = typeof raw['createdAt'] === 'number' ? raw['createdAt'] : now;
    const updatedAt = typeof raw['updatedAt'] === 'number' ? raw['updatedAt'] : now;

    // User fields — coerce with defaults
    const presetId =
      raw['presetId'] === null || typeof raw['presetId'] === 'string'
        ? (raw['presetId'] as string | null)
        : null;

    const jeonseDepositKRW = toNum(raw['jeonseDepositKRW'], 0);
    const jeonseLoanRatio = toNum(raw['jeonseLoanRatio'], 0.8);
    const jeonseLoanRateAPR = toNum(raw['jeonseLoanRateAPR'], 0);
    const monthlyDepositKRW = toNum(raw['monthlyDepositKRW'], 0);
    const monthlyRentKRW = toNum(raw['monthlyRentKRW'], 0);
    const monthlyRentIncreaseRateAnnual = toNum(raw['monthlyRentIncreaseRateAnnual'], 0);
    const buyPriceKRW = toNum(raw['buyPriceKRW'], 0);
    const buyEquityKRW = toNum(raw['buyEquityKRW'], 0);
    const buyLoanRateAPR = toNum(raw['buyLoanRateAPR'], 0);
    const buyLoanPeriodYears = toNum(raw['buyLoanPeriodYears'], 1);
    const buyRepaymentType = toRepaymentType(raw['buyRepaymentType']);
    const initialAssetKRW = toNum(raw['initialAssetKRW'], 0);
    const stayPeriodYears = toNum(raw['stayPeriodYears'], 0);
    const investmentReturnRateAnnual = toNum(raw['investmentReturnRateAnnual'], 0);
    const housePriceGrowthRateAnnual = toNum(raw['housePriceGrowthRateAnnual'], 0);

    const fieldErrors: FieldErrors = {};

    // stayPeriodYears: 1~30
    if (!Number.isInteger(stayPeriodYears) || stayPeriodYears < 1 || stayPeriodYears > 30) {
      fieldErrors.stayPeriodYears = '거주기간은 1~30년만 가능해요';
    }

    // buyEquityKRW must not exceed buyPriceKRW
    if (buyEquityKRW > buyPriceKRW) {
      fieldErrors.buyEquityKRW = '자기자본은 매매가 이하여야 해요';
    }

    // jeonseLoanRatio: 0~1
    if (jeonseLoanRatio < 0 || jeonseLoanRatio > 1) {
      fieldErrors.jeonseLoanRatio = '전세 대출 비율은 0~100% 사이여야 해요';
    }

    // buyLoanPeriodYears: 1~50
    if (!Number.isInteger(buyLoanPeriodYears) || buyLoanPeriodYears < 1 || buyLoanPeriodYears > 50) {
      fieldErrors.buyLoanPeriodYears = '대출 기간은 1~50년 사이여야 해요';
    }

    // Amounts must be non-negative
    if (jeonseDepositKRW < 0) fieldErrors.jeonseDepositKRW = '금액은 0원 이상이어야 해요';
    if (monthlyDepositKRW < 0) fieldErrors.monthlyDepositKRW = '금액은 0원 이상이어야 해요';
    if (monthlyRentKRW < 0) fieldErrors.monthlyRentKRW = '금액은 0원 이상이어야 해요';
    if (buyPriceKRW < 0) fieldErrors.buyPriceKRW = '금액은 0원 이상이어야 해요';
    if (buyEquityKRW < 0) fieldErrors.buyEquityKRW = '금액은 0원 이상이어야 해요';
    if (initialAssetKRW < 0) fieldErrors.initialAssetKRW = '금액은 0원 이상이어야 해요';

    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, error: { code: 'INVALID_INPUT', fieldErrors } };
    }

    const normalized: SimulationInput = {
      id,
      createdAt,
      updatedAt,
      presetId,
      jeonseDepositKRW,
      jeonseLoanRatio,
      jeonseLoanRateAPR,
      monthlyDepositKRW,
      monthlyRentKRW,
      monthlyRentIncreaseRateAnnual,
      buyPriceKRW,
      buyEquityKRW,
      buyLoanRateAPR,
      buyLoanPeriodYears,
      buyRepaymentType,
      initialAssetKRW,
      stayPeriodYears,
      investmentReturnRateAnnual,
      housePriceGrowthRateAnnual,
    };

    return { ok: true, value: normalized };
  },
};
