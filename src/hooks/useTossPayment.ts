import { useState, useCallback } from 'react';

const isTossApp = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Toss;

interface PaymentRequest {
  /** 상품명 */
  productName: string;
  /** 결제 금액 (원) */
  amount: number;
  /** 주문 ID (고유값) */
  orderId: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export function useTossPayment() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);

  const requestPayment = useCallback(async (req: PaymentRequest): Promise<PaymentResult> => {
    if (!isTossApp) {
      // 개발 환경: 시뮬레이션
      const result: PaymentResult = { success: true, transactionId: `dev-tx-${Date.now()}` };
      setLastResult(result);
      return result;
    }
    setLoading(true);
    try {
      const toss = (window as unknown as Record<string, { requestPayment: (r: PaymentRequest) => Promise<{ transactionId: string }> }>).Toss;
      const res = await toss.requestPayment(req);
      const result: PaymentResult = { success: true, transactionId: res.transactionId };
      setLastResult(result);
      return result;
    } catch (e) {
      const result: PaymentResult = { success: false, error: (e as Error).message };
      setLastResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, lastResult, requestPayment };
}
