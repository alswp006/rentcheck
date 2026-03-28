import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockGenerateHapticFeedback = vi.fn();
vi.mock('@apps-in-toss/framework', () => ({
  generateHapticFeedback: mockGenerateHapticFeedback,
}));

vi.mock('@toss/tds-mobile', () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement('button', { onClick, ...props }, children),
  ListRow: Object.assign(
    ({ children, onClick, ...props }: any) =>
      React.createElement('div', { onClick, role: 'button', ...props }, children),
    {
      Text: ({ children }: any) => React.createElement('span', null, children),
      Texts: ({ top, bottom }: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement('span', null, top),
          React.createElement('span', null, bottom),
        ),
    },
  ),
  Spacing: ({ size }: any) => React.createElement('div', { 'data-testid': `spacing-${size}`, 'data-spacing': true }),
  Paragraph: {
    Text: ({ children, ...props }: any) => React.createElement('span', props, children),
  },
  Badge: ({ children }: any) => React.createElement('span', null, children),
  Top: Object.assign(
    ({ children }: any) => React.createElement('nav', null, children),
    { TitleParagraph: ({ children }: any) => React.createElement('h1', null, children) },
  ),
  BottomCTA: ({ children }: any) => React.createElement('div', { 'data-testid': 'bottom-cta' }, children),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderHomePage() {
  // Dynamic import to allow the mock to apply; use lazy require pattern
  const { default: HomePage } = require('@/pages/HomePage');
  return render(
    React.createElement(MemoryRouter, { initialEntries: ['/'] },
      React.createElement(HomePage),
    ),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('S1 홈 페이지(`/`) — 프리셋 선택 진입', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AC-1: 프리셋 ListRow 4개와 하단 CTA 버튼이 렌더링된다
  // ───────────────────────────────────────────────────────────────────────────
  it('AC-1: should render 4 preset ListRows', () => {
    renderHomePage();

    // 4 preset names expected from PRESET_SCENARIOS
    expect(screen.getByText('사회초년생 전세')).toBeTruthy();
    expect(screen.getByText('신혼부부 비교')).toBeTruthy();
    expect(screen.getByText('월세+투자 전략')).toBeTruthy();
    expect(screen.getByText('내집마련 집중')).toBeTruthy();
  });

  it('AC-1: should render bottom CTA button', () => {
    renderHomePage();

    // CTA button should be present (직접 입력 / 내 조건으로 계산 등)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AC-2: 프리셋 ListRow 탭 → navigate('/simulate', { state: { presetId, source: 'home' } })
  // ───────────────────────────────────────────────────────────────────────────
  it('AC-2: should navigate to /simulate with presetId and source:"home" when preset row is tapped', () => {
    renderHomePage();

    // Click the first preset row (사회초년생 전세)
    const firstPreset = screen.getByText('사회초년생 전세');
    fireEvent.click(firstPreset);

    expect(mockNavigate).toHaveBeenCalledWith('/simulate', {
      state: { presetId: 'preset_young_jeonse', source: 'home' },
    });
  });

  it('AC-2: should navigate with correct presetId for each preset row', () => {
    renderHomePage();

    const presets = [
      { name: '사회초년생 전세', id: 'preset_young_jeonse' },
      { name: '신혼부부 비교', id: 'preset_newlyweds_compare' },
      { name: '월세+투자 전략', id: 'preset_monthly_invest' },
      { name: '내집마련 집중', id: 'preset_buy_focus' },
    ];

    presets.forEach(({ name, id }) => {
      vi.clearAllMocks();
      fireEvent.click(screen.getByText(name));
      expect(mockNavigate).toHaveBeenCalledWith('/simulate', {
        state: { presetId: id, source: 'home' },
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AC-3: 하단 CTA 탭 → navigate('/simulate', { state: { source: 'home' } })
  // ───────────────────────────────────────────────────────────────────────────
  it('AC-3: should navigate to /simulate with only source:"home" when CTA button is tapped', () => {
    renderHomePage();

    // The CTA button is the last / main button (직접 입력하기 등)
    const buttons = screen.getAllByRole('button');
    const ctaButton = buttons[buttons.length - 1];
    fireEvent.click(ctaButton);

    expect(mockNavigate).toHaveBeenCalledWith('/simulate', {
      state: { source: 'home' },
    });
    // Must NOT include presetId
    const callArg = mockNavigate.mock.calls[0][1];
    expect(callArg.state).not.toHaveProperty('presetId');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AC-4: 햅틱 피드백 — 프리셋 탭: tickWeak, CTA: success
  // ───────────────────────────────────────────────────────────────────────────
  it('AC-4: should call generateHapticFeedback({ type:"tickWeak" }) when a preset row is tapped', () => {
    renderHomePage();

    fireEvent.click(screen.getByText('사회초년생 전세'));

    expect(mockGenerateHapticFeedback).toHaveBeenCalledWith({ type: 'tickWeak' });
  });

  it('AC-4: should call generateHapticFeedback({ type:"success" }) when CTA button is tapped', () => {
    renderHomePage();

    const buttons = screen.getAllByRole('button');
    const ctaButton = buttons[buttons.length - 1];
    fireEvent.click(ctaButton);

    expect(mockGenerateHapticFeedback).toHaveBeenCalledWith({ type: 'success' });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AC-5: Spacing 컴포넌트로만 간격 조절 (TDS 여백을 인라인/Tailwind로 덮지 않음)
  // ───────────────────────────────────────────────────────────────────────────
  it('AC-5: should render at least one Spacing component for spacing between elements', () => {
    const { container } = renderHomePage();

    // Our mock renders Spacing as <div data-spacing="true">
    const spacingDivs = container.querySelectorAll('[data-spacing="true"]');
    expect(spacingDivs.length).toBeGreaterThanOrEqual(1);
  });

  it('AC-5: should not apply inline margin or padding on ListRow wrappers', () => {
    const { container } = renderHomePage();

    // ListRows are rendered as <div role="button"> in our mock
    const listRows = container.querySelectorAll('[role="button"]');
    listRows.forEach((row) => {
      const el = row as HTMLElement;
      expect(el.style.margin).toBeFalsy();
      expect(el.style.padding).toBeFalsy();
    });
  });
});
