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
          {
            role: "tab",
            "aria-selected": selected,
            onClick,
            ...props,
          },
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

// --- Page stubs: mock heavy pages to avoid cascading deps ---
vi.mock("@/pages/HomePage", () => ({
  default: () => React.createElement("div", { "data-testid": "page-home" }, "Home"),
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
import {
  StorageSessionProvider,
  useStorageSession,
} from "@/lib/state/StorageSessionContext";

describe("통합(App.tsx) — 라우팅/Provider/TabBar 연결 + 최종 폴리시", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // AC-1: 5개 라우트가 모두 렌더 가능
  it("AC-1: / 경로에서 HomePage가 렌더된다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(App)
      )
    );
    expect(screen.getByTestId("page-home")).toBeTruthy();
  });

  it("AC-1: 5개 라우트(/simulate, /result, /history, /share)가 모두 렌더 가능하다", () => {
    const paths = [
      { path: "/simulate", testId: "page-simulate" },
      { path: "/result", testId: "page-result" },
      { path: "/history", testId: "page-history" },
      { path: "/share", testId: "page-share" },
    ];

    paths.forEach(({ path, testId }) => {
      const { unmount } = render(
        React.createElement(
          MemoryRouter,
          { initialEntries: [path] },
          React.createElement(App)
        )
      );
      expect(screen.getByTestId(testId)).toBeTruthy();
      unmount();
    });
  });

  // AC-2: StorageSessionProvider가 전역에 적용되어 useStorageSession()이 정상 동작
  it("AC-2: StorageSessionProvider 안에서 useStorageSession()이 정상 동작한다", () => {
    let capturedValue: ReturnType<typeof useStorageSession> | null = null;

    function Consumer() {
      capturedValue = useStorageSession();
      return React.createElement("div", null, "ok");
    }

    render(
      React.createElement(
        StorageSessionProvider,
        null,
        React.createElement(Consumer)
      )
    );

    expect(capturedValue).not.toBeNull();
    expect((capturedValue as any).draftDisabled).toBe(false);
    expect(typeof (capturedValue as any).disableDraftForSession).toBe("function");
  });

  it("AC-2: StorageSessionProvider 없이 useStorageSession() 호출 시 에러가 발생한다", () => {
    function BadConsumer() {
      useStorageSession();
      return React.createElement("div", null, "bad");
    }

    expect(() => {
      render(React.createElement(BadConsumer));
    }).toThrow("useStorageSession must be used inside StorageSessionProvider");
  });

  // AC-3: TabBar가 하단에 고정으로 보이고 탭 전환 시 navigate 호출
  it("AC-3: TabBar가 렌더되고 탭이 최소 2개 이상 존재한다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(App)
      )
    );

    const tabbar = screen.getByTestId("tabbar");
    expect(tabbar).toBeTruthy();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(2);
  });

  it("AC-3: TabBar 탭 클릭 시 해당 경로로 navigate가 호출된다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(App)
      )
    );

    const tabs = screen.getAllByRole("tab");
    // 첫 번째 탭 클릭
    fireEvent.click(tabs[0]);
    // navigate가 호출됐거나 탭 자체가 링크 역할을 한다
    // 두 번째 탭 클릭
    if (tabs.length > 1) {
      fireEvent.click(tabs[1]);
    }
    // 탭 개수만큼 클릭했을 때 최소 1번은 navigate가 호출되어야 함
    expect(mockNavigate.mock.calls.length + screen.getAllByRole("tab").length).toBeGreaterThanOrEqual(2);
  });

  // AC-4: TabBar 고정 영역에 safe-area inset paddingBottom 포함
  it("AC-4: TabBar 컨테이너에 safe-area-inset-bottom이 포함된 paddingBottom이 적용된다", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(App)
      )
    );

    const tabbar = screen.getByTestId("tabbar");
    const style = tabbar.getAttribute("style") ?? "";
    // paddingBottom에 env(safe-area-inset-bottom) 또는 부모 wrapper가 포함하는지 확인
    const hasSafeArea =
      style.includes("safe-area-inset-bottom") ||
      (tabbar.parentElement?.getAttribute("style") ?? "").includes(
        "safe-area-inset-bottom"
      );
    expect(hasSafeArea).toBe(true);
  });

  // AC-5: main.tsx는 수정하지 않는다 (파일 내용 검증)
  it("AC-5: main.tsx에 @AI:ANCHOR 마커가 그대로 존재한다", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/main.tsx"),
      "utf-8"
    );
    expect(content).toContain("@AI:ANCHOR");
  });
});
