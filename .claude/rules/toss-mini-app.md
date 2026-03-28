# App-in-Toss Mini App — Absolute Rules

## TDS Components Mandatory (Highest Priority)
- ALL UI MUST use TDS (@toss/tds-mobile) components exclusively
- shadcn/ui, MUI, Ant Design, Chakra UI → instant review rejection
- NEVER override TDS component margin/padding with Tailwind or inline styles
- Spacing: use TDS component built-in props (S/M/L/XL) or Spacing component only
- If .ai-factory/tds-reference.txt exists, read it FIRST — it is the official TDS LLM doc

## TDS Core 11 Components (assemble these like building blocks)
1. ListRow — list item (built-in padding S/M/L/XL)
2. Button — button (primary/secondary/ghost)
3. TextField — text input
4. Typography — text display (heading/body/caption)
5. Chip — tag/filter
6. Toggle — switch
7. Dialog — modal dialog
8. BottomSheet — bottom sheet
9. Toast — toast notification
10. AppBar — top navigation bar
11. TabBar — bottom tab bar

## Server-Side Code Forbidden
- No Next.js (Vite + React only, or granite framework)
- No API Routes, getServerSideProps, server components
- No Node.js-only modules (fs, path, crypto, better-sqlite3)
- Data storage: localStorage or Toss native storage SDK only (or external API via fetch)

## App-in-Toss SDK Required
- Auth: useTossLogin hook (custom auth implementation forbidden)
- Payment: useTossPayment hook (Stripe and external payment forbidden)
- Ads: useTossAd hook, AdSlot component, or TossRewardAd gate component
- Reward Ad Pattern: TossRewardAd wraps content behind ad viewing. Use for result/analysis screens:
  `<TossRewardAd slotId="result-unlock"><ResultContent /></TossRewardAd>`
  Only gate the final payoff moment — never intermediate steps or navigation
- Navigation: NEVER use window.location.href for external URLs → use Toss SDK navigation

## Native Vibe (토스 네이티브 품질 필수)
- **Haptic feedback**: 주요 CTA 버튼에 `generateHapticFeedback({ type: 'success' })`, Toggle/Chip에 `tickWeak` 적용
  - import: `import { generateHapticFeedback } from '@apps-in-toss/framework';`
- **Dark mode**: HEX 색상(#FFFFFF, #333 등) 하드코딩 절대 금지 — TDS 컴포넌트 또는 `var(--tds-color-*)` CSS 변수만 사용
- **Safe area**: `position: fixed` 하단 요소에 `paddingBottom: calc(Npx + env(safe-area-inset-bottom))` 필수. `height: 100vh` 단독 사용 금지 → `100dvh` 사용

## 생성형 AI 고지 의무 (해당 시 필수 — 위반 시 과태료 3,000만원)
앱이 AI 기반 결과물(추천/분석/요약/생성)을 사용자에게 노출하는 경우:
- 첫 이용 시 "이 서비스는 생성형 AI를 활용합니다" TDS Dialog로 1회 고지
- AI 결과물에 "AI가 생성한 결과입니다" TDS Typography(caption2, tertiary) 라벨 표시

## Bundle Limits
- Build output MUST be under 100MB
- Avoid heavy libraries: D3, Three.js, heavy charting libs
- Images/videos: use external CDN
