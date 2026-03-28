# Testing Rules

## Basics
- Use vitest with jsdom environment
- Use @testing-library/react for component tests
- Test files in src/__tests__/packet-{id}.test.ts
- Run: npx vitest run (single run)
- Use @/ alias for imports
- Test business logic and utility functions
- 3-5 focused tests covering happy path + edge cases
- Coverage not required for mini apps

## MANDATORY: react-router-dom mock (NOT next/router)
This is a Vite + React Router app. NEVER mock next/router.
```typescript
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});
```

## MANDATORY: TDS mock for jsdom (TDS components crash in jsdom)
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

## MANDATORY: Wrap renders in MemoryRouter
```typescript
import { MemoryRouter } from "react-router-dom";
render(React.createElement(MemoryRouter, null, React.createElement(MyPage)));
```

## AppState mock must include setInput
```typescript
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ input: mockInput, applyPreset: vi.fn(), updateField: vi.fn(), setInput: vi.fn() }),
  AppStateProvider: ({ children }: any) => children,
}));
```
