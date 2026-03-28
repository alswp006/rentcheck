# CLAUDE.md — 앱인토스 미니앱 코딩 규칙

## MANDATORY: Pre-submission Checklist (run BEFORE finishing)
1. **Run `npx tsc --noEmit`** — fix ALL TypeScript errors before finishing
2. **Run `npx vitest run`** (if test file exists) — fix failing tests
3. **Verify imports** — check that all imports resolve to existing files
4. **Check for duplicates** — ensure you didn't recreate something that already exists
5. **main.tsx 수정 금지** — @AI:ANCHOR 파일. ThemeProvider/BrowserRouter가 이미 설정됨
6. **App.tsx Route 확인** — navigate()로 이동하는 모든 경로에 Route가 있는지 확인
7. **RouteState 타입 확인** — navigate state가 types.ts의 RouteState와 일치하는지 확인

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
- Android 7+, iOS 16+ 호환 — 구버전 전용 API 사용 주의

## CRITICAL: TDS 컴포넌트 API (최우선 참조)
- `.ai-factory/tds-reference.txt` — 토스 공식 TDS LLM 문서 (코딩 전 반드시 읽을 것)
- `.ai-factory/tds-essential.txt` — 실제 .d.ts에서 검증된 핵심 API 요약
- 이 두 파일이 CLAUDE.md 또는 다른 문서와 충돌하면, 이 두 파일이 우선

## CRITICAL: TDS 환각 방지 — "모르면 지어내지 말고 확인하라"
- tds-essential.txt에 없는 prop/컴포넌트 → tds-reference.txt 확인 → 없으면 존재하지 않음
- 존재하지 않는 prop을 추측해서 사용하면 tsc 에러 → 절대 금지
- TDS로 구현 불확실한 UI → 기본 HTML + var(--tds-color-*) CSS 변수로 대체 (Tailwind 금지)

## Testing
- .claude/rules/testing.md에 테스트 규칙 + mock 패턴 있음 (반드시 참조)
- CRITICAL: TDS 컴포넌트는 jsdom에서 충돌 — testing.md의 mock 패턴 반드시 사용

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

## Shared Types (CRITICAL)
- src/lib/types.ts — 모든 도메인 타입 정의
- ALWAYS: import type { ... } from "@/lib/types"
- NEVER: 같은 타입을 다른 파일에서 재정의
