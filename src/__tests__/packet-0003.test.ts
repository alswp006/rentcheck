// TDD red phase — tests for packet 0003
// Files under test DO NOT EXIST YET:
//   src/lib/state/AppProvider.tsx
//   src/lib/state/useAppState.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ============================================================
// Mock @toss/tds-mobile (crashes in jsdom)
// ============================================================
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
          React.createElement("span", null, bottom),
        ),
    },
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
            alertButton,
          )
        : null,
    {
      AlertButton: ({ children, onClick }: any) =>
        React.createElement("button", { onClick }, children),
    },
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
          children,
        ),
    },
  ),
  TextField: React.forwardRef(
    ({ label, help, hasError, ...props }: any, ref: any) =>
      React.createElement(
        "div",
        null,
        React.createElement("label", null, label),
        React.createElement("input", { ref, ...props }),
        hasError &&
          help &&
          React.createElement("span", null, help),
      ),
  ),
  Top: Object.assign(
    ({ children }: any) => React.createElement("nav", null, children),
    {
      TitleParagraph: ({ children }: any) =>
        React.createElement("h1", null, children),
    },
  ),
  Border: () => React.createElement("hr"),
  BottomCTA: ({ children }: any) => React.createElement("div", null, children),
  BottomSheet: Object.assign(
    ({ children, open }: any) =>
      open
        ? React.createElement("div", { role: "dialog" }, children)
        : null,
    {
      Header: ({ children }: any) => React.createElement("div", null, children),
    },
  ),
}));

// ============================================================
// Mock react-router-dom useNavigate
// ============================================================
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ============================================================
// Helpers
// ============================================================
import type { AppSettings, Entitlement, StorageAdapter } from "@/lib/types";

function makeDefaultSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    hasSeenSimulationDisclaimer: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeEntitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: "ent-1",
    isPremium: false,
    premiumSince: null,
    ownerUserId: null,
    maxResidenceYears: 10,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeStorageAdapter(overrides: Partial<StorageAdapter> = {}): StorageAdapter {
  return {
    getSettings: vi.fn().mockResolvedValue({ ok: true, data: makeDefaultSettings() }),
    setSettings: vi.fn().mockResolvedValue({ ok: true, data: true }),
    getEntitlement: vi.fn().mockResolvedValue({ ok: true, data: makeEntitlement() }),
    setEntitlement: vi.fn().mockResolvedValue({ ok: true, data: true }),
    clearEntitlement: vi.fn().mockResolvedValue({ ok: true, data: true }),
    listHistory: vi.fn().mockResolvedValue({ ok: true, data: { items: [], total: 0, page: 1 } }),
    getHistoryById: vi.fn().mockResolvedValue({ ok: false, code: "NOT_FOUND", message: "" }),
    saveHistoryEntry: vi.fn().mockResolvedValue({ ok: true, data: true }),
    deleteHistoryById: vi.fn().mockResolvedValue({ ok: true, data: true }),
    clearHistory: vi.fn().mockResolvedValue({ ok: true, data: true }),
    ...overrides,
  } as StorageAdapter;
}

// ============================================================
// Tests
// ============================================================

describe("전역 상태(AppProvider): settings/entitlement hydrate + effective entitlement", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // AC-1: AppProvider 마운트 시 getEntitlement/getSettings 각 1회 호출
  // ----------------------------------------------------------
  it("AC-1: AppProvider 마운트 시 getEntitlement()와 getSettings()가 각각 정확히 1회씩 호출된다", async () => {
    const { AppProvider } = await import("@/lib/state/AppProvider");
    const adapter = makeStorageAdapter();

    await act(async () => {
      render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(
            AppProvider,
            { storage: adapter },
            React.createElement("div", null, "child"),
          ),
        ),
      );
    });

    expect(adapter.getEntitlement).toHaveBeenCalledTimes(1);
    expect(adapter.getSettings).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // AC-2: useAppState()에서 {settings, entitlement, loading} 조회 가능
  // ----------------------------------------------------------
  it("AC-2: useAppState()는 settings, entitlement, loading 필드를 반환한다", async () => {
    const { AppProvider } = await import("@/lib/state/AppProvider");
    const { useAppState } = await import("@/lib/state/useAppState");

    const settings = makeDefaultSettings({ hasSeenSimulationDisclaimer: true });
    const entitlement = makeEntitlement({ isPremium: true, ownerUserId: "user-42" });
    const adapter = makeStorageAdapter({
      getSettings: vi.fn().mockResolvedValue({ ok: true, data: settings }),
      getEntitlement: vi.fn().mockResolvedValue({ ok: true, data: entitlement }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppProvider, { storage: adapter }, children),
      );

    const { result } = renderHook(() => useAppState(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);

    // After hydration
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.settings).toEqual(settings);
    expect(result.current.entitlement).toEqual(entitlement);
    expect(result.current.loading).toBe(false);
  });

  // ----------------------------------------------------------
  // AC-3: setEntitlement — storage ok:true → in-memory state 갱신
  // ----------------------------------------------------------
  it("AC-3: setEntitlement(next)는 storage 저장이 ok:true일 때 entitlement 상태를 next로 변경한다", async () => {
    const { AppProvider } = await import("@/lib/state/AppProvider");
    const { useAppState } = await import("@/lib/state/useAppState");

    const initialEntitlement = makeEntitlement({ isPremium: false, ownerUserId: "user-1" });
    const nextEntitlement = makeEntitlement({ isPremium: true, ownerUserId: "user-1", premiumSince: 9999 });

    const adapter = makeStorageAdapter({
      getEntitlement: vi.fn().mockResolvedValue({ ok: true, data: initialEntitlement }),
      setEntitlement: vi.fn().mockResolvedValue({ ok: true, data: true }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppProvider, { storage: adapter }, children),
      );

    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entitlement.isPremium).toBe(false);

    await act(async () => {
      await result.current.setEntitlement(nextEntitlement);
    });

    expect(result.current.entitlement).toEqual(nextEntitlement);
    expect(adapter.setEntitlement).toHaveBeenCalledWith(nextEntitlement);
  });

  // ----------------------------------------------------------
  // AC-4: setEntitlement — storage ok:false → in-memory 상태 유지
  // ----------------------------------------------------------
  it("AC-4: setEntitlement(next)는 storage 저장이 ok:false이면 entitlement in-memory 상태가 변경되지 않는다", async () => {
    const { AppProvider } = await import("@/lib/state/AppProvider");
    const { useAppState } = await import("@/lib/state/useAppState");

    const initialEntitlement = makeEntitlement({ isPremium: false, ownerUserId: "user-1" });
    const nextEntitlement = makeEntitlement({ isPremium: true, ownerUserId: "user-1", premiumSince: 9999 });

    const adapter = makeStorageAdapter({
      getEntitlement: vi.fn().mockResolvedValue({ ok: true, data: initialEntitlement }),
      setEntitlement: vi.fn().mockResolvedValue({
        ok: false,
        code: "WRITE_ERROR",
        message: "disk full",
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppProvider, { storage: adapter }, children),
      );

    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = result.current.entitlement;

    await act(async () => {
      await result.current.setEntitlement(nextEntitlement);
    });

    // In-memory state must remain unchanged
    expect(result.current.entitlement).toEqual(before);
    expect(result.current.entitlement.isPremium).toBe(false);
  });

  // ----------------------------------------------------------
  // AC-5: getEffectiveEntitlement — ownerUserId 불일치 시 isPremium:false, maxResidenceYears:10
  // ----------------------------------------------------------
  it("AC-5: getEffectiveEntitlement(currentUserId)는 ownerUserId !== currentUserId이면 isPremium:false, maxResidenceYears:10을 반환한다", async () => {
    const { AppProvider } = await import("@/lib/state/AppProvider");
    const { useAppState } = await import("@/lib/state/useAppState");

    const premiumEntitlement = makeEntitlement({
      isPremium: true,
      ownerUserId: "owner-99",
      maxResidenceYears: 30,
      premiumSince: 5000,
    });

    const adapter = makeStorageAdapter({
      getEntitlement: vi.fn().mockResolvedValue({ ok: true, data: premiumEntitlement }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppProvider, { storage: adapter }, children),
      );

    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Different user — must downgrade
    const effective = result.current.getEffectiveEntitlement("different-user");
    expect(effective.isPremium).toBe(false);
    expect(effective.maxResidenceYears).toBe(10);
  });

  it("AC-5b: getEffectiveEntitlement(currentUserId)는 ownerUserId === currentUserId이면 원래 entitlement를 그대로 반환한다", async () => {
    const { AppProvider } = await import("@/lib/state/AppProvider");
    const { useAppState } = await import("@/lib/state/useAppState");

    const premiumEntitlement = makeEntitlement({
      isPremium: true,
      ownerUserId: "owner-99",
      maxResidenceYears: 30,
      premiumSince: 5000,
    });

    const adapter = makeStorageAdapter({
      getEntitlement: vi.fn().mockResolvedValue({ ok: true, data: premiumEntitlement }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppProvider, { storage: adapter }, children),
      );

    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Same user — full premium preserved
    const effective = result.current.getEffectiveEntitlement("owner-99");
    expect(effective.isPremium).toBe(true);
    expect(effective.maxResidenceYears).toBe(30);
  });

  // ----------------------------------------------------------
  // AC-6: getEffectiveEntitlement는 storage에 쓰기 없음
  // ----------------------------------------------------------
  it("AC-6: getEffectiveEntitlement 호출 후 localStorage.setItem이 호출되지 않는다", async () => {
    const { AppProvider } = await import("@/lib/state/AppProvider");
    const { useAppState } = await import("@/lib/state/useAppState");

    const premiumEntitlement = makeEntitlement({
      isPremium: true,
      ownerUserId: "owner-99",
      maxResidenceYears: 30,
    });

    const adapter = makeStorageAdapter({
      getEntitlement: vi.fn().mockResolvedValue({ ok: true, data: premiumEntitlement }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppProvider, { storage: adapter }, children),
      );

    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    result.current.getEffectiveEntitlement("some-other-user");

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  // ----------------------------------------------------------
  // AC-7: TypeScript 컴파일 성공 — 타입 구조 검증
  // ----------------------------------------------------------
  it("AC-7: useAppState() 반환 타입이 올바른 필드를 포함한다", async () => {
    const { AppProvider } = await import("@/lib/state/AppProvider");
    const { useAppState } = await import("@/lib/state/useAppState");

    const adapter = makeStorageAdapter();

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppProvider, { storage: adapter }, children),
      );

    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const state = result.current;
    // All required fields must exist with correct types
    expect(typeof state.loading).toBe("boolean");
    expect(typeof state.settings).toBe("object");
    expect(typeof state.entitlement).toBe("object");
    expect(typeof state.setEntitlement).toBe("function");
    expect(typeof state.getEffectiveEntitlement).toBe("function");
  });
});
