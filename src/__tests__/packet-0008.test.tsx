import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { SimulationInput, SimulationResult } from "@/lib/types";

// ─── react-router-dom mock ───────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── TDS mock (crashes in jsdom) ─────────────────────────────────────────────
vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement("button", { onClick, ...props }, children),
  ListRow: Object.assign(
    ({ children, onClick, ...props }: any) =>
      React.createElement("div", { onClick, "data-testid": "list-row", ...props }, children),
    {
      Text: ({ children }: any) => React.createElement("span", null, children),
      Texts: ({ top, bottom }: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement("span", null, top),
          React.createElement("span", null, bottom),
        ),
    },
  ),
  Chip: ({ label, children }: any) =>
    React.createElement("span", { "data-testid": "chip" }, label ?? children),
  Spacing: () => React.createElement("div"),
  Paragraph: {
    Text: ({ children, ...props }: any) => React.createElement("span", props, children),
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
    },
  ),
  Toast: ({ open, text }: any) =>
    open ? React.createElement("div", { role: "status" }, text) : null,
  Tab: Object.assign(
    ({ children }: any) => React.createElement("div", { role: "tablist" }, children),
    {
      Item: ({ children, selected, onClick }: any) =>
        React.createElement("button", { role: "tab", "aria-selected": selected, onClick }, children),
    },
  ),
  TextField: React.forwardRef(({ label, help, hasError, ...props }: any, ref: any) =>
    React.createElement(
      "div",
      null,
      React.createElement("label", null, label),
      React.createElement("input", { ref, ...props }),
      hasError && help && React.createElement("span", null, help),
    ),
  ),
  Top: Object.assign(
    ({ children }: any) => React.createElement("nav", null, children),
    { TitleParagraph: ({ children }: any) => React.createElement("h1", null, children) },
  ),
  Border: () => React.createElement("hr"),
  BottomCTA: ({ children }: any) => React.createElement("div", null, children),
  BottomSheet: Object.assign(
    ({ children, open }: any) =>
      open ? React.createElement("div", { role: "dialog" }, children) : null,
    { Header: ({ children }: any) => React.createElement("div", null, children) },
  ),
}));

// ─── AdSlot mock ──────────────────────────────────────────────────────────────
vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => React.createElement("div", { "data-testid": "ad-slot" }),
}));

// ─── AppState mock ────────────────────────────────────────────────────────────
vi.mock("@/lib/state/useAppState", () => ({
  useAppState: () => ({
    loading: false,
    settings: {},
    entitlement: {},
    input: null,
    applyPreset: vi.fn(),
    updateField: vi.fn(),
    setInput: vi.fn(),
  }),
}));

// ─── simulate mock ────────────────────────────────────────────────────────────
const mockSimulate = vi.fn();
vi.mock("@/lib/simulation/simulate", () => ({
  simulate: (...args: any[]) => mockSimulate(...args),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const baseInput: SimulationInput = {
  id: "test-input-1",
  presetId: null,
  jeonseDeposit: 300_000_000,
  jeonseLoanRatio: 0.5,
  jeonseInterestRate: 0.04,
  monthlyDeposit: 50_000_000,
  monthlyRent: 800_000,
  monthlyRentIncreaseRate: 0.03,
  buyPrice: 500_000_000,
  buyEquity: 150_000_000,
  buyLoanRate: 0.04,
  buyLoanPeriodYears: 30,
  buyRepaymentType: "AMORTIZED",
  initialAsset: 150_000_000,
  residenceYears: 5,
  investmentReturnRate: 0.05,
  housePriceGrowthRate: 0.03,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const okResult: SimulationResult = {
  id: "result-1",
  netWorthByYear: {
    jeonse: [150_000_000, 160_000_000, 170_000_000, 180_000_000, 190_000_000, 200_000_000],
    monthly: [150_000_000, 155_000_000, 160_000_000, 165_000_000, 170_000_000, 175_000_000],
    buy: [150_000_000, 170_000_000, 190_000_000, 210_000_000, 230_000_000, 250_000_000],
  },
  finalNetWorth: { jeonse: 200_000_000, monthly: 175_000_000, buy: 250_000_000 },
  recommendedOption: "buy",
  diffFromBest: { jeonse: -50_000_000, monthly: -75_000_000, buy: 0 },
  insightCopy: "매매가 가장 유리해요.",
  costBreakdown: {
    jeonse: { loanRepayment: 5_000_000, opportunity: 3_000_000 },
    monthly: { rent: 10_000_000, opportunity: 2_000_000 },
    buy: { loanRepayment: 20_000_000 },
  },
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

import ResultPage from "../pages/ResultPage";

function renderWithState(input: SimulationInput) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [{ pathname: "/result", state: { input } }] },
      React.createElement(ResultPage),
    ),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("결과 페이지(/result) 1차: 입력 hydrate + 시뮬레이션 실행 + 요약 UI", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSimulate.mockClear();
  });

  it("AC-1: location.state의 SimulationInput으로 simulate를 1회 호출한다", () => {
    mockSimulate.mockReturnValue({ ok: true, data: okResult });
    renderWithState(baseInput);
    expect(mockSimulate).toHaveBeenCalledTimes(1);
    expect(mockSimulate).toHaveBeenCalledWith(baseInput);
  });

  it("AC-2: simulate ok:false면 실패 message가 표시되고 버튼 클릭 시 /input으로 이동한다", () => {
    mockSimulate.mockReturnValue({
      ok: false,
      code: "INVALID_INPUT",
      message: "입력값이 올바르지 않아요",
    });
    renderWithState(baseInput);
    expect(screen.getByText("입력값이 올바르지 않아요")).toBeTruthy();
    fireEvent.click(screen.getByText("조건 다시 입력하기"));
    expect(mockNavigate).toHaveBeenCalledWith("/input");
  });

  it("AC-3: ok:true면 전세/월세/매매 3개의 ListRow가 렌더되고 각 subTitle에 'N년 후 순자산:' 문자열이 포함된다", () => {
    mockSimulate.mockReturnValue({ ok: true, data: okResult });
    renderWithState(baseInput);
    const rows = screen.getAllByTestId("list-row");
    expect(rows.length).toBeGreaterThanOrEqual(3);
    // Each of the 3 option rows should contain "N년 후 순자산:"
    const netWorthTexts = screen.getAllByText(/년 후 순자산:/);
    expect(netWorthTexts.length).toBeGreaterThanOrEqual(3);
  });

  it("AC-4: recommendedOption에 해당하는 ListRow에만 Chip(label='추천')이 1개 표시된다", () => {
    mockSimulate.mockReturnValue({ ok: true, data: okResult });
    renderWithState(baseInput);
    const chips = screen.getAllByTestId("chip");
    const recommendChips = chips.filter((el) => el.textContent === "추천");
    expect(recommendChips).toHaveLength(1);
  });

  it("AC-5: 페이지 상단에 '비교 결과' AppBar가 렌더된다", () => {
    mockSimulate.mockReturnValue({ ok: true, data: okResult });
    renderWithState(baseInput);
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByText("비교 결과")).toBeTruthy();
  });
});
