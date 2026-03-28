import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

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
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppTopBar, { title: "테스트", backButton: false })
      )
    );
    expect(
      screen.queryByRole("button", { name: "뒤로가기" })
    ).not.toBeInTheDocument();
  });

  it("AC-2: backButton=true calls navigate(-1) once on click", () => {
    mockNavigate.mockClear();
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppTopBar, { title: "테스트", backButton: true })
      )
    );
    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("AC-3: navigate(-1) throws → navigate('/') called as fallback", () => {
    mockNavigate.mockClear();
    mockNavigate.mockImplementationOnce(() => {
      throw new Error("history empty");
    });
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppTopBar, { title: "테스트", backButton: true })
      )
    );
    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, -1);
    expect(mockNavigate).toHaveBeenNthCalledWith(2, "/");
  });

  it("AC-4: renders title via Top.TitleParagraph", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppTopBar, { title: "렌트체크" })
      )
    );
    expect(screen.getByRole("heading", { name: "렌트체크" })).toBeInTheDocument();
  });

  it("renders right slot when provided", () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppTopBar, {
          title: "테스트",
          right: React.createElement("button", null, "액션"),
        })
      )
    );
    expect(screen.getByRole("button", { name: "액션" })).toBeInTheDocument();
  });
});
