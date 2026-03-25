# CLAUDE.md — 앱인토스 미니앱 코딩 규칙

## MANDATORY: Pre-submission Checklist (run BEFORE finishing)
1. **Save all files** — ensure no unsaved changes
2. **Run `npx tsc --noEmit`** — fix ALL TypeScript errors before finishing
3. **Run `npx vitest run`** (if test file exists) — fix failing tests
4. **Verify imports** — check that all imports resolve to existing files
5. **Check for duplicates** — ensure you didn't recreate something that already exists

If any check fails, fix it BEFORE completing. Finishing with known errors is a failure.

## CRITICAL: STANDALONE Vite + React app
- INDEPENDENT app, NOT monorepo. Only import from node_modules or src/
- No @ai-factory/*, drizzle-orm, @libsql/client, better-sqlite3
- No Next.js — this is a Vite + React app
- State: useState, useReducer, or localStorage
- ALWAYS check existing code before creating new files — avoid duplicates

## CRITICAL: 배포 설정 (4031 에러 방지)
- granite.config.ts의 appName은 앱인토스 콘솔에 등록된 앱 이름과 대소문자까지 완벽히 일치해야 함
- appName을 절대 임의로 변경하지 마라 — 변경 시 배포 실패 (4031 에러)
- package.json의 name 필드도 동일하게 유지
- 빌드 결과물은 토스 CDN에 호스팅됨 — 동적 SSR 불가, 정적 빌드(CSR/SSG)만 가능

## CRITICAL: 토스 검수 통과 필수 규칙
- 만 19세 이상 유저만 이용 가능 — 미성년자 타겟 콘텐츠/UI 금지
- 외부 도메인 이탈(Outlink) 금지 — window.location.href, window.open으로 외부 URL 이동 금지
- 외부 링크 필요 시 토스 SDK의 네비게이션 API 사용
- 콘솔 에러(console.error) 0개 보장 — 검수 시 콘솔 에러가 있으면 반려
- CORS 에러 0개 보장 — 외부 API 호출 시 CORS 설정 필수 확인
- Android 7+, iOS 16+ 호환 — 구버전 전용 API (IntersectionObserver v2, CSS container queries 등) 사용 주의

## CRITICAL: TDS 공식 LLM 레퍼런스 (최우선 참조)
- `.ai-factory/tds-reference.txt`에 토스가 AI 에이전트용으로 공식 제공하는 TDS 컴포넌트 문서가 있음
- 코딩 시작 전 반드시 이 파일을 읽고, TDS 컴포넌트의 정확한 API/props를 확인할 것
- 이 문서의 API가 아래 CLAUDE.md 내용과 충돌하면, tds-reference.txt가 우선

## CRITICAL: 앱인토스 규칙
- Next.js 사용 금지. Vite + React + TypeScript만 사용
- shadcn/ui, MUI, Ant Design, Chakra UI 사용 금지 — 검수 즉시 반려
- UI 컴포넌트는 반드시 @toss/tds-mobile에서 import
- 서버 사이드 로직 금지 (API Routes, getServerSideProps 등)
- window.localStorage 사용 가능 (간단한 데이터 저장)
- 인증: useTossLogin 훅 사용 (자체 인증 구현 금지)
- 결제: useTossPayment 훅 사용 (Stripe 등 외부 결제 금지)
- 광고: useTossAd 훅 또는 AdSlot 컴포넌트 사용
- 외부 도메인 이동: window.location.href 직접 변경 금지

## CRITICAL: TDS 스타일링 규칙 (위반 시 검수 반려)
- TDS 컴포넌트에는 이미 완벽한 padding/margin이 내장되어 있음
- Tailwind CSS나 인라인 스타일로 TDS 컴포넌트의 여백을 덮어쓰지 마라
- 간격 조절이 필요하면 TDS의 Spacing 컴포넌트나 ListRow의 내장 패딩(S/M/L/XL)만 사용
- 커스텀 CSS는 TDS가 제공하지 않는 레이아웃(flex, grid 배치)에만 허용

## TDS 컴포넌트 정확한 API (환각 방지 — 이것만 사용)
```tsx
// 모든 TDS 컴포넌트는 단일 패키지에서 import
import { Button, ListRow, TextField, Tab, Spacing, Badge, AlertDialog, Paragraph, Toast, BottomSheet, BottomCTA, Top, Border } from '@toss/tds-mobile';
```

### Button
- variant: 'fill' | 'weak' (NOT 'secondary', 'tertiary', 'outline', 'ghost')
- color: 'primary' | 'danger' | 'light' | 'dark'
- size: 'small' | 'medium' | 'large' | 'xlarge'

### Typography (Paragraph.Text)
```tsx
<Paragraph.Text typography="t3">제목</Paragraph.Text>
<Paragraph.Text typography="st6">본문</Paragraph.Text>
```
- ONLY these values: t1~t7, st1~st13
- FORBIDDEN: b1, b2, c1, c2 (존재하지 않음!)

### Tab (compound component)
```tsx
<Tab>
  <Tab.Item selected={tab === 0} onClick={() => setTab(0)}>전세</Tab.Item>
  <Tab.Item selected={tab === 1} onClick={() => setTab(1)}>월세</Tab.Item>
</Tab>
```
- NOT value/onChange/items pattern

### TextField
- props: variant="box", label, help (NOT helperText), hasError, suffix, inputMode, value, onChange

### AlertDialog
```tsx
<AlertDialog open={open} title="제목" description="설명"
  alertButton={<><AlertDialog.AlertButton onClick={onConfirm}>확인</AlertDialog.AlertButton><AlertDialog.AlertButton onClick={onCancel}>취소</AlertDialog.AlertButton></>}
  onClose={() => setOpen(false)} />
```
- NOT buttons array

### Toast
```tsx
<Toast open={open} text="메시지" position="bottom" onClose={() => setOpen(false)} />
```
- MUST have text prop (NOT children), MUST have position

### Top (AppBar)
```tsx
<Top><Top.TitleParagraph>페이지 제목</Top.TitleParagraph></Top>
```
- NOT title prop, NOT onBackClick

### ListRow
- ListRow.Text (single text), ListRow.Texts (multi-line)
- NOT ListRow.Text2, NOT ListRow.Arrow
```

## 파일 구조
- src/App.tsx: 메인 앱 + React Router 라우팅
- src/pages/: 페이지 컴포넌트 (React Router route별)
- src/components/: 재사용 컴포넌트 (TDS 래핑)
- src/hooks/: 커스텀 훅 (useTossLogin, useTossAd 등)
- src/lib/: 유틸리티, 타입, 스토리지 헬퍼
- src/__tests__/: vitest 테스트

## Routing (React Router)
```tsx
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
// 네비게이션: useNavigate() 훅 사용
// 파라미터: useParams() 훅 사용
// Link: import { Link } from 'react-router-dom'
```

## Pre-built Hooks (DO NOT RECREATE — 이미 구현됨)
- src/hooks/useTossLogin.ts — 토스 로그인 (개발환경 자동 테스트 유저, 앱환경 SDK 호출)
- src/hooks/useTossAd.ts — 토스 인앱 광고 (슬롯 기반, 리워드 광고)
- src/hooks/useTossPayment.ts — 토스페이 인앱 결제 (상품 결제, 개발환경 시뮬레이션)
- src/components/AdSlot.tsx — 광고 영역 컴포넌트 (data-ad-slot 기반)
- CRITICAL: 이 훅들을 import해서 사용하라. 자체 인증/결제/광고 로직 구현 금지

## Data Storage (localStorage)
- src/lib/storage.ts — getItem/setItem/removeItem 헬퍼 (이미 존재)
- 복잡한 상태: useState + localStorage 동기화
- 서버가 필요하면 외부 API 서버를 fetch()로 호출

## Design Documents
- `.ai-factory/spec.md` — Full SPEC with features, ACs, data models
- `.ai-factory/prd.md` — Product Requirements Document
- `.ai-factory/task.md` — Epic/Task breakdown
- When implementing a packet, ALWAYS read `.ai-factory/spec.md` first.
- Do NOT modify any files in `.ai-factory/`.

## Code Context Tags
- `@AI:ANCHOR` — NEVER modify these lines or functions.
- `@AI:WARN` — Modify only if absolutely necessary.
- `@AI:NOTE` — Business logic with specific reasoning.

## Git Context Memory
- Recent commits contain `## Context (AI-Developer Memory)` sections
- ALWAYS respect decisions from previous packets

## Commands
- npm install (NOT pnpm)
- npx tsc --noEmit (typecheck)
- npx vitest run (tests)
- npx vite (dev server)
- npx vite build (production build)

## Testing (CRITICAL — 환각 방지)
- Write tests in src/__tests__/packet-{id}.test.ts
- Use vitest: import {describe,it,expect} from "vitest"
- Use @/ alias for imports
- Test business logic and utility functions
- Run npx vitest run before finishing

### MANDATORY: react-router-dom mock (NOT next/router)
This is a Vite + React Router app. NEVER mock next/router.
```typescript
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});
```

### MANDATORY: TDS mock for jsdom (TDS components crash in jsdom)
```typescript
vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, ...props }: any) => React.createElement("button", { onClick, ...props }, children),
  ListRow: Object.assign(
    ({ children, onClick, ...props }: any) => React.createElement("div", { onClick, ...props }, children),
    { Text: ({ children }: any) => React.createElement("span", null, children),
      Texts: ({ top, bottom }: any) => React.createElement(React.Fragment, null, React.createElement("span", null, top), React.createElement("span", null, bottom)) }
  ),
  Spacing: () => React.createElement("div"),
  Paragraph: { Text: ({ children, ...props }: any) => React.createElement("span", props, children) },
  Badge: ({ children }: any) => React.createElement("span", null, children),
  AlertDialog: Object.assign(
    ({ open, title, description, alertButton }: any) => open ? React.createElement("div", { role: "alertdialog" }, title, description, alertButton) : null,
    { AlertButton: ({ children, onClick }: any) => React.createElement("button", { onClick }, children) }
  ),
  Toast: ({ open, text }: any) => open ? React.createElement("div", { role: "status" }, text) : null,
  Tab: Object.assign(
    ({ children }: any) => React.createElement("div", { role: "tablist" }, children),
    { Item: ({ children, selected, onClick }: any) => React.createElement("button", { role: "tab", "aria-selected": selected, onClick }, children) }
  ),
  TextField: React.forwardRef(({ label, help, hasError, ...props }: any, ref: any) => React.createElement("div", null, React.createElement("label", null, label), React.createElement("input", { ref, ...props }), hasError && help && React.createElement("span", null, help))),
  Top: Object.assign(
    ({ children }: any) => React.createElement("nav", null, children),
    { TitleParagraph: ({ children }: any) => React.createElement("h1", null, children) }
  ),
  Border: () => React.createElement("hr"),
  BottomCTA: ({ children }: any) => React.createElement("div", null, children),
  BottomSheet: Object.assign(
    ({ children, open }: any) => open ? React.createElement("div", { role: "dialog" }, children) : null,
    { Header: ({ children }: any) => React.createElement("div", null, children) }
  ),
}));
```

### MANDATORY: Wrap renders in MemoryRouter
```typescript
import { MemoryRouter } from "react-router-dom";
render(React.createElement(MemoryRouter, null, React.createElement(MyPage)));
```

### AppState mock must include setInput
```typescript
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ input: mockInput, applyPreset: vi.fn(), updateField: vi.fn(), setInput: vi.fn() }),
  AppStateProvider: ({ children }: any) => children,
}));
```

## Code Quality (CRITICAL — AI reviewed)
- Single Responsibility: Each component ONE thing. Extract if >150 lines.
- DRY: Check existing code first. Import and reuse.
- Error Handling: try/catch on every fetch. Loading + error states.
- TypeScript: Explicit return types. No `any`.
- No Magic Numbers: Named constants.
- Performance: useMemo/useCallback where appropriate.

## UI Design Rules
- 모바일 퍼스트 (토스 앱은 모바일)
- 터치 타겟: 최소 44px
- 한국어 기본 (토스 유저 대상)
- 토스 브랜드 컬러: #3182F6 (primary)
- 광고 슬롯: 콘텐츠 사이, 결과 화면 하단에 배치 (AdSlot 컴포넌트 사용)
- 로딩: 스피너 또는 스켈레톤
- 에러: 에러 메시지 + 재시도 버튼
- 빈 상태: 아이콘 + 설명 + CTA 버튼

## FORBIDDEN
- Next.js imports (next/link, next/image, next/router)
- shadcn/ui, MUI, Ant Design, Chakra UI
- Server-side code (API routes, getServerSideProps)
- @ai-factory/*, drizzle-orm, @libsql/client
- better-sqlite3 or any Node.js-only modules
- Inline styles when CSS class exists (prefer CSS modules or Tailwind if configured)

## Shared Types (CRITICAL)
- src/lib/types.ts — 모든 도메인 타입 정의
- ALWAYS: import type { ... } from "@/lib/types"
- NEVER: 같은 타입을 다른 파일에서 재정의

## Final Checklist
1. npx tsc --noEmit — zero errors
2. npx vitest run — all tests pass
3. npx vite build — builds successfully
4. TDS 컴포넌트만 사용 (shadcn/ui 금지)
5. 서버 사이드 코드 없음
