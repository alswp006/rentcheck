import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { HistoryEntry, SimulationInput } from "@/lib/types";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement("button", { onClick, ...props }, children),
  ListRow: Object.assign(
    ({ children, onClick, ...props }: any) =>
      React.createElement("div", { role: "listitem", onClick, ...props }, children),
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
        ? React.createElement("div", { role: "alertdialog" }, title, description, alertButton)
        : null,
    {
      AlertButton: ({ children, onClick }: any) =>
        React.createElement("button", { onClick }, children),
    }
  ),
  Toast: ({ open, text }: any) =>
    open ? React.createElement("div", { role: "status" }, text) : null,
  Top: Object.assign(
    ({ children }: any) => React.createElement("nav", null, children),
    { TitleParagraph: ({ children }: any) => React.createElement("h1", null, children) }
  ),
  Border: () => React.createElement("hr"),
  BottomCTA: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@apps-in-toss/framework", () => ({
  generateHapticFeedback: vi.fn(),
}));

// Storage mock — controlled per test
const mockReadHistory = vi.fn();
const mockDeleteAllHistory = vi.fn();

vi.mock("@/lib/storage/history", () => ({
  readHistory: (...args: any[]) => mockReadHistory(...args),
  deleteAllHistory: (...args: any[]) => mockDeleteAllHistory(...args),
}));

// Toss login mock
vi.mock("@/hooks/useTossLogin", () => ({
  useTossLogin: () => ({ userId: "test-user-123", isLoading: false }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockInput: SimulationInput = {
  presetId: null,
  jeonseDeposit: 300_000_000,
  jeonseLoanRatio: 0.5,
  jeonseInterestRate: 0.035,
  monthlyDeposit: 50_000_000,
  monthlyRent: 800_000,
  monthlyRentIncreaseRate: 0.03,
  buyPrice: 500_000_000,
  buyEquity: 100_000_000,
  buyLoanInterestRate: 0.04,
  buyLoanPeriodYears: 30,
  buyRepaymentType: "equal_payment",
  initialAsset: 100_000_000,
  residencePeriodYears: 5,
  investmentReturnRate: 0.05,
  housePriceGrowthRate: 0.03,
};

function makeEntry(id: string, label: string, createdAt: number): HistoryEntry {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    label,
    input: mockInput,
    result: {
      netWorthSeries: [],
      finalNetWorth: { jeonse: 0, monthly: 0, buy: 0 },
      recommendedOption: "jeonse",
      insightCopy: "test insight",
      costBreakdown: { jeonse: {}, monthly: {}, buy: {} },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("S4 히스토리 페이지(`/history`) — 목록/재열람/전체삭제", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAllHistory.mockReturnValue({ ok: true });
  });

  it("AC-1: 진입 시 readHistory(tossUserId)를 호출한다", () => {
    mockReadHistory.mockReturnValue({ ok: true, value: [] });

    const { default: HistoryPage } = require("../pages/HistoryPage");
    render(
      React.createElement(MemoryRouter, null, React.createElement(HistoryPage))
    );

    expect(mockReadHistory).toHaveBeenCalledWith("test-user-123");
  });

  it("AC-2: 빈 배열이면 빈 상태 UI가 표시되고 ListRow가 0개다 (SC2-AC-1)", () => {
    mockReadHistory.mockReturnValue({ ok: true, value: [] });

    const { default: HistoryPage } = require("../pages/HistoryPage");
    render(
      React.createElement(MemoryRouter, null, React.createElement(HistoryPage))
    );

    // ListRow (listitem) 0개
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    // 에러 문구 없음
    expect(screen.queryByText("히스토리를 불러올 수 없어요")).toBeNull();
    // 빈 상태 UI — 안내 문구 존재
    const pageText = document.body.textContent ?? "";
    // Should show some empty-state UI text (icon + description + CTA)
    expect(pageText.length).toBeGreaterThan(0);
  });

  it("AC-3: STORAGE_PARSE_ERROR면 '히스토리를 불러올 수 없어요' 표시, ListRow 0개", () => {
    mockReadHistory.mockReturnValue({
      ok: false,
      errorCode: "STORAGE_PARSE_ERROR",
      fallback: "EMPTY_ARRAY",
    });

    const { default: HistoryPage } = require("../pages/HistoryPage");
    render(
      React.createElement(MemoryRouter, null, React.createElement(HistoryPage))
    );

    expect(screen.getByText("히스토리를 불러올 수 없어요")).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("AC-4: ListRow 항목 탭 시 navigate('/result', { state: { input, label, source:'history' } })가 호출된다", () => {
    const entry = makeEntry("id-001", "테스트 시나리오", Date.now());
    mockReadHistory.mockReturnValue({ ok: true, value: [entry] });

    const { default: HistoryPage } = require("../pages/HistoryPage");
    render(
      React.createElement(MemoryRouter, null, React.createElement(HistoryPage))
    );

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(1);

    fireEvent.click(listItems[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/result", {
      state: {
        input: entry.input,
        label: entry.label,
        source: "history",
      },
    });
  });

  it("AC-4 (TossRewardAd 없음): 히스토리 항목 탭 시 결과 이동에 리워드게이트가 없다 — navigate가 직접 호출됨", () => {
    const entry = makeEntry("id-002", "재열람 시나리오", Date.now());
    mockReadHistory.mockReturnValue({ ok: true, value: [entry] });

    const { default: HistoryPage } = require("../pages/HistoryPage");
    render(
      React.createElement(MemoryRouter, null, React.createElement(HistoryPage))
    );

    fireEvent.click(screen.getAllByRole("listitem")[0]);

    // navigate가 즉시(동기적으로) 호출되어야 함 — 리워드 광고 게이트 없음
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", expect.objectContaining({
      state: expect.objectContaining({ source: "history" }),
    }));
  });

  it("AC-5: 전체 삭제 실행 후 리스트가 0개로 갱신되고 deleteAllHistory가 호출된다", () => {
    const entries = [
      makeEntry("id-a", "시나리오 A", Date.now() - 2000),
      makeEntry("id-b", "시나리오 B", Date.now() - 1000),
    ];
    mockReadHistory.mockReturnValue({ ok: true, value: entries });

    const { default: HistoryPage } = require("../pages/HistoryPage");
    render(
      React.createElement(MemoryRouter, null, React.createElement(HistoryPage))
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    // 전체 삭제 버튼 찾아 클릭
    const deleteBtn = screen.getByRole("button", { name: /전체\s*삭제/ });
    fireEvent.click(deleteBtn);

    expect(mockDeleteAllHistory).toHaveBeenCalledWith("test-user-123");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("AC-5 (readHistory 재호출): 전체 삭제 후 readHistory가 빈 배열을 반환하는 상태와 동일하게 표시된다", () => {
    const entry = makeEntry("id-c", "삭제될 항목", Date.now());
    mockReadHistory
      .mockReturnValueOnce({ ok: true, value: [entry] })
      .mockReturnValue({ ok: true, value: [] });

    const { default: HistoryPage } = require("../pages/HistoryPage");
    render(
      React.createElement(MemoryRouter, null, React.createElement(HistoryPage))
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    const deleteBtn = screen.getByRole("button", { name: /전체\s*삭제/ });
    fireEvent.click(deleteBtn);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    // 에러 없이 빈 상태 표시
    expect(screen.queryByText("히스토리를 불러올 수 없어요")).toBeNull();
  });
});
