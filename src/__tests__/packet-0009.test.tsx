import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { HistoryEntry, SimulationInput } from "@/lib/types";

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

// ─── AppState mock ────────────────────────────────────────────────────────────
vi.mock("@/lib/state/useAppState", () => ({
  useAppState: () => ({
    loading: false,
    settings: {},
    entitlement: {},
    input: null,
    applyPreset: vi.fn(),
    updateField: vi.fn(),
    setInput: vi.fn(),
  }),
}));

// ─── StorageAdapter mock ──────────────────────────────────────────────────────
// Fix #3: use vi.hoisted() so mock fns are available before vi.mock() factories run
const { mockListHistory, mockDeleteHistoryById, mockClearHistory } = vi.hoisted(() => ({
  mockListHistory: vi.fn(),
  mockDeleteHistoryById: vi.fn(),
  mockClearHistory: vi.fn(),
}));

vi.mock("@/lib/storage/localStorageAdapter", () => ({
  storageAdapter: {
    listHistory: mockListHistory,
    deleteHistoryById: mockDeleteHistoryById,
    clearHistory: mockClearHistory,
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const baseInput: SimulationInput = {
  id: "test-input-9",
  presetId: null,
  jeonseDeposit: 300_000_000,
  jeonseLoanRatio: 0.5,
  jeonseInterestRate: 0.04,
  monthlyDeposit: 50_000_000,
  monthlyRent: 800_000,
  monthlyRentIncreaseRate: 0.03,
  buyPrice: 500_000_000,
  buyEquity: 150_000_000,
  buyLoanRate: 0.04,
  buyLoanPeriodYears: 30,
  buyRepaymentType: "AMORTIZED",
  initialAsset: 150_000_000,
  residenceYears: 5,
  investmentReturnRate: 0.05,
  housePriceGrowthRate: 0.03,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

// Fix #5: use a simple counter instead of parsing the id string
let entryCounter = 0;
const makeEntry = (id: string, label: string): HistoryEntry => ({
  id,
  label,
  input: { ...baseInput, id },
  createdAt: 1700000000000 + (++entryCounter),
  updatedAt: 1700000000000,
});

const sampleEntries: HistoryEntry[] = [
  makeEntry("entry-1", "전세 3억 · 5년"),
  makeEntry("entry-2", "월세 보증금 5천 · 3년"),
];

import HistoryPage from "../pages/HistoryPage";

function renderPage() {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(HistoryPage)),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("히스토리 페이지(/history): 최근 5개 조회/삭제/재실행", () => {
  // Fix #1: remove vi.resetModules() from beforeEach — only clear mock state
  beforeEach(() => {
    mockNavigate.mockClear();
    mockListHistory.mockClear();
    mockDeleteHistoryById.mockClear();
    mockClearHistory.mockClear();
    entryCounter = 0;
  });

  it("AC-1: 페이지 진입 시 listHistory({page:1, pageSize:5})를 1회 호출한다", async () => {
    mockListHistory.mockResolvedValue({
      ok: true,
      data: { items: sampleEntries, total: 2, page: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(mockListHistory).toHaveBeenCalledTimes(1);
      expect(mockListHistory).toHaveBeenCalledWith({ page: 1, pageSize: 5 });
    });
  });

  it("AC-2: items가 0개면 '아직 기록이 없어요' 텍스트가 표시되고 버튼 탭 시 /input으로 이동한다", async () => {
    mockListHistory.mockResolvedValue({
      ok: true,
      data: { items: [], total: 0, page: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("아직 기록이 없어요")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("지금 비교하러 가기"));
    expect(mockNavigate).toHaveBeenCalledWith("/input");
  });

  it("AC-3: items가 1개 이상이면 각 항목이 ListRow로 렌더되고 entry.label이 포함된다", async () => {
    mockListHistory.mockResolvedValue({
      ok: true,
      data: { items: sampleEntries, total: 2, page: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("전세 3억 · 5년")).toBeTruthy();
      expect(screen.getByText("월세 보증금 5천 · 3년")).toBeTruthy();
    });
    const rows = screen.getAllByTestId("list-row");
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("AC-4: 히스토리 항목 탭 시 /result로 navigate되며 state에 entry.input이 포함된다", async () => {
    mockListHistory.mockResolvedValue({
      ok: true,
      data: { items: [sampleEntries[0]], total: 1, page: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("전세 3억 · 5년")).toBeTruthy();
    });
    const rows = screen.getAllByTestId("list-row");
    fireEvent.click(rows[0]);
    expect(mockNavigate).toHaveBeenCalledWith(
      "/result",
      expect.objectContaining({ state: expect.objectContaining({ input: sampleEntries[0].input }) }),
    );
  });

  // Fix #2: scope delete button query to its row using within()
  it("AC-5: 개별 삭제 시 deleteHistoryById(entry.id)가 호출되고 성공 시 해당 항목이 목록에서 사라진다", async () => {
    mockListHistory.mockResolvedValue({
      ok: true,
      data: { items: sampleEntries, total: 2, page: 1 },
    });
    mockDeleteHistoryById.mockResolvedValue({ ok: true, data: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("전세 3억 · 5년")).toBeTruthy();
    });
    const firstRow = screen.getAllByTestId("list-row")[0];
    fireEvent.click(within(firstRow).getByRole("button", { name: /삭제/ }));
    await waitFor(() => {
      expect(mockDeleteHistoryById).toHaveBeenCalledWith("entry-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("전세 3억 · 5년")).toBeNull();
    });
  });

  // Fix #4: add failure path test for deleteHistoryById
  it("AC-5b: deleteHistoryById가 ok:false면 항목이 목록에서 제거되지 않고 에러 메시지가 표시된다", async () => {
    mockListHistory.mockResolvedValue({
      ok: true,
      data: { items: sampleEntries, total: 2, page: 1 },
    });
    mockDeleteHistoryById.mockResolvedValue({ ok: false, code: "DELETE_ERROR", message: "삭제 실패" });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("전세 3억 · 5년")).toBeTruthy();
    });
    const firstRow = screen.getAllByTestId("list-row")[0];
    fireEvent.click(within(firstRow).getByRole("button", { name: /삭제/ }));
    await waitFor(() => {
      expect(mockDeleteHistoryById).toHaveBeenCalledWith("entry-1");
    });
    // item must remain in the list
    expect(screen.getByText("전세 3억 · 5년")).toBeTruthy();
  });

  it("AC-6: 전체 삭제는 Dialog 확인 후 clearHistory()를 호출하며 성공 시 items가 0개 상태로 전환된다", async () => {
    mockListHistory.mockResolvedValue({
      ok: true,
      data: { items: sampleEntries, total: 2, page: 1 },
    });
    mockClearHistory.mockResolvedValue({ ok: true, data: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("전세 3억 · 5년")).toBeTruthy();
    });
    // Click "전체 삭제" button to open dialog
    fireEvent.click(screen.getByText("전체 삭제"));
    // Dialog should appear
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeTruthy();
    // Click confirm delete button in dialog
    fireEvent.click(screen.getByText("삭제"));
    await waitFor(() => {
      expect(mockClearHistory).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText("아직 기록이 없어요")).toBeTruthy();
    });
  });

  it("AC-7: listHistory가 ok:false면 '불러오지 못했어요'가 표시되고 '다시 불러오기' 탭 시 listHistory를 재호출한다", async () => {
    mockListHistory.mockResolvedValue({
      ok: false,
      code: "READ_ERROR",
      message: "읽기 오류",
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("불러오지 못했어요")).toBeTruthy();
    });
    expect(screen.getByText("다시 불러오기")).toBeTruthy();
    fireEvent.click(screen.getByText("다시 불러오기"));
    await waitFor(() => {
      expect(mockListHistory).toHaveBeenCalledTimes(2);
    });
  });
});
