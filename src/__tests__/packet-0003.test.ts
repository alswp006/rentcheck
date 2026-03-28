import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * 세션 플래그(Context) + 500ms 디바운스 훅 — TDD RED Phase
 *
 * Tests for:
 * - StorageSessionProvider / useStorageSession(): { draftDisabled, disableDraftForSession }
 * - useDebouncedEffect(effect, deps, delayMs): debounce timer cancellation
 */

vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement("button", { onClick, ...props }, children),
  Spacing: () => React.createElement("div"),
  Paragraph: {
    Text: ({ children, ...props }: any) =>
      React.createElement("span", props, children),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("세션 플래그(Context) + 500ms 디바운스 훅", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // AC-1: useStorageSession() returns { draftDisabled, disableDraftForSession }
  // ==========================================================================
  it("AC-1: useStorageSession() returns draftDisabled and disableDraftForSession inside StorageSessionProvider", async () => {
    const { StorageSessionProvider, useStorageSession } = await import(
      "@/lib/state/StorageSessionContext"
    );

    let result: ReturnType<typeof useStorageSession> | undefined;

    function Consumer() {
      result = useStorageSession();
      return null;
    }

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          StorageSessionProvider,
          null,
          React.createElement(Consumer)
        )
      )
    );

    expect(result).toBeDefined();
    expect(typeof result!.draftDisabled).toBe("boolean");
    expect(typeof result!.disableDraftForSession).toBe("function");
  });

  it("AC-1: draftDisabled starts as false (no restriction by default)", async () => {
    const { StorageSessionProvider, useStorageSession } = await import(
      "@/lib/state/StorageSessionContext"
    );

    let result: ReturnType<typeof useStorageSession> | undefined;

    function Consumer() {
      result = useStorageSession();
      return null;
    }

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          StorageSessionProvider,
          null,
          React.createElement(Consumer)
        )
      )
    );

    expect(result!.draftDisabled).toBe(false);
  });

  // ==========================================================================
  // AC-2: disableDraftForSession() sets draftDisabled=true and keeps it true
  // ==========================================================================
  it("AC-2: disableDraftForSession() sets draftDisabled to true and remains true (SC1-AC-4)", async () => {
    const { StorageSessionProvider, useStorageSession } = await import(
      "@/lib/state/StorageSessionContext"
    );

    let result: ReturnType<typeof useStorageSession> | undefined;

    function Consumer() {
      result = useStorageSession();
      return null;
    }

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          StorageSessionProvider,
          null,
          React.createElement(Consumer)
        )
      )
    );

    expect(result!.draftDisabled).toBe(false);

    act(() => {
      result!.disableDraftForSession();
    });

    expect(result!.draftDisabled).toBe(true);
  });

  it("AC-2: draftDisabled stays true after multiple disableDraftForSession() calls", async () => {
    const { StorageSessionProvider, useStorageSession } = await import(
      "@/lib/state/StorageSessionContext"
    );

    let result: ReturnType<typeof useStorageSession> | undefined;

    function Consumer() {
      result = useStorageSession();
      return null;
    }

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          StorageSessionProvider,
          null,
          React.createElement(Consumer)
        )
      )
    );

    act(() => {
      result!.disableDraftForSession();
    });
    expect(result!.draftDisabled).toBe(true);

    act(() => {
      result!.disableDraftForSession();
    });
    expect(result!.draftDisabled).toBe(true);
  });

  // ==========================================================================
  // AC-3: useDebouncedEffect — rapid deps change causes effect to fire only once
  // ==========================================================================
  it("AC-3: useDebouncedEffect fires effect only once when deps change rapidly within delayMs", async () => {
    const { useDebouncedEffect } = await import(
      "@/lib/state/useDebouncedEffect"
    );

    const effect = vi.fn();
    let depValue = 0;

    function TestComponent({ dep }: { dep: number }) {
      useDebouncedEffect(effect, [dep], 500);
      return null;
    }

    const { rerender } = render(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent, { dep: depValue }))
    );

    // Clear initial call if any
    effect.mockClear();

    // Rapidly change deps — should cancel previous timers
    depValue = 1;
    rerender(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent, { dep: depValue }))
    );
    depValue = 2;
    rerender(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent, { dep: depValue }))
    );
    depValue = 3;
    rerender(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent, { dep: depValue }))
    );

    // Before delay passes — effect should NOT have run yet
    expect(effect).not.toHaveBeenCalled();

    // After 500ms — effect should run exactly once
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("AC-3: useDebouncedEffect does not fire before delayMs elapses", async () => {
    const { useDebouncedEffect } = await import(
      "@/lib/state/useDebouncedEffect"
    );

    const effect = vi.fn();

    function TestComponent({ dep }: { dep: number }) {
      useDebouncedEffect(effect, [dep], 500);
      return null;
    }

    render(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent, { dep: 0 }))
    );

    effect.mockClear();

    // Advance only 400ms — still within debounce window
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(effect).not.toHaveBeenCalled();

    // Advance to 500ms — should fire now
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(effect).toHaveBeenCalledTimes(1);
  });

  // ==========================================================================
  // AC-4: Both modules can be imported (compilation check)
  // ==========================================================================
  it("AC-4: StorageSessionContext module exports StorageSessionProvider and useStorageSession", async () => {
    const module = await import("@/lib/state/StorageSessionContext");
    expect(typeof module.StorageSessionProvider).toBe("function");
    expect(typeof module.useStorageSession).toBe("function");
  });

  it("AC-4: useDebouncedEffect module exports useDebouncedEffect as a function", async () => {
    const module = await import("@/lib/state/useDebouncedEffect");
    expect(typeof module.useDebouncedEffect).toBe("function");
  });
});
