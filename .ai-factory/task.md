# UPDATED TASK (Gaps 반영 완료본)

> 목표: PRD에서 언급된 **공유(카카오톡 등) / 공통 슬라이더(집값상승률·수익률) / 결과 근거(카드·차트·비용표)**가 SPEC/Task 레벨에서 “계약(AC/DoD)”으로 명확해지도록 TASK를 **추가/수정**한다.  
> 제약: Vite+React+TS, TDS(@toss/tds-mobile) UI 우선, React Router, localStorage. 서버 없음. Toss Login/Ad/Payment 템플릿 훅/컴포넌트는 변경 없이 사용.

---

## Epic 1. TypeScript types + interfaces

### Task 1.1 [Define domain/storage/share + RouteState types]
- Description: 스펙의 모든 엔티티/스토리지 스키마/공유 payload/시뮬레이션 결과 타입과 **RouteState 계약**을 `src/lib/types.ts`에 선언한다.
- DoD:
  - `src/lib/types.ts`에서 아래가 **export** 된다:
    - `PresetScenario`, `SimulationInput`, `BuyRepaymentType`
    - `SimulationResultCore`, `SimulationResult`, `NetWorthPoint`, `CostBreakdownRow`, `RecommendedOption`
    - `HistoryEntry`, `HistoryStorageV1`, `PurchaseStorageV1`, `LastShareStorageV1`
    - `SharePayload`, `CreateShareUrlError`
    - `RouteState` (필수: `/result`, `/input`, `/purchase` 포함)
    - (계산/검증/공유 유틸을 위한) `OptionKey = 'jeonse'|'monthly'|'buy'`, `OptionFeasibility` 등 필요한 보조 타입
  - `tsc`에서 타입 에러 없이 컴파일된다.
- Covers: [AC-S1-2, AC-S1-4, AC-S2-1, AC-S2-6, AC-S3-6, AC-S4-4, AC-S5-4, AC-S5-5, AC-S6-1]
- Files: [`src/lib/types.ts`]
- Depends on: none

---

## Epic 2. Data layer (storage helpers, validation, simulate, state)

> **병렬 작업 충돌 방지 규칙(추가):** storage 관련 파일은 Task별 “파일 소유권”을 고정한다.  
> - 2.1만 `keys.ts/json.ts` 수정  
> - 2.2만 `purchase.ts/lastShare.ts` 수정  
> - 2.3만 `history.ts` 수정  
> 또한 merge conflict 최소화를 위해 2.3이 2.2에 **순차 의존**하도록 조정한다.

### Task 2.1 [Storage primitives: keys + safe JSON helpers]
- (동일)
- Files:
  - `src/lib/storage/keys.ts`
  - `src/lib/storage/json.ts`
- Depends on: Task 1.1

### Task 2.2 [Purchase + LastShare storage CRUD]
- (동일)
- Files:
  - `src/lib/storage/purchase.ts`
  - `src/lib/storage/lastShare.ts`
- Depends on: Task 2.1

### Task 2.3 [History storage CRUD + eviction + deletion] (dependency 조정)
- (동일)
- DoD(명시 보강):
  - `upsertHistoryEntry(entry)` 호출 직후 **반환값/재조회 모두** `entries.length <= 5`를 만족한다.
  - eviction 기준은 `createdAt` 오름차순으로 가장 오래된 항목부터 제거한다.
- Files:
  - `src/lib/storage/history.ts`
- Depends on: **Task 2.2**, Task 2.1, Task 1.1

### Task 2.4 [Validation helpers (authoritative constraints + feasibility)]
- (동일)
- Files:
  - `src/lib/validation.ts`
- Depends on: Task 1.1

### Task 2.5 [simulate(input) pure function + recommended/insight]
- (동일)
- Files:
  - `src/lib/simulate.ts`
- Depends on: Task 1.1, Task 2.4

### Task 2.6 [Share encode/decode utilities (Base64url, length limit)]
- (동일)
- Files:
  - `src/lib/share.ts`
- Depends on: Task 1.1

### Task 2.7 [State management: Purchase + History providers/hooks]
- (동일)
- Files:
  - `src/state/PurchaseContext.tsx`
  - `src/state/HistoryContext.tsx`
- Depends on: Task 2.2, Task 2.3

### Task 2.8 [Local metrics (MVP 대체 계측): simulate 실행 카운터]
- Description: PRD 목표(월간 시뮬레이션 횟수)와 연결되는 최소 계측으로, 외부 전송 없이 localStorage에 **실행 횟수만 누적**하는 유틸을 추가한다(추후 교체 가능).
- DoD:
  - `incrementSimulateCount()` 호출 시 localStorage 키 `rentcheck:metrics:v1`에 `{ v:1, simulateCount:number, updatedAt:number }`가 저장된다.
  - 저장 실패/파싱 실패 시에도 throw 없이 no-op으로 종료한다(콘솔 에러 금지).
- Covers: (PRD Goal 대응용 — AC 직접 매핑 없음)
- Files:
  - `src/lib/metrics.ts`
- Depends on: Task 2.1

---

## Epic 3. Core UI pages (src/pages/) — ONE page per task

### Task 3.1 [/ HomePage: presets 4 + manual entry CTA]
- (동일)
- Files:
  - `src/pages/HomePage.tsx`
  - `src/lib/presets.ts`
- Depends on: Task 2.4, Task 1.1

---

### Task 3.2 [/ InputPage: 3-tab form + validation + **공통 슬라이더(집값상승률/수익률)** + keyboard scrollIntoView] (**수정됨**)
- Description: `/input`에서 TabBar(전세/월세/매매) + 공통 설정 입력 폼을 구현하고, prefill 적용/유효성/초기자산 가능여부/제출 네비게이션/키보드 스크롤 보정 + **집값상승률/수익률을 빠르게 조정하는 슬라이더 UI**를 제공한다.
- DoD:
  - `location.state as RouteState['/input']`로 prefill을 받아 초기값 반영(AC-S2-6)
  - 숫자 필드 `monthlyRent` TextField는 `inputMode="numeric"`를 가진다(렌더된 DOM 확인 가능)
  - 각 TextField onFocus 시 해당 행(ref)을 `scrollIntoView({ block:'center' })` 호출 (300ms 내 트리거)

  - **공통 슬라이더(추가 요구사항 / PRD gap 해소):**
    - 공통 설정 섹션에 아래 2개 컨트롤이 존재한다.
      - `housePriceGrowthRate` 조정 슬라이더
      - `investmentReturnRate` 조정 슬라이더
    - 각 슬라이더는 DOM에 아래 조건을 만족한다(패스/페일 명확화):
      - `<input type="range">` 요소가 존재하며 `data-testid="housePriceGrowthRate-slider"` / `data-testid="investmentReturnRate-slider"`를 가진다.
      - 슬라이더 값이 변경되면, 같은 섹션 내 `Typography`에 **현재 퍼센트 값(예: `3%`)**이 즉시 반영된다.
      - 슬라이더 조작 후 “결과 보기”를 눌러 `/result`로 전달된 `input.housePriceGrowthRate`, `input.investmentReturnRate`가 슬라이더 값과 일치한다.

  - 검증:
    - `buyEquity > buyPrice`면 `"자기자본은 매매가를 넘을 수 없어요"` 표시 + 제출 버튼 disabled
    - `residenceYears`가 0 또는 31 이상이면 `"거주기간은 1~30년만 입력할 수 있어요"` 표시 + navigate 금지
    - 전세 금리 35 입력 시 `"금리는 0~30%만 입력할 수 있어요"` 표시
    - `initialAsset`에 `"12,000,000원"` 붙여넣기 후 제출 시 `"숫자만 입력해주세요"` 표시 + navigate 금지
    - 3옵션 모두 초기자산 부족이면 제출 버튼 disabled 유지
  - 제출 성공 시 `/result`로 `{ source:'manual', input }` 전달 (RouteState 일치)
- Covers:
  - [AC-S2-1, AC-S2-2, AC-S2-3, AC-S2-4, AC-S2-5, AC-S2-6]
  - [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-6, F2-AC-7, F2-AC-8]
  - (PRD gap) “공통 슬라이더(집값/수익률)”
- Files:
  - `src/pages/InputPage.tsx`
- Depends on: Task 2.4, Task 1.1

---

### Epic 3A. Result UI components (근거 확보: 카드/차트/비용표) — small packets
> ResultPage(3.3)를 “오케스트레이션”으로 가볍게 유지하기 위해 결과 표시를 컴포넌트로 분리한다.  
> **주의:** 컴포넌트도 UI는 TDS 컴포넌트 기반(텍스트/행/버튼/토스트/바텀시트 등)으로 구성.

#### Task 3A.1 [OptionResultCards: 옵션 3종 요약 카드(근거/비교)]
- Description: 전세/월세/매매 3옵션을 요약 카드 형태로 보여주는 컴포넌트를 만든다.
- DoD:
  - `src/pages/components/OptionResultCards.tsx` export
  - 입력 props:
    - `recommendedOption: OptionKey`
    - `feasibility: Record<OptionKey, OptionFeasibility>`
    - `resultCore: SimulationResultCore`
  - 렌더 조건:
    - 3개 옵션 섹션이 항상 렌더링된다.
    - infeasible 옵션은 값 대신 `Typography`로 `"초기자산 부족"`이 표시된다.
    - recommendedOption과 일치하는 옵션에는 `Chip`(예: “추천”)이 1개 표시된다.
- Covers: [AC-S3-4, AC-S3-5, AC-S3-6] (결과 표기 근거 강화)
- Files:
  - `src/pages/components/OptionResultCards.tsx`
- Depends on: Task 1.1, Task 2.5, Task 2.4

#### Task 3A.2 [CostBreakdownTable: 비용표(근거) 컴포넌트]
- Description: 옵션별 비용 breakdown을 ListRow 기반 테이블 형태로 표시한다.
- DoD:
  - `src/pages/components/CostBreakdownTable.tsx` export
  - 비용 행은 `CostBreakdownRow[]`를 받아 `ListRow`로 렌더링한다.
  - 옵션별 섹션 제목이 `Typography`로 존재한다(전세/월세/매매).
  - 비용 데이터가 없는(예: infeasible) 옵션은 해당 섹션에서 `"초기자산 부족"`만 표시하고 ListRow 비용행은 0개 렌더.
- Covers: [AC-S3-6] (비용표 근거 확보)
- Files:
  - `src/pages/components/CostBreakdownTable.tsx`
- Depends on: Task 1.1, Task 2.5

#### Task 3A.3 [NetWorthChart: 순자산 차트(툴팁/히트영역)]
- Description: 순자산 추이를 표시하는 커스텀 차트 컴포넌트를 만든다(SVG 권장). 텍스트/레이아웃은 TDS로 처리한다.
- DoD:
  - `src/pages/components/NetWorthChart.tsx` export
  - 포인트 탭 시 툴팁에 `"5년"` 텍스트가 포함된다(연도 표기).
  - 툴팁에 전세/월세/매매 값 텍스트가 각각 포함된다.
  - 포인트 hit area 반경 22px 이상(투명 원/rect 등으로 클릭영역 확보)
- Covers: [F4-AC-1, F4-AC-2, F4-AC-3] (차트 상호작용)
- Files:
  - `src/pages/components/NetWorthChart.tsx`
- Depends on: Task 1.1

#### Task 3A.4 [ShareSection: 공유(카카오톡 등) + 클립보드 + lastShare 저장]
- Description: 결과 공유 UI/로직을 컴포넌트로 분리한다. “카카오톡 공유” 요구는 **Web Share 시트(공유 대상 앱 목록)**로 충족한다(특정 앱 직접 연동은 하지 않음).
- DoD:
  - `src/pages/components/ShareSection.tsx` export
  - “공유하기” 버튼이 존재하며 버튼 탭 시 아래 로직을 수행:
    - `createShareUrl({v:1, input})` 성공 & `navigator.share` 존재 시 `navigator.share(...)`를 **1회 호출**(인자에 url 포함)
    - share 미지원 → 클립보드 복사 성공: Toast `"링크를 복사했어요"`, 실패: `"공유를 사용할 수 없어요"`
    - share reject: Toast `"공유를 완료하지 못했어요"`
    - createShareUrl 실패 TOO_LONG/ENCODE_FAILED: 각각 Toast `"공유 링크가 너무 길어요"` / `"공유 링크를 만들 수 없어요"`
  - 공유 성공(share resolve 또는 클립보드 복사 성공) 시 `setLastShareStorage()`가 1회 호출되어 timestamp가 저장된다.
  - 외부 URL 이동(window.open/location.href) 코드 없음.
- Covers: [AC-S3-7, AC-S3-8, AC-S6-4] (공유/저장)
- Files:
  - `src/pages/components/ShareSection.tsx`
- Depends on: Task 2.6, Task 2.2, Task 1.1

---

### Task 3.3 [/ ResultPage: reward gate + 결과(카드/차트/비용표) 조합 + share + history save] (**수정됨: 근거 UI/공유 명확화 + metrics**)
- Description: `/result` 결과 화면을 구현한다. route state 검증, 구매 여부에 따른 TossRewardAd 게이트, 결과 렌더(카드/차트/비용표), AdSlot 배치, 공유, “광고 없이 결과 보기” 이동, 히스토리 자동 저장, simulate 실행 카운터를 포함한다.
- DoD:
  - `const state = location.state as RouteState['/result'] | null`로 읽고:
    - state/input 없으면 `"잘못된 접근입니다"`만 표시 + 결과 콘텐츠 미표시
  - 구매 상태:
    - `adSkipPurchased=false`면 결과 콘텐츠는 TossRewardAd 완료 전 노출되지 않는다 + 로딩 중 `"광고 로딩 중..."` 표시 경로 존재
    - `adSkipPurchased=true`면 TossRewardAd 없이 결과 콘텐츠가 표시(1초 이내)
  - 계산 상태:
    - simulate 실행 중 `"계산 중..."` 텍스트가 표시되는 경로가 존재한다(최소 1프레임 가능)
    - simulate 성공 시 `incrementSimulateCount()`가 **1회 호출**된다.
  - 검증/가능여부:
    - 1옵션 이상 가능이면 결과 렌더
    - 3옵션 모두 불가면 `"초기자산이 부족해요"` 에러 상태 + **카드/차트/비용표/공유 버튼** 미표시
  - 결과 근거 UI(PRD gap 해소):
    - `OptionResultCards`가 렌더링된다(옵션 3종 요약 카드)
    - `NetWorthChart`가 렌더링된다(툴팁/히트영역 조건은 컴포넌트 DoD로 검증)
    - `CostBreakdownTable`이 렌더링된다(비용표)
  - AdSlot 1개를 **차트 섹션 다음/비용표 이전**에 배치(overlay/fixed 금지)
  - 공유:
    - `ShareSection`이 렌더링되며, 내부 DoD(share/clipboard/toast/lastShare 저장)를 만족한다.
  - “광고 없이 결과 보기” 버튼:
    - 미구매 상태에서 탭 시 `/purchase`로 `{ from:'result' }` 전달
  - 히스토리 자동 저장(최대 5개 유지): 결과가 유효(3옵션 모두 불가 제외)하게 표시되는 시점에 1회 저장
- Covers:
  - [AC-S3-1, AC-S3-2, AC-S3-3, AC-S3-4, AC-S3-5, AC-S3-6, AC-S3-7, AC-S3-8]
  - [F3-AC-7]
  - [F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-5, F4-AC-6, F4-AC-7, F4-AC-8]
  - (PRD gap) “결과 화면 카드/차트/비용표”, “카카오톡 등으로 공유”
- Files:
  - `src/pages/ResultPage.tsx`
- Depends on:
  - Task 2.2, Task 2.3, Task 2.4, Task 2.5, Task 2.6, Task 2.7, Task 2.8, Task 1.1
  - Task 3A.1, Task 3A.2, Task 3A.3, Task 3A.4

---

### Task 3.4 [/ HistoryPage: list/empty/error + delete dialogs]
- (동일)
- Files:
  - `src/pages/HistoryPage.tsx`
- Depends on: Task 2.7, Task 1.1

### Task 3.5 [/ SharePage: decode p + error states + route to result/input]
- (동일)
- Files:
  - `src/pages/SharePage.tsx`
- Depends on: Task 2.6, Task 1.1

### Task 3.6 [/ PurchasePage: payment flow + persistence + states]
- (동일)
- Files:
  - `src/pages/PurchasePage.tsx`
- Depends on: Task 2.2, Task 2.7, Task 1.1

---

## Epic 4. Integration + polish (routing wiring, ad placement, final UX)

### Task 4.1 [Router wiring + App entry navigation]
- (동일)
- Files:
  - `src/App.tsx`
- Depends on:
  - Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6

### Task 4.2 [UX consistency + policy guard: loading 문구/외부이동 금지/외부 API 금지/타입 단일소스 점검] (**수정됨**)
- Description: 전 화면 로딩/빈/에러 문구를 스펙과 일치시키고, Toss 검수 리스크(외부 이동, console.error, 외부 API 호출)를 코드 검색 기반으로 제거/차단한다. 또한 타입 단일 소스(`src/lib/types.ts`) 사용을 점검한다.
- DoD:
  - 로딩 문구:
    - History: `"로딩 중..."`(최소 1프레임)
    - Share: `"불러오는 중..."`
    - Result: `"광고 로딩 중..."`, `"계산 중..."` 경로 존재
    - Purchase: `"결제 처리 중..."`
  - **외부 이동 금지 점검**: `src/` 하위에서 `window.open` 또는 `window.location.href` 문자열 검색 결과가 0건이다.
  - **console.error 금지 점검**: `src/` 하위에서 `console.error` 문자열 검색 결과가 0건이다.
  - **외부 API 호출(Non-goal) 점검**: `src/` 하위에서 `fetch(`, `axios`, `XMLHttpRequest` 문자열 검색 결과가 0건이다.
  - **타입 단일 소스 점검**: `src/pages/**`, `src/state/**`, `src/lib/**`에서 도메인 타입이 중복 선언되지 않고, 필요한 타입은 `src/lib/types.ts`에서 import한다(코드리뷰 체크리스트로 확인 가능).
- Covers: [AC-S1-5, AC-S3-7, AC-S3-8, AC-S4-1, AC-S5-2, AC-S6-3, F4-AC-8]
- Files:
  - (수정 발생 범위) `src/pages/*.tsx`, `src/pages/components/*.tsx`, `src/lib/**/*.ts`, `src/state/*.tsx`
- Depends on: Task 4.1

---

## 변경 요약(Report의 GAP 대응)

- **공유(카카오톡 등) 명확화**: `ShareSection` 컴포넌트(Task 3A.4)로 분리하고, `navigator.share` 기반(공유 시트에 카카오톡 포함 가능) + 미지원 시 클립보드 대체를 **DoD로 계약화**.
- **공통 슬라이더(집값상승률/수익률)**: InputPage(Task 3.2) DoD에 `<input type="range">` 기반 슬라이더 2개를 **pass/fail 가능한 조건**으로 추가.
- **결과 근거(카드/차트/비용표)**: Result UI를 컴포넌트(Task 3A.1~3A.3)로 쪼개고 ResultPage(Task 3.3) DoD에 “반드시 렌더” 조건을 추가.
- **Goal 계측 최소 대응**: 외부 전송 없는 로컬 카운터(Task 2.8) 추가(추후 대체 가능).
- **Non-goal(외부 API) 강제**: Task 4.2에 `fetch/axios/XMLHttpRequest` 문자열 검색 0건 DoD 추가.
- **storage 충돌 위험 완화**: 2.3이 2.2에 순차 의존하도록 조정 + 파일 소유권 명시.

원하면, 위 TASK에 맞춰 **SPEC의 S2/S3/S6 AC 문구(슬라이더/공유/근거 UI)**도 “EARS 형태로 완성본”을 함께 정리해 드릴 수 있어요.