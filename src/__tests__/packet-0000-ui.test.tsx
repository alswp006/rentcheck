import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockBack = vi.fn();
const mockPush = vi.fn();

vi.mock("next/router", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

vi.mock("@toss/tds-mobile", () => ({
  Top: Object.assign(
    ({ children }: any) => React.createElement("nav", null, children),
    {
      TitleParagraph: ({ children }: any) =>
        React.createElement("h1", null, children),
    }
  ),
}));

import { AppTopBar } from "@/components/AppTopBar";

describe("AppTopBar", () => {
  it("AC-1: backButton=false renders no back button", () => {
    render(
      React.createElement(AppTopBar, { title: "테스트", backButton: false })
    );
    expect(
      screen.queryByRole("button", { name: "뒤로가기" })
    ).not.toBeInTheDocument();
  });

  it("AC-2: backButton=true calls router.back() once on click", () => {
    mockBack.mockClear();
    render(
      React.createElement(AppTopBar, { title: "테스트", backButton: true })
    );
    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("AC-3: router.back() throws → router.push('/') called as fallback", () => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockBack.mockImplementationOnce(() => {
      throw new Error("history empty");
    });
    render(
      React.createElement(AppTopBar, { title: "테스트", backButton: true })
    );
    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("AC-4: renders title via Top.TitleParagraph", () => {
    render(React.createElement(AppTopBar, { title: "렌트체크" }));
    expect(
      screen.getByRole("heading", { name: "렌트체크" })
    ).toBeInTheDocument();
  });

  it("renders right slot when provided", () => {
    render(
      React.createElement(AppTopBar, {
        title: "테스트",
        right: React.createElement("button", null, "액션"),
      })
    );
    expect(screen.getByRole("button", { name: "액션" })).toBeInTheDocument();
  });
});
