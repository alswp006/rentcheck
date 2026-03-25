import { describe, it, expect } from "vitest";
import type {
  BuyRepaymentType,
  OptionKey,
  SimulationInput,
  PresetScenario,
  SimulationResult,
  HistoryEntry,
  SharePayload,
  AppSettings,
  Entitlement,
  StorageErrorCode,
  StorageResult,
  ListHistoryParams,
  HistoryListResponse,
  StorageAdapter,
  TossUser,
  TossAuthErrorCode,
  TossAuthResult,
  TossLoginAdapter,
  PaymentRequest,
  PaymentFailCode,
  PaymentSuccess,
  PaymentResult,
  TossPaymentAdapter,
  RewardAdFailCode,
  RewardAdResult,
} from "@/lib/types";

describe("types.ts — runtime-free contract checks", () => {
  it("StorageResult ok:true carries data", () => {
    const result: StorageResult<number> = { ok: true, data: 42 };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(42);
    }
  });

  it("StorageResult ok:false carries code and message", () => {
    const result: StorageResult<number> = { ok: false, code: "NOT_FOUND", message: "없음" };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_FOUND");
      expect(result.message).toBe("없음");
    }
  });

  it("PaymentResult status:success carries paymentKey and approvedAt", () => {
    const success: PaymentSuccess = { paymentKey: "pk_test_123", approvedAt: Date.now() };
    const result: PaymentResult = { status: "success", data: success };
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.paymentKey).toBe("pk_test_123");
    }
  });

  it("RewardAdResult ok:true carries rewardedAt timestamp", () => {
    const now = Date.now();
    const result: RewardAdResult = { ok: true, rewardedAt: now };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rewardedAt).toBe(now);
    }
  });

  it("TossAuthResult ok:false carries error code and message", () => {
    const result: TossAuthResult = { ok: false, code: "USER_CANCELLED", message: "취소됨" };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("USER_CANCELLED");
    }
  });
});

// Compile-time shape assertions — TS errors here mean types diverged from spec
void ("AMORTIZED" satisfies BuyRepaymentType);
void ("jeonse" satisfies OptionKey);
void ("QUOTA_EXCEEDED" satisfies StorageErrorCode);
void ("NETWORK_ERROR" satisfies TossAuthErrorCode);
void ("CANCELLED" satisfies PaymentFailCode);
void ("AD_NOT_AVAILABLE" satisfies RewardAdFailCode);
void ({ page: 1, pageSize: 5 } satisfies ListHistoryParams);
void ({ orderId: "order-1", orderName: "RentCheck 프리미엄", amount: 9900 } satisfies PaymentRequest);
void ({ userId: "user-1" } satisfies TossUser);

export {};
