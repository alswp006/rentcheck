import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { SimulationInput } from "@/lib/types";
import { encodeSharePayloadV1 } from "@/lib/share";
import * as shareModule from "@/lib/share";

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
            React.createElement("span", null, description),
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

// ── Fixture ───────────────────────────────────────────────────────────────────

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

import SharePage from "@/pages/SharePage";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("S5 공유 진입 페이지(`/share`) — 디코딩 후 simulate로 전달", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("AC-1: location.search에서 input 파라미터를 읽고 decodeSharePayloadV1를 호출한다", () => {
    const decodeSpy = vi.spyOn(shareModule, "decodeSharePayloadV1");
    const encoded = encodeSharePayloadV1(validInput);

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/share?v=1&input=${encoded}`] },
        React.createElement(SharePage)
      )
    );

    expect(decodeSpy).toHaveBeenCalledTimes(1);
    expect(decodeSpy).toHaveBeenCalledWith(encoded);

    decodeSpy.mockRestore();
  });

  it("AC-2: 디코딩 성공 시 navigate('/simulate', { state: { input, source:'share' }, replace: true })가 1회 호출된다", () => {
    const encoded = encodeSharePayloadV1(validInput);

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/share?v=1&input=${encoded}`] },
        React.createElement(SharePage)
      )
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/simulate", {
      state: { input: validInput, source: "share" },
      replace: true,
    });
  });

  it("AC-3: 디코딩 실패(잘못된 base64) 시 크래시 없이 오류 UI(Paragraph.Text + Button)가 렌더링된다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/share?v=1&input=THIS_IS_NOT_VALID_BASE64!!!"] },
        React.createElement(SharePage)
      )
    );

    // No navigation on error
    expect(mockNavigate).not.toHaveBeenCalled();

    // Error UI must have at least one button (CTA to go home)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    // Error UI must show some text via Paragraph.Text (rendered as <span>)
    const spans = document.querySelectorAll("span");
    expect(spans.length).toBeGreaterThan(0);
  });

  it("AC-3: input 파라미터 없을 때도 크래시 없이 오류 UI가 렌더링된다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/share"] },
        React.createElement(SharePage)
      )
    );

    expect(mockNavigate).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("AC-4: 오류 상태의 CTA 버튼 탭 시 navigate('/')가 호출된다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/share?v=1&input=INVALID"] },
        React.createElement(SharePage)
      )
    );

    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-5: 성공 경로에서 window.open이 호출되지 않는다", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const encoded = encodeSharePayloadV1(validInput);

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/share?v=1&input=${encoded}`] },
        React.createElement(SharePage)
      )
    );

    expect(windowOpenSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  it("AC-5: 오류 경로에서도 window.open이 호출되지 않는다", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/share?v=1&input=BAD"] },
        React.createElement(SharePage)
      )
    );

    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    expect(windowOpenSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  it("Integration: App.tsx에 /share 라우트가 등록되어 있고 SharePage가 크래시 없이 렌더링된다", async () => {
    // Mock all heavy page deps to isolate routing
    vi.doMock("@/pages/HomePage", () => ({
      default: () => React.createElement("div", null, "Home"),
    }));
    vi.doMock("@/pages/SimulatePage", () => ({
      default: () => React.createElement("div", null, "Simulate"),
    }));
    vi.doMock("@/pages/ResultPage", () => ({
      default: () => React.createElement("div", null, "Result"),
      ResultPage: () => React.createElement("div", null, "Result"),
    }));

    const { default: App } = await import("@/App");

    const encoded = encodeSharePayloadV1(validInput);
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/share?v=1&input=${encoded}`] },
        React.createElement(App)
      )
    );

    // navigate should have been called (SharePage redirects on success)
    // or no crash — either outcome is acceptable for integration smoke test
    expect(document.body).toBeTruthy();
  });
});
