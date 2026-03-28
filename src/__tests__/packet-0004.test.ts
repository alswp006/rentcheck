import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppTopBar } from "@/components/AppTopBar";

// ── react-router-dom mock ──────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── @toss/tds-mobile mock ──────────────────────────────────────────────────
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
    ({ children, ...props }: any) =>
      React.createElement("nav", { "data-testid": "tds-top", ...props }, children),
    {
      TitleParagraph: ({ children }: any) =>
        React.createElement("h1", null, children),
    }
  ),
  Border: () => React.createElement("hr"),
  BottomCTA: ({ children }: any) => React.createElement("div", null, children),
  BottomSheet: Object.assign(
    ({ children, open }: any) =>
      open ? React.createElement("div", { role: "dialog" }, children) : null,
    {
      Header: ({ children }: any) => React.createElement("div", null, children),
    }
  ),
}));

// ── helpers ────────────────────────────────────────────────────────────────
function renderAppTopBar(props: Record<string, unknown> = {}) {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(AppTopBar, { title: "테스트", ...props })
    )
  );
}

describe("공용 AppBar 래퍼(AppTopBar) + Back 버튼 규칙", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  // ── AC-1 ──────────────────────────────────────────────────────────────────
  it("AC-1: backButton=false이면 뒤로가기 UI가 렌더링되지 않는다", () => {
    renderAppTopBar({ backButton: false });

    // There should be no back button in the DOM
    const backBtn = screen.queryByRole("button", { name: /back|뒤로|←|‹/i });
    expect(backBtn).toBeNull();

    // Also ensure no element with aria-label for back
    const backAria = screen.queryByLabelText(/back|뒤로/i);
    expect(backAria).toBeNull();
  });

  it("AC-1(default): backButton prop 미전달 시에도 뒤로가기 UI가 렌더링되지 않는다", () => {
    renderAppTopBar({}); // no backButton prop

    const backBtn = screen.queryByRole("button", { name: /back|뒤로|←|‹/i });
    expect(backBtn).toBeNull();
  });

  // ── AC-2 ──────────────────────────────────────────────────────────────────
  it("AC-2: backButton=true에서 뒤로가기 탭 시 navigate(-1)이 정확히 1회 호출된다", () => {
    renderAppTopBar({ backButton: true });

    // The back button must be present
    const backBtn = screen.getByRole("button", { name: /back|뒤로|←|‹/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("AC-2: 뒤로가기 버튼을 두 번 탭하면 navigate(-1)이 2회 호출된다 (한 번 탭에 2회 이상이면 FAIL)", () => {
    renderAppTopBar({ backButton: true });

    const backBtn = screen.getByRole("button", { name: /back|뒤로|←|‹/i });

    // One click → exactly 1 call
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledTimes(1);

    // Two clicks → exactly 2 calls (no double-fire per click)
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  // ── AC-3 ──────────────────────────────────────────────────────────────────
  it("AC-3: navigate(-1)이 예외를 던질 때 navigate('/')로 폴백한다", () => {
    // Make navigate(-1) throw
    mockNavigate.mockImplementation((arg: unknown) => {
      if (arg === -1) throw new Error("Cannot navigate back");
    });

    renderAppTopBar({ backButton: true });

    const backBtn = screen.getByRole("button", { name: /back|뒤로|←|‹/i });
    fireEvent.click(backBtn);

    // First call was navigate(-1) (threw), second call must be navigate('/')
    expect(mockNavigate).toHaveBeenCalledWith(-1);
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it("AC-3: 폴백 navigate('/')는 navigate(-1) 실패 시에만 호출된다 (정상 시 미호출)", () => {
    // Normal case: navigate(-1) succeeds
    mockNavigate.mockImplementation(() => undefined);

    renderAppTopBar({ backButton: true });
    const backBtn = screen.getByRole("button", { name: /back|뒤로|←|‹/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith("/");
  });

  // ── AC-4 ──────────────────────────────────────────────────────────────────
  it("AC-4: 컴포넌트가 TDS Top 컴포넌트를 사용해 렌더링된다 (data-testid=tds-top 존재)", () => {
    renderAppTopBar({ backButton: false, title: "렌트체크" });

    // The mock Top renders <nav data-testid="tds-top">
    const topBar = screen.getByTestId("tds-top");
    expect(topBar).toBeTruthy();
  });

  it("AC-4: title prop이 Top 내부에 표시된다", () => {
    renderAppTopBar({ backButton: false, title: "렌트체크" });

    expect(screen.getByText("렌트체크")).toBeTruthy();
  });
});
