# App-in-Toss Development Master Guide for AI Agents

This document contains the absolute rules and key information from the latest official Toss documentation (2026) for developing mini-apps that run inside the Toss app. The AI MUST prioritize these rules above all else when generating code.

## 1. Architecture & Runtime Environment
- **Rendering:** App-in-Toss WebView supports SSG (Static Site Generation) or CSR (Client-Side Rendering) ONLY. **Dynamic SSR (Server-Side Rendering) is strictly forbidden.** If using Next.js, `next.config.mjs` MUST include `output: 'export'`.
- **Minimum OS support:** Android 7+, iOS 16+.
- **Routing scheme:** Use `intoss://{appName}` scheme for sandbox and production testing.

## 2. Dependencies & Package Installation
NEVER hardcode non-existent old versions (e.g., `^1.0.0`). Toss packages on public npm are at `2.x.x` or later. Always use `@latest`.
- **Install command:** `npm install @apps-in-toss/web-framework@latest @toss/tds-mobile@latest @emotion/react@^11`
- **TDS is mandatory:** Building custom UI (CSS, Tailwind) to mimic TDS components is grounds for immediate review rejection. Absolutely forbidden.

## 3. Configuration (`granite.config.ts`)
- `appName`: English app ID registered in console (MUST match exactly, case-sensitive — mismatch causes 4031 deploy error)
- `displayName`: User-facing app name
- `primaryColor`: TDS theme color (RGB HEX, e.g., `#3182F6`)
- `webViewProps.type`: `partner` for non-game, `game` for game apps (determines navigation bar style)
- `permissions`: Device permissions as array (e.g., `{ name: "clipboard", access: "write" }`)

## 4. TDS (Toss Design System) Absolute Rules
- **NEVER override margin/padding:** TDS components have built-in padding — NEVER add Tailwind or inline margin/padding. For spacing between components, use TDS `Spacing` component (size prop required). Note: ListRow has NO padding prop.
- **Use auto-layout:** When extra spacing between components is needed, use Flexbox `gap` property only.
- **No external fonts:** Toss Products Sans system font is applied automatically.

## 5. Core API & SDK Integration
NEVER build Toss features from scratch. Always call the SDK APIs.
- **WebView control:** Configure swipe back (`allowsBackForwardNavigationGestures`), bounce (`bounces`), autoplay (`mediaPlaybackRequiresUserAction`) via `webViewProps`.
- **Haptic feedback:** Use SDK haptics for button interactions:
  ```typescript
  import { generateHapticFeedback } from '@apps-in-toss/framework';
  generateHapticFeedback({ type: "tickWeak" });
  ```
- **Storage:** Use Toss native storage hooks (SDK `setItem`, `getItem`) for user data persistence.

## 6. Deployment
- Deploy to Toss CDN (NOT Vercel, AWS, or external clouds).
- Pipeline deploy command: `npx ait deploy --api-key $APPS_IN_TOSS_API_KEY`

## 7. Review Checklist (Must Pass All)
- Users must be 19+ years old — no content targeting minors
- No external domain navigation (outlinks) — all flows must complete within the app
- Zero console.error in production build
- Zero CORS errors on external API calls
- Android 7+ / iOS 16+ compatible Web APIs only
