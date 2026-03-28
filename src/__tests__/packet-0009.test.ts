import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { SimulationInput } from "@/lib/types";
import { encodeSharePayloadV1 } from "@/lib/share";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
let mockLocationState: unknown = null;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: mockLocationState,
      pathname: "/result",
      search: "",
      hash: "",
    }),
  };
});

vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement("button", { onClick, ...props }, children),
  ListRow: Object.assign(
    ({ children, onClick, ...props }: any) =>
      React.createElement("div", { onClick, ...props }, children),
    {
      Text: ({ children }: any) => React.createElement("span", null, children),
      Texts: ({ top, bottom }: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement("span", null, top),
          React.createElement("span", null, bottom)
        ),
    }
  ),
  Spacing: () => React.createElement("div"),
  Paragraph: {
    Text: ({ children, ...props }: any) =>
      React.createElement("span", props, children),
  },
  Badge: ({ children }: any) => React.createElement("span", null, children),
  AlertDialog: Object.assign(
    ({ open, title, description, alertButton }: any) =>
      open
        ? React.createElement(
            "div",
            { role: "alertdialog" },
            title,
            description,
            alertButton
          )
        : null,
    {
      AlertButton: ({ children, onClick }: any) =>
        React.createElement("button", { onClick }, children),
    }
  ),
  Toast: ({ open, text }: any) =>
    open ? React.createElement("div", { role: "status" }, text) : null,
  Tab: Object.assign(
    ({ children }: any) =>
      React.createElement("div", { role: "tablist" }, children),
    {
      Item: ({ children, selected, onClick }: any) =>
        React.createElement(
          "button",
          { role: "tab", "aria-selected": selected, onClick },
          children
        ),
    }
  ),
  TextField: React.forwardRef(
    ({ label, help, hasError, ...props }: any, ref: any) =>
      React.createElement(
        "div",
        null,
        React.createElement("label", null, label),
        React.createElement("input", { ref, ...props }),
        hasError && help && React.createElement("span", null, help)
      )
  ),
  Top: Object.assign(
    ({ children }: any) => React.createElement("nav", null, children),
    {
      TitleParagraph: ({ children }: any) =>
        React.createElement("h1", null, children),
    }
  ),
  Border: () => React.createElement("hr"),
  BottomCTA: ({ children }: any) =>
    React.createElement("div", null, children),
  BottomSheet: Object.assign(
    ({ children, open }: any) =>
      open
        ? React.createElement("div", { role: "dialog" }, children)
        : null,
    {
      Header: ({ children }: any) =>
        React.createElement("div", null, children),
    }
  ),
}));

vi.mock("@/hooks/useTossLogin", () => ({
  useTossLogin: () => ({ userId: "test-user-123", isLoading: false }),
}));

const mockUpsertHistory = vi.fn();
vi.mock("@/lib/storage/history", () => ({
  upsertHistory: (...args: any[]) => mockUpsertHistory(...args),
  readHistory: vi.fn(() => ({ ok: true, value: [] })),
}));

vi.mock("@/components/AdSlot", () => ({
  AdSlot: (props: any) =>
    React.createElement("div", { "data-testid": "ad-slot", ...props }),
}));

const mockTossRewardAd = vi.fn(({ children }: any) =>
  React.createElement(React.Fragment, null, children)
);
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: (...args: any[]) => mockTossRewardAd(...args),
  default: (...args: any[]) => mockTossRewardAd(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validInput: SimulationInput = {
  presetId: null,
  jeonseDeposit: 300_000_000,
  jeonseLoanRatio: 0.5,
  jeonseInterestRate: 0.03,
  monthlyDeposit: 50_000_000,
  monthlyRent: 800_000,
  monthlyRentIncreaseRate: 0.02,
  buyPrice: 500_000_000,
  buyEquity: 100_000_000,
  buyLoanInterestRate: 0.04,
  buyLoanPeriodYears: 20,
  buyRepaymentType: "equal_payment",
  initialAsset: 150_000_000,
  residencePeriodYears: 5,
  investmentReturnRate: 0.05,
  housePriceGrowthRate: 0.03,
};

// ── Import page (does NOT exist yet — tests will fail in red phase) ────────────

import { ResultPage } from "@/pages/ResultPage";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("S3 결과 페이지(`/result`) — 결과 렌더/히스토리 저장/공유/배너광고", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUpsertHistory.mockClear();
    mockTossRewardAd.mockClear();
    mockLocationState = { input: validInput };
  });

  it("AC-1: TossRewardAd를 렌더링하지 않는다 (진입 경로 무관)", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ResultPage)
      )
    );
    expect(mockTossRewardAd).not.toHaveBeenCalled();
  });

  it("AC-2: validateResultState ok이면 runSimulation 결과(추천 옵션 텍스트)가 화면에 표시된다", () => {
    mockLocationState = { input: validInput };
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ResultPage)
      )
    );
    // runSimulation returns recommendedOption — one of 전세/월세/매매 must appear
    const recommendation = screen.getByText(/전세|월세|매매/);
    expect(recommendation).toBeTruthy();
  });

  it("AC-3: AdSlot 배너가 결과 화면에 정확히 1개 렌더링된다", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ResultPage)
      )
    );
    const adSlots = screen.getAllByTestId("ad-slot");
    expect(adSlots).toHaveLength(1);
  });

  it("AC-4: 히스토리에 저장 버튼 탭 시 upsertHistory가 정확히 1회 호출된다", () => {
    mockUpsertHistory.mockReturnValue({ ok: true });
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ResultPage)
      )
    );
    const saveBtn = screen.getByRole("button", { name: /히스토리에 저장|저장/ });
    fireEvent.click(saveBtn);
    expect(mockUpsertHistory).toHaveBeenCalledTimes(1);
  });

  it("AC-5: STORAGE_QUOTA_EXCEEDED 시 AlertDialog 메시지가 '저장공간이 부족해 히스토리를 저장할 수 없어요'", async () => {
    mockUpsertHistory.mockReturnValue({
      ok: false,
      errorCode: "STORAGE_QUOTA_EXCEEDED",
    });
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ResultPage)
      )
    );
    const saveBtn = screen.getByRole("button", { name: /히스토리에 저장|저장/ });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeTruthy();
    });
    expect(
      screen.getByText("저장공간이 부족해 히스토리를 저장할 수 없어요")
    ).toBeTruthy();
  });

  it("AC-6: STORAGE_UNAVAILABLE 시 AlertDialog 메시지가 '저장소에 접근할 수 없어요. 이 기기에서는 히스토리를 저장할 수 없어요'", async () => {
    mockUpsertHistory.mockReturnValue({
      ok: false,
      errorCode: "STORAGE_UNAVAILABLE",
    });
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ResultPage)
      )
    );
    const saveBtn = screen.getByRole("button", { name: /히스토리에 저장|저장/ });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeTruthy();
    });
    expect(
      screen.getByText(
        "저장소에 접근할 수 없어요. 이 기기에서는 히스토리를 저장할 수 없어요"
      )
    ).toBeTruthy();
  });

  it("AC-7(pure): encodeSharePayloadV1로 /share?v=1&input=... 형식의 URL을 생성한다", () => {
    const encoded = encodeSharePayloadV1(validInput);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(10);
    const shareUrl = `/share?v=1&input=${encoded}`;
    expect(shareUrl).toMatch(/^\/share\?v=1&input=.+/);
  });

  it("AC-7(UI): navigator.share가 있으면 공유 버튼 탭 시 navigator.share({ url: /share?v=1&input=... })를 호출한다", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ResultPage)
      )
    );
    const shareBtn = screen.getByRole("button", { name: /공유/ });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledTimes(1);
    });
    const callArg = mockShare.mock.calls[0][0] as { url: string };
    expect(callArg.url).toMatch(/\/share\?v=1&input=.+/);
  });
});
