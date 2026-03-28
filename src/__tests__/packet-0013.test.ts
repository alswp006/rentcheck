import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- react-router-dom mock ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// --- TDS mock ---
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
  TabBar: Object.assign(
    ({ children, style, ...props }: any) =>
      React.createElement(
        "nav",
        { "data-testid": "tabbar", style, ...props },
        children
      ),
    {
      Item: ({ children, onClick, selected, ...props }: any) =>
        React.createElement(
          "button",
          { role: "tab", "aria-selected": selected, onClick, ...props },
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

// --- Toss framework mock ---
vi.mock("@apps-in-toss/framework", () => ({
  generateHapticFeedback: vi.fn(),
}));

// --- useTossLogin mock ---
vi.mock("@/hooks/useTossLogin", () => ({
  default: () => ({ userId: "test-user", isLoggedIn: true }),
  useTossLogin: () => ({ userId: "test-user", isLoggedIn: true }),
}));

// --- useTossAd mock ---
vi.mock("@/hooks/useTossAd", () => ({
  default: () => ({ isAdReady: false, showAd: vi.fn() }),
  useTossAd: () => ({ isAdReady: false, showAd: vi.fn() }),
}));

// --- Page stubs: avoid cascading deps in jsdom ---
vi.mock("@/pages/HomePage", () => ({
  default: () =>
    React.createElement("div", { "data-testid": "page-home" }, "Home"),
}));
vi.mock("@/pages/SimulatePage", () => ({
  default: () =>
    React.createElement("div", { "data-testid": "page-simulate" }, "Simulate"),
}));
vi.mock("@/pages/ResultPage", () => ({
  default: () =>
    React.createElement("div", { "data-testid": "page-result" }, "Result"),
}));
vi.mock("@/pages/HistoryPage", () => ({
  default: () =>
    React.createElement("div", { "data-testid": "page-history" }, "History"),
}));
vi.mock("@/pages/SharePage", () => ({
  default: () =>
    React.createElement("div", { "data-testid": "page-share" }, "Share"),
}));

import App from "@/App";

describe("라우팅 와이어링 + Provider 연결 + 통합 폴리시", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // AC-1: App.tsx에 모든 페이지 Route가 정의되어 있다
  it("AC-1: '/' 경로에서 HomePage가 크래시 없이 렌더된다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(App)
      )
    );
    expect(screen.getByTestId("page-home")).toBeTruthy();
  });

  it("AC-1: 5개 페이지 Route(/simulate, /result, /history, /share)가 모두 렌더 가능하다", () => {
    const routes = [
      { path: "/simulate", testId: "page-simulate" },
      { path: "/result", testId: "page-result" },
      { path: "/history", testId: "page-history" },
      { path: "/share", testId: "page-share" },
    ];

    for (const { path, testId } of routes) {
      const { unmount } = render(
        React.createElement(
          MemoryRouter,
          { initialEntries: [path] },
          React.createElement(App)
        )
      );
      expect(screen.getByTestId(testId)).toBeTruthy();
      unmount();
    }
  });

  // AC-2: 모든 navigate() 대상에 Route가 존재한다
  it("AC-2: App.tsx에 정의된 모든 navigate 대상 경로(/, /simulate, /result, /history, /share)에 Route가 있다", async () => {
    // App.tsx 소스를 읽어서 Route path들이 navigate 대상을 모두 커버하는지 확인
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/App.tsx"),
      "utf-8"
    );

    // 필수 Route 경로들이 App.tsx에 존재해야 함
    const requiredPaths = ["/", "/simulate", "/result", "/history", "/share"];
    for (const p of requiredPaths) {
      expect(source).toContain(`path="${p}"`);
    }
  });

  it("AC-2: 모든 페이지가 독립적으로 크래시 없이 마운트된다 (navigate 타겟 검증)", () => {
    const allRoutes = [
      { path: "/", testId: "page-home" },
      { path: "/simulate", testId: "page-simulate" },
      { path: "/result", testId: "page-result" },
      { path: "/history", testId: "page-history" },
      { path: "/share", testId: "page-share" },
    ];

    for (const { path, testId } of allRoutes) {
      const { unmount } = render(
        React.createElement(
          MemoryRouter,
          { initialEntries: [path] },
          React.createElement(App)
        )
      );
      expect(screen.getByTestId(testId)).toBeTruthy();
      unmount();
    }
  });

  // AC-3: main.tsx의 ThemeProvider/BrowserRouter가 유지되어 있다
  it("AC-3: main.tsx에 ThemeProvider가 존재한다", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/main.tsx"),
      "utf-8"
    );
    expect(content).toContain("ThemeProvider");
  });

  it("AC-3: main.tsx에 BrowserRouter가 존재한다", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/main.tsx"),
      "utf-8"
    );
    expect(content).toContain("BrowserRouter");
  });

  it("AC-3: main.tsx에 @AI:ANCHOR 마커가 그대로 유지된다", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/main.tsx"),
      "utf-8"
    );
    expect(content).toContain("@AI:ANCHOR");
  });

  // AC-4: 앱이 '/' 경로에서 정상 렌더링된다
  it("AC-4: '/' 경로에서 App이 정상 렌더링되며 TabBar도 존재한다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(App)
      )
    );

    // 홈 페이지 렌더
    expect(screen.getByTestId("page-home")).toBeTruthy();

    // TabBar 하단 고정 네비게이션 존재
    const tabbar = screen.getByTestId("tabbar");
    expect(tabbar).toBeTruthy();

    // 탭이 최소 2개 이상
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(2);
  });
});
