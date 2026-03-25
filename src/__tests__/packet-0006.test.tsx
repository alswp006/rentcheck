import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

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
        React.createElement(
          "button",
          { role: "tab", "aria-selected": selected, onClick },
          children,
        ),
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

let mockLoading = false;

vi.mock("@/lib/state/useAppState", () => ({
  useAppState: () => ({ loading: mockLoading, settings: {}, entitlement: {} }),
}));

import HomePage from "@/pages/HomePage";

function renderPage() {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(HomePage)),
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLoading = false;
  });

  it("renders exactly 4 preset ListRows with preset names", () => {
    renderPage();
    const rows = screen.getAllByTestId("list-row");
    expect(rows).toHaveLength(4);
    expect(screen.getByText("프리셋1")).toBeTruthy();
    expect(screen.getByText("프리셋2")).toBeTruthy();
    expect(screen.getByText("프리셋3")).toBeTruthy();
    expect(screen.getByText("프리셋4")).toBeTruthy();
  });

  it("shows '불러오는 중...' while hydrating", () => {
    mockLoading = true;
    renderPage();
    expect(screen.getByText("불러오는 중...")).toBeTruthy();
    expect(screen.queryAllByTestId("list-row")).toHaveLength(0);
  });

  it("navigates to /result with presetId state when preset is clicked", () => {
    renderPage();
    const rows = screen.getAllByTestId("list-row");
    fireEvent.click(rows[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { presetId: "preset-1" } });
  });

  it("navigates to /input when '직접 입력하기' is clicked", () => {
    renderPage();
    fireEvent.click(screen.getByText("직접 입력하기"));
    expect(mockNavigate).toHaveBeenCalledWith("/input");
  });

  it("shows toast '이동에 실패했어요' when navigation throws", () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error("navigation error");
    });
    renderPage();
    const rows = screen.getAllByTestId("list-row");
    fireEvent.click(rows[0]);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("이동에 실패했어요")).toBeTruthy();
  });
});
