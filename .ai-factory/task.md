# UPDATED TASK (Complete)

> 아래 TASK는 Consistency Check Report의 GAP(SC-2/SC-3/SC-4, 계산 엔진, 리워드 광고 게이트, UI/통합 누락)를 모두 해소하도록 **추가/수정 반영**한 “완전본”입니다.  
> (기존 Task 2.3~4.2가 이미 포함되어 있었고, **SC-4 Navigation guards** 및 **공유(encode → 링크 생성/복사/Share API)** 세부가 불충분한 부분을 보강했습니다.)

---

## Epic 1. TypeScript types + interfaces

### Risk Analysis
- Complexity: **Low**
- Risk factors: Route state가 페이지별로 달라지면 `location.state` 불일치로 런타임 오류/빈 화면 발생
- Mitigation: **첫 작업에서 `RouteState`를 단일 소스로 정의**하고 이후 모든 페이지에서 import+캐스팅으로 계약 강제

### Task 1.1 [Define domain + storage + routing types]
- Description:
  - `src/lib/types.ts`에 SPEC의 데이터 모델과 스토리지 계약 결과 타입을 정의한다.
  - **반드시 `RouteState` 타입을 포함**해 페이지 간 state 계약을 고정한다.
- DoD:
  - `src/lib/types.ts`가 생성/갱신되고 TypeScript 에러 없이 컴파일된다.
  - 아래 타입이 모두 `export` 된다:
    - 도메인: `PresetScenario`, `SimulationInput`, `BuyRepaymentType`, `SimulationResult`, `NetWorthPoint`, `RecommendedOption`, `HistoryEntry`, `SharePayloadV1`
    - 스토리지: `StorageErrorCode`, `DraftReadResult`, `DraftWriteResult`, `HistoryReadResult`, `HistoryUpsertResult`, `HistoryDeleteAllResult`
    - **라우팅: `RouteState`**
  - `RouteState`는 최소 아래를 포함한다:
    - `"/"`: `undefined`
    - `"/simulate"`:  
      `{ presetId: PresetScenario['id']; source: 'home'|'history'|'share' } | { input: SimulationInput; source: 'home'|'history'|'share' } | { source: 'home'|'history'|'share' } | null`
    - `"/result"`: `{ input: SimulationInput; label: string; source?: 'simulate'|'history' } | null`
    - `"/history"`: `{ source: 'result'|'home' } | null`
    - `"/share"`: `undefined`
- Covers: []
- Files: [`src/lib/types.ts`]
- Depends on: none

---

## Epic 2. Data layer (localStorage helpers, routing guards, core logic)

### Risk Analysis
- Complexity: **Medium**
- Risk factors:
  - localStorage 예외(SecurityError/QuotaExceeded)로 앱 크래시
  - 손상된 JSON을 덮어써 영구 손실
  - 계산 결과 NaN/Infinity 또는 추천 우선순위 오류
  - 잘못된 route state로 인한 진입 실패/빈 화면
- Mitigation:
  - Draft/History 스토리지를 **분리 구현(SC-1/SC-2)**하고 에러코드 표준화
  - History UPSERT는 **READ 실패 시 setItem 0회**로 손상 상태 덮어쓰기 방지
  - 계산 엔진을 UI와 분리한 **순수 함수**로 선구현하여 AC 단위 검증 가능
  - SC-4 라우팅 가드를 **순수 함수**로 제공해 모든 페이지에서 동일 로직으로 검증

### Task 2.1 [Add preset constants + default input factory]
- Description:
  - 번들 상수로 프리셋 4종을 제공하고 기본 입력 생성 유틸을 만든다.
- DoD:
  - `PRESET_SCENARIOS`가 **정확히 4개**를 export한다.
  - 각 프리셋의 `id`는 SPEC의 4종 중 하나이며 `defaultInput`은 `SimulationInput`의 모든 필드를 포함한다.
  - `getDefaultInput(): SimulationInput`이 모든 필드를 포함한 기본값을 반환한다.
- Covers: []
- Files: [`src/lib/presets.ts`]
- Depends on: Task 1.1

### Task 2.2 [SC-1 Draft storage helpers]
- Description:
  - SC-1 Draft Input 저장/복원(localStorage) 헬퍼를 구현한다.
  - 키 스코프: `rc_draft_input_v1:${tossUserId}`
  - **throw로 크래시 금지**: 모든 실패는 결과 유니온으로 반환한다.
- DoD:
  - `readDraftInput(tossUserId)` / `writeDraftInput(tossUserId, input)` 구현
  - READ:
    - localStorage 접근 불가(SecurityError 등): `{ ok:false, errorCode:'STORAGE_UNAVAILABLE', fallback:'DEFAULT_INPUT' }`
    - JSON.parse 실패: `{ ok:false, errorCode:'STORAGE_PARSE_ERROR', fallback:'DEFAULT_INPUT' }`
    - **key 미존재**: 에러 UI 없이 기본값 사용 가능하도록 **정상 케이스로 처리**한다. (예: `{ ok:true, value: getDefaultInput() }`)
  - WRITE:
    - 정상: `setItem(key, JSON.stringify(input))` 수행 후 `{ ok:true }`
    - QuotaExceededError: `{ ok:false, errorCode:'STORAGE_QUOTA_EXCEEDED' }` 반환 + 기존 문자열 불변
    - 기타 setItem 실패: `{ ok:false, errorCode:'STORAGE_WRITE_FAILED' }`
- Covers: [SC1-AC-2, SC1-AC-3, SC1-AC-5]
- Files: [`src/lib/storage/draft.ts`]
- Depends on: Task 1.1, Task 2.1

### Task 2.3 [SC-2 History storage helpers]
- Description:
  - SC-2 히스토리 READ/UPSERT/DELETE ALL을 구현한다.
  - 키: `rc_history_v1:${tossUserId}`, 정렬 최신이 앞, 최대 5개.
  - UPSERT는 **READ 실패 시 덮어쓰기 금지(setItem 0회)**.
- DoD:
  - `readHistory(tossUserId)`, `upsertHistory(tossUserId, entry)`, `deleteAllHistory(tossUserId)` 구현
  - READ:
    - key 미존재: `{ ok:true, value:[] }`
    - parse 실패: `{ ok:false, errorCode:'STORAGE_PARSE_ERROR', fallback:'EMPTY_ARRAY' }`
    - storage unavailable: `{ ok:false, errorCode:'STORAGE_UNAVAILABLE', fallback:'EMPTY_ARRAY' }`
  - UPSERT:
    - 내부 1단계 READ 실패 시 **에러 반환 + setItem 0회**
    - 새 entry를 `index 0`에 prepend
    - 길이 6 이상이면 **쓰기 전에** 마지막 항목 제거하여 length=5
    - QuotaExceededError: `{ ok:false, errorCode:'STORAGE_QUOTA_EXCEEDED' }` + 기존 문자열 불변
  - DELETE ALL:
    - `{ ok:true }` 반환 후 **직후 READ가 빈 배열**이 되도록 구현(`removeItem` 또는 `setItem('[]')`)
- Covers: [SC2-AC-1, SC2-AC-2, SC2-AC-3, SC2-AC-4, SC2-AC-5]
- Files: [`src/lib/storage/history.ts`]
- Depends on: Task 1.1

### Task 2.4 [F3 Simulation engine (pure function)]
- Description:
  - `SimulationInput` → `SimulationResult`로 변환하는 순수 계산 엔진을 구현한다.
  - 추천 옵션/인사이트 템플릿/민감도(+1%p 집값상승) 계산 포함.
- DoD:
  - `runSimulation(input: SimulationInput): SimulationResult` export
  - 아래 AC를 모두 만족:
    - (F3-AC-1) `netWorthSeries.length === residencePeriodYears + 1`, year는 0..N
    - (F3-AC-2) 최종 순자산 최대값의 옵션이 `recommendedOption`
    - (F3-AC-3) 동률이면 `"jeonse"` 우선
    - (F3-AC-4) 0% 케이스에서 finalNetWorth 3종 모두 `initialAsset`과 동일
    - (F3-AC-5) `insightCopy`가 정규식과 매칭
    - (F3-AC-6) series 모든 값이 `Number.isFinite(value)===true`
    - (F3-AC-7) 지원하지 않는 상환방식이면 `throw new Error("지원하지 않는 상환방식입니다")`
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-6, F3-AC-7]
- Files: [`src/lib/simulation/engine.ts`]
- Depends on: Task 1.1

### Task 2.5 [SC-3 Share encode/decode helpers (no HTTP)]
- Description:
  - `/share?v=1&input=...`용 Base64 인코딩/디코딩 유틸을 구현한다.
- DoD:
  - `encodeSharePayloadV1(input) => string` 구현(쿼리에 넣을 base64 문자열)
  - `decodeSharePayloadV1(encoded) => { ok:true; value: SharePayloadV1 } | { ok:false }` 구현
  - `v===1` 검증, `input`이 `SimulationInput` 기본 shape를 만족하지 않으면 `{ ok:false }`
  - 브라우저에서 동작 가능한 UTF-8 JSON base64 처리(`atob/btoa` 보조 유틸 포함 가능)
- Covers: []
- Files: [`src/lib/share.ts`]
- Depends on: Task 1.1

### Task 2.6 [State management: session flag for draft disable + debounce util]
- Description:
  - SC1-AC-4(세션 내 draft 저장 비활성)를 위해 세션 플래그 Context를 제공한다.
  - 입력 변경 500ms 디바운스 저장을 위한 훅을 제공한다.
- DoD:
  - `StorageSessionProvider` / `useStorageSession()` 구현:
    - `draftDisabled: boolean`
    - `disableDraftForSession(): void` (호출 후 동일 세션에서 항상 true)
  - `useDebouncedEffect(effect, deps, delayMs)`(또는 동등) 구현
  - Provider를 라우팅에 연결하지 않아도 빌드가 깨지지 않는다.
- Covers: [SC1-AC-4]
- Files:
  - `src/lib/state/StorageSessionContext.tsx`
  - `src/lib/state/useDebouncedEffect.ts`
- Depends on: Task 1.1

### Task 2.7 [SC-4 Navigation guard helpers (route state validation)]
- Description:
  - 각 페이지가 동일한 방식으로 `location.state`/query를 검증하고, 잘못된 진입을 **즉시 차단**할 수 있도록 SC-4 라우팅 가드 유틸을 제공한다.
  - 이 Task는 **UI(AlertDialog 등) 표시를 하지 않고**, “검증 결과”만 반환하는 **순수 함수**로 구현한다.
- DoD:
  - 아래 함수들이 `export` 되고, 단독 import 시 컴파일된다:
    - `validateSimulateState(state: unknown): { ok:true; value: RouteState['/simulate'] } | { ok:false; reason: 'STATE_NULL'|'INVALID_PRESET_ID'|'INVALID_SHAPE' }`
    - `validateResultState(state: unknown): { ok:true; value: NonNullable<RouteState['/result']> } | { ok:false; reason: 'STATE_NULL'|'INVALID_SHAPE' }`
    - `validateHistoryState(state: unknown): { ok:true; value: RouteState['/history'] } | { ok:false; reason: 'INVALID_SHAPE' }`
  - `validateSimulateState`는 아래를 만족:
    - `state === null`이면 `{ ok:false, reason:'STATE_NULL' }`
    - `{ presetId }`가 있을 때 `presetId`가 `PRESET_SCENARIOS.map(p=>p.id)` 중 하나가 아니면 `{ ok:false, reason:'INVALID_PRESET_ID' }`
    - 위 조건 통과 시 `{ ok:true }`
- Covers: []
- Files: [`src/lib/routing/guards.ts`]
- Depends on: Task 1.1, Task 2.1

---

## Epic 3. Core UI pages (src/pages/) — ONE page per task

### Risk Analysis
- Complexity: **High**
- Risk factors:
  - RouteState 누락/손상 시 빈 화면
  - TDS 간격 규칙 위반(Spacing 미사용/임의 패딩 덮어쓰기)으로 검수 반려
  - Reward Ad 게이트가 잘못된 경로(History 재열람 등)에서 노출
- Mitigation:
  - 모든 페이지에서 `RouteState` import + `location.state as RouteState['/path']` 강제 + **Task 2.7 가드 사용**
  - 간격은 `Spacing`만 사용, 커스텀 CSS는 레이아웃(flex/크기) 한정
  - RewardAd는 **/simulate의 “결과 보기” 액션에서만** 사용(결과/히스토리 페이지에는 미포함)

### Task 3.1 [HomePage `/`]
- Description:
  - 홈에서 프리셋 4개를 `ListRow`로 렌더링하고, 탭/직접입력으로 `/simulate`로 이동한다.
  - 프리셋이 4개 미만이면 AlertDialog로 차단한다.
- DoD:
  - `Top` 타이틀 “RentCheck”, 설명 `Paragraph.Text`, 프리셋 `ListRow` 4개, `Chip` 표시, 하단 “직접 입력” `Button`
  - 프리셋 ListRow 탭 시 `navigate('/simulate', { state: { presetId, source:'home' }})`가 **정확히 1회** 호출된다.
  - 직접 입력 탭 시 `navigate('/simulate', { state: { source:'home' }})`가 **정확히 1회** 호출된다.
  - 프리셋이 4개 미만으로 렌더링되면:
    - `AlertDialog` 문구가 `"프리셋을 표시할 수 없어요"`와 **일치**
    - 확인 탭 시 `navigate('/', { replace:true })`가 **정확히 1회**
  - 외부 이동 구현 없음: `window.open` 0회 + `window.location.href`에 외부 URL 대입 0회
- Covers:
  - [S1-AC-1, S1-AC-2, S1-AC-3, S1-AC-4, S1-AC-5]
  - [F1-AC-1, F1-AC-2, F1-AC-3, F1-AC-4, F1-AC-6, F1-AC-7]
- Files: [`src/pages/HomePage.tsx`]
- Depends on: Task 1.1, Task 2.1

### Task 3.2 [SimulatePage `/simulate` (hydrate + form + draft + reward ad)]
- Description:
  - 프리셋/드래프트 hydrate, 탭 기반 입력 폼, 검증, 500ms 디바운스 draft 저장, “결과 보기” 리워드 광고 게이트 후 `/result` 이동을 구현한다.
- DoD:
  - `location.state`를 `RouteState['/simulate']`로 캐스팅하여 사용한다.
  - **Task 2.7** `validateSimulateState(location.state)`를 호출하여 분기한다.
  - Hydrate 동안:
    - `isHydrating=true`이면 `Paragraph.Text`로 `"불러오는 중..."` 표시
    - `"결과 보기"` 버튼 `disabled=true`
  - 진입 state 검증:
    - `validateSimulateState(...).ok===false`인 경우:
      - `AlertDialog` 메시지 `"프리셋을 불러올 수 없어요"`
      - 확인 탭 시 `navigate('/', { replace:true })` **정확히 1회**
  - 프리셋 프리필:
    - `{ presetId:'preset_young_jeonse', source:'home' }` 진입 시 hydrate 완료 후 `"거주기간(년)" TextField` 값이 **`10`으로 표시**
  - Draft 복원/에러 UI:
    - **키 미존재**는 에러 UI 없이 기본값으로 렌더(토스트/다이얼로그 0회)
    - `STORAGE_PARSE_ERROR`면 Toast를 `"임시 저장 데이터를 불러올 수 없어요. 기본값으로 시작할게요"`로 **1회 표시**
    - `STORAGE_UNAVAILABLE`면 Toast를 `"저장소에 접근할 수 없어요. 이 기기에서는 임시 저장이 꺼져요"`로 **1회 표시**하고 `disableDraftForSession()`을 호출
    - `STORAGE_QUOTA_EXCEEDED`면 Toast를 `"저장공간이 부족해 임시 저장을 할 수 없어요"`로 **1회 표시**
  - Draft 저장(디바운스 500ms):
    - 사용자가 `"초기자산(원)"` 변경 후 **500ms 경과** 시 `writeDraftInput(tossUserId, input)` 호출
    - `draftDisabled===true`인 세션에서는 입력이 바뀌어도 `writeDraftInput` 호출이 **0회**
  - 모바일 키보드/스크롤:
    - 숫자 `TextField`의 내부 input에 `inputMode="numeric"` 및 `pattern="[0-9]*"` 적용(특히 `"월세(원)"` 포함)
    - 포커스 시 해당 input에 `scrollIntoView({ block:'center' })`가 **정확히 1회** 호출
  - 제출 검증:
    - `residencePeriodYears=0`으로 제출하면 에러 메시지 `"거주기간은 1~30년만 입력할 수 있어요"`가 표시되고 `navigate('/result', ...)` 호출 **0회**
    - `buyEquity > buyPrice`로 제출하면 에러 메시지 `"자기자본은 매매가를 넘을 수 없어요"`가 표시되고 navigate **0회**
  - 리워드 광고 게이트:
    - “결과 보기” 탭 시 `TossRewardAd` 게이트 UI가 표시된다. (F4-AC-1)
    - 광고 **완료 이후에만** `navigate('/result', { state:{ input, label, source:'simulate' }})`가 **정확히 1회** 호출된다. (F4-AC-2, S2-AC-5)
    - 광고 **로드 실패** 시 `AlertDialog`가 **표시**되고, `navigate('/result', ...)` 호출은 **0회**다. (F4-AC-3)
  - label 생성 계약(추가 명확화):
    - preset 진입(`presetId` 존재)인 경우 `label`은 해당 프리셋의 표시명(title)과 **문자열 동등**
    - 직접입력 진입(`presetId` 없음)인 경우 `label === "직접 입력"`과 **문자열 동등**
- Covers:
  - [S2-AC-1, S2-AC-2, S2-AC-3, S2-AC-4, S2-AC-5]
  - [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-6, F2-AC-7]
  - [F4-AC-1, F4-AC-2, F4-AC-3]
  - [SC1-AC-1, SC1-AC-3, SC1-AC-4]
  - [F1-AC-5]
- Files: [`src/pages/SimulatePage.tsx`]
- Depends on: Task 1.1, Task 2.1, Task 2.2, Task 2.6, Task 2.7

### Task 3.3 [ResultPage `/result` (render + save history + share link + banner ad)]
- Description:
  - `/result`는 **어떤 진입 경로든 리워드 광고를 요구하지 않고** state 기반으로 결과를 렌더링한다.
  - 3개 카드 + 분석 정보 + 하단 배너 광고(AdSlot 1개) + 히스토리 저장/보기/공유를 제공한다.
- DoD:
  - `location.state`를 `RouteState['/result']`로 캐스팅한다.
  - **Task 2.7** `validateResultState(location.state)`를 호출하여 분기한다.
  - state 누락/오류(`validateResultState.ok===false`)이면:
    - `AlertDialog` 메시지 `"결과를 표시할 수 없어요. 다시 계산해주세요"`
    - 확인 시 `navigate('/simulate', { replace:true })` **정확히 1회**
  - state 정상 시:
    - 결과 카드 `ListRow`가 **정확히 3개(전세/월세/매매)** 렌더된다.
    - `AdSlot`이 **정확히 1개** 렌더된다(분석표 이후, 겹침 없음).
  - `location.state.source === 'history'`로 진입해도 `TossRewardAd`는 **마운트/표시 0회**다.
  - “히스토리 저장”:
    - 저장 전 `buyEquity <= buyPrice` 검증(위반 시 upsert 호출 0회)
    - `upsertHistory` 실패가 `STORAGE_QUOTA_EXCEEDED`이면 `AlertDialog` 메시지 `"저장공간이 부족해 히스토리를 저장할 수 없어요"` 표시 + localStorage 문자열 불변
    - 실패가 `STORAGE_UNAVAILABLE`이면 `AlertDialog` 메시지 `"저장소에 접근할 수 없어요. 이 기기에서는 히스토리를 저장할 수 없어요"` 표시 + localStorage 문자열 불변
  - “히스토리 보기” 탭 시 `navigate('/history', { state:{ source:'result' } })`가 **정확히 1회**
  - “공유하기”:
    - 버튼 탭 시 내부 공유 링크를 생성한다: `pathname === '/share'` 이고 query에 `v=1` 및 `input=<encodeSharePayloadV1(state.input)>`가 포함된다.
    - `navigator.share`가 **존재하는 환경**이면 `navigator.share(...)`가 **정확히 1회** 호출된다.
    - `navigator.share`가 **존재하지 않는 환경**이면 `navigator.share` 호출 **0회**, 대신 링크를 클립보드에 복사(또는 동등 동작) 후 Toast `"링크를 복사했어요"`가 **정확히 1회** 표시된다.
    - 외부 도메인 이탈 구현 없음(`window.open`/외부 href 대입 0회)
- Covers: [S3-AC-1, S3-AC-2, S3-AC-3, S3-AC-4]
- Files: [`src/pages/ResultPage.tsx`]
- Depends on: Task 1.1, Task 2.3, Task 2.4, Task 2.5, Task 2.7

### Task 3.4 [HistoryPage `/history`]
- Description:
  - 최근 5개 히스토리를 최신순으로 표시하고, 탭 시 `/result`로 재열람 이동(게이트 없음).
  - 전체 삭제(확인 다이얼로그 포함) + 실패 시 목록 유지.
- DoD:
  - `location.state`를 `RouteState['/history']`로 캐스팅한다.
  - **Task 2.7** `validateHistoryState(location.state)`를 호출하고, `{ ok:false }`여도 화면은 정상 렌더(단, source 활용 로직이 있다면 기본값 처리)한다.
  - 로딩 중 `"불러오는 중..."` 표시
  - READ 결과:
    - 빈 배열이면 `"저장된 히스토리가 없어요"` 표시 + `ListRow` 0개 + 에러 문구 0개
    - `STORAGE_PARSE_ERROR`면 `"히스토리를 불러올 수 없어요"` 표시 + `ListRow` 0개
  - 리스트 표시 계약:
    - SC-2의 배열 순서를 그대로 렌더(첫 ListRow가 `value[0].label`)
    - `ListRow.title === entry.label`
    - `createdAt`을 로컬 기준 `YYYY.MM.DD`로 포맷해 표시
  - 항목 탭:
    - `navigate('/result', { state:{ input: entry.input, label: entry.label, source:'history' }})`가 **정확히 1회**
    - `/simulate`로 우회 이동하지 않는다.
  - 전체 삭제:
    - 확인 `AlertDialog` 후 `deleteAllHistory` 실행
    - 성공 시 즉시 목록 0개로 리렌더 + 재진입해도 0개
    - 실패(`STORAGE_UNAVAILABLE`/`STORAGE_WRITE_FAILED`) 시 실패 `AlertDialog` 표시 + UI 목록 개수 유지(선삭제 금지)
- Covers:
  - [S4-AC-1, S4-AC-2, S4-AC-3, S4-AC-4]
  - [SC2-AC-1, SC2-AC-3, SC2-AC-5]
- Files: [`src/pages/HistoryPage.tsx`]
- Depends on: Task 1.1, Task 2.3, Task 2.7

### Task 3.5 [SharePage `/share` (decode → simulate)]
- Description:
  - `/share?v=1&input=...` 쿼리를 디코딩하여 입력을 복원하고 “이 조건으로 열기”로 `/simulate`에 전달한다.
- DoD:
  - 쿼리 파싱/디코딩 중 `"불러오는 중..."` 표시
  - `input` 누락 또는 디코딩 실패 시:
    - `AlertDialog` 표시
    - 확인 탭 시 `navigate('/', { replace:true })` **정확히 1회**
  - 성공 시:
    - “이 조건으로 열기” 버튼 탭 → `navigate('/simulate', { state:{ input, source:'share' } })` **정확히 1회**
  - 외부 도메인 이탈 구현 없음(`window.open`/외부 href 대입 0회)
- Covers: []
- Files: [`src/pages/SharePage.tsx`]
- Depends on: Task 1.1, Task 2.5

---

## Epic 4. Integration + polish (routing wiring, final UX)

### Risk Analysis
- Complexity: **Medium**
- Risk factors:
  - 라우팅 연결 시 path/state 불일치로 진입 실패
  - Provider 미적용으로 draftDisabled 플래그가 동작하지 않음
  - 광고 위치 계약 위반(RewardAd가 result/history에 노출, AdSlot 중복 등)
- Mitigation:
  - 라우팅을 마지막에 한 번에 연결하고, 페이지들은 RouteState 캐스팅 + SC-4 가드로 계약을 강제
  - RewardAd는 SimulatePage에만 존재하도록 페이지 분리로 구조적 방지
  - AdSlot은 ResultPage에만 1개 배치(이미 DoD로 고정)

### Task 4.1 [Wire React Router routes + Provider]
- Description:
  - React Router에 5개 라우트를 연결하고, 앱 최상단에 `StorageSessionProvider`를 적용한다.
- DoD:
  - 아래 경로가 렌더링된다:
    - `/` → `HomePage`
    - `/simulate` → `SimulatePage`
    - `/result` → `ResultPage`
    - `/history` → `HistoryPage`
    - `/share` → `SharePage`
  - `StorageSessionProvider`로 앱이 감싸져 있고 컴파일 에러가 없다.
- Covers: []
- Files:
  - `src/App.tsx` *(또는 템플릿의 라우팅 엔트리 파일)*
  - `src/main.tsx` *(Provider를 여기서 감싸는 구조라면)*
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 2.6

### Task 4.2 [Result chart component (SVG) + Toast tooltip — component only]
- Description:
  - TDS에 차트 컴포넌트가 없으므로, 결과의 `netWorthSeries`를 그릴 수 있는 최소 SVG 차트 컴포넌트를 추가한다.
  - 포인트 탭 시 툴팁 대신 `Toast`로 연도/금액을 표시한다.
  - **주의: 이 Task에서는 `ResultPage`를 수정하지 않는다(파일 중복 수정 방지).**
- DoD:
  - `NetWorthChart` 컴포넌트가 생성되고 단독 import/렌더 시 컴파일된다.
  - 커스텀 CSS는 레이아웃(flex/크기) 목적의 최소만 포함하고, TDS 여백을 덮어쓰지 않는다.
  - 각 포인트는 최소 44px 탭 영역을 제공하며, 탭 시 Toast가 **1회** 표시된다.
- Covers: []
- Files: [`src/components/NetWorthChart.tsx`]
- Depends on: Task 1.1

---

## AC Coverage
- Total ACs in SPEC: **52**
- Covered by tasks: **52**
  - SC-1: [SC1-AC-1, SC1-AC-2, SC1-AC-3, SC1-AC-4, SC1-AC-5]
  - SC-2: [SC2-AC-1, SC2-AC-2, SC2-AC-3, SC2-AC-4, SC2-AC-5]
  - S1: [S1-AC-1, S1-AC-2, S1-AC-3, S1-AC-4, S1-AC-5]
  - S2: [S2-AC-1, S2-AC-2, S2-AC-3, S2-AC-4, S2-AC-5]
  - S3: [S3-AC-1, S3-AC-2, S3-AC-3, S3-AC-4]
  - S4: [S4-AC-1, S4-AC-2, S4-AC-3, S4-AC-4]
  - F1: [F1-AC-1, F1-AC-2, F1-AC-3, F1-AC-4, F1-AC-5, F1-AC-6, F1-AC-7]
  - F2: [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-6, F2-AC-7]
  - F3: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-6, F3-AC-7]
  - F4: [F4-AC-1, F4-AC-2, F4-AC-3]
- Uncovered: **0**

--- 

## What changed vs “CURRENT TASK”
- **Added Task 2.7 (SC-4 Navigation guards)**: SPEC의 SC-4 “라우팅 상태 계약 검증”을 코드 레벨 유틸로 고정.
- **Modified Task 3.2/3.3/3.4**: 각 페이지에서 **SC-4 가드 사용을 DoD로 강제**(진입 안정성 강화).
- **Modified Task 3.3 (공유하기)**: SC-3 encode 결과를 실제 **내부 링크 생성 + navigator.share/클립보드 fallback + Toast**로 연결(외부 이탈 금지 포함).