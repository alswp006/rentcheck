import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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

// ─── StorageAdapter mock (vi.hoisted so mock fns are available before factory) ─
const { mockClearHistory } = vi.hoisted(() => ({
  mockClearHistory: vi.fn(),
}));

vi.mock("@/lib/storage/localStorageAdapter", () => ({
  storageAdapter: {
    clearHistory: mockClearHistory,
  },
}));

// ─── AppState mock ────────────────────────────────────────────────────────────
const { mockGetEffectiveEntitlement } = vi.hoisted(() => ({
  mockGetEffectiveEntitlement: vi.fn(),
}));

vi.mock("@/lib/state/useAppState", () => ({
  useAppState: () => ({
    loading: false,
    settings: { hasSeenSimulationDisclaimer: false, createdAt: 0, updatedAt: 0 },
    entitlement: {
      id: "test",
      isPremium: false,
      premiumSince: null,
      ownerUserId: null,
      maxResidenceYears: 10,
      createdAt: 0,
      updatedAt: 0,
    },
    setEntitlement: vi.fn(),
    setSettings: vi.fn(),
    getEffectiveEntitlement: mockGetEffectiveEntitlement,
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function renderPage() {
  const { default: SettingsPage } = require("../pages/SettingsPage");
  return render(
    React.createElement(MemoryRouter, null, React.createElement(SettingsPage)),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("설정 페이지(/settings): 고지 확인/데이터 초기화(범위 제한)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockNavigate.mockClear();
    mockClearHistory.mockClear();
    mockGetEffectiveEntitlement.mockReset();
  });

  it("AC-1: AppBar(Top)에 '설정' 타이틀이 렌더된다", () => {
    mockGetEffectiveEntitlement.mockReturnValue({
      id: "test",
      isPremium: false,
      premiumSince: null,
      ownerUserId: null,
      maxResidenceYears: 10,
      createdAt: 0,
      updatedAt: 0,
    });
    renderPage();
    expect(screen.getByText("설정")).toBeTruthy();
  });

  it("AC-2a: effective entitlement가 premium이면 '프리미엄 사용 중' 문구가 표시된다", () => {
    mockGetEffectiveEntitlement.mockReturnValue({
      id: "test",
      isPremium: true,
      premiumSince: Date.now(),
      ownerUserId: "user-1",
      maxResidenceYears: 30,
      createdAt: 0,
      updatedAt: 0,
    });
    renderPage();
    expect(screen.getByText(/프리미엄 사용 중/)).toBeTruthy();
  });

  it("AC-2b: effective entitlement가 free이면 '무료 사용 중' 문구가 표시된다", () => {
    mockGetEffectiveEntitlement.mockReturnValue({
      id: "test",
      isPremium: false,
      premiumSince: null,
      ownerUserId: null,
      maxResidenceYears: 10,
      createdAt: 0,
      updatedAt: 0,
    });
    renderPage();
    expect(screen.getByText(/무료 사용 중/)).toBeTruthy();
  });

  it("AC-3: '히스토리 모두 지우기' 탭 시 AlertDialog가 열리고 확인 시 clearHistory()가 호출된다", async () => {
    mockGetEffectiveEntitlement.mockReturnValue({
      id: "test",
      isPremium: false,
      premiumSince: null,
      ownerUserId: null,
      maxResidenceYears: 10,
      createdAt: 0,
      updatedAt: 0,
    });
    mockClearHistory.mockResolvedValue({ ok: true, data: true });
    renderPage();

    // Dialog should not be open initially
    expect(screen.queryByRole("alertdialog")).toBeNull();

    // Tap the clear history row/button
    fireEvent.click(screen.getByText(/히스토리 모두 지우기/));

    // Dialog opens
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeTruthy();

    // Click confirm
    fireEvent.click(screen.getByText("확인"));

    await waitFor(() => {
      expect(mockClearHistory).toHaveBeenCalledTimes(1);
    });
  });

  it("AC-4: clearHistory()가 ok:true이면 Toast로 '지웠어요'가 표시된다", async () => {
    mockGetEffectiveEntitlement.mockReturnValue({
      id: "test",
      isPremium: false,
      premiumSince: null,
      ownerUserId: null,
      maxResidenceYears: 10,
      createdAt: 0,
      updatedAt: 0,
    });
    mockClearHistory.mockResolvedValue({ ok: true, data: true });
    renderPage();

    // Open dialog
    fireEvent.click(screen.getByText(/히스토리 모두 지우기/));
    await screen.findByRole("alertdialog");

    // Confirm
    fireEvent.click(screen.getByText("확인"));

    // Toast with "지웠어요" appears
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeTruthy();
      expect(screen.getByText("지웠어요")).toBeTruthy();
    });
  });

  it("AC-5: '비교 방식 안내 다시 보기' 탭 시 Dialog가 열리고 'N년 후 순자산' 문자열이 포함된다", async () => {
    mockGetEffectiveEntitlement.mockReturnValue({
      id: "test",
      isPremium: false,
      premiumSince: null,
      ownerUserId: null,
      maxResidenceYears: 10,
      createdAt: 0,
      updatedAt: 0,
    });
    renderPage();

    // Tap the "비교 방식 안내 다시 보기" row/button
    fireEvent.click(screen.getByText(/비교 방식 안내 다시 보기/));

    // Dialog should open with title "비교 방식 안내"
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByText("비교 방식 안내")).toBeTruthy();

    // Description should include "N년 후 순자산"
    expect(dialog.textContent).toMatch(/\d+년 후 순자산|N년 후 순자산/);
  });
});
