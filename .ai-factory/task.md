# TASK (Updated — gaps fixed)

> 목적: PRD/SPEC에 정의된 모든 서비스/스토리지/공유/광고/화면 요구사항을 **태스크로 1:1 매핑**하고, 누락된 핵심 계산/스토리지/공유/광고/토스트 처리 태스크를 추가한다.  
> 공통 원칙: **모든 서비스 함수는 throw 금지**, 실패는 `Result`로만 반환. UI는 **TDS 컴포넌트만** 사용(간격은 `Spacing` 또는 `ListRow` 패딩만).

---

## Epic 1. TypeScript types + interfaces (`src/lib/types.ts`)

### Risk Analysis
- Complexity: **Low**
- Risk factors: `RouteState` 누락/불일치로 페이지 간 `location.state` shape가 달라져 런타임 오류 발생
- Mitigation: **첫 태스크에서 `RouteState`를 계약으로 고정**하고, 모든 페이지가 이를 import하여 캐스팅 + `navigate()` payload를 강제

---

### Task 1.1 [Types] Core 엔티티/서비스 타입 + `RouteState` 계약 정의
- Description:
  - `src/lib/types.ts`에 SPEC의 공통 타입(Result, AppErrorCode 등), 데이터 모델, 서비스 인터페이스를 **순수 타입**으로 정의한다.
  - **반드시 `RouteState` 타입을 포함**하여 라우트(`/`, `/input`, `/result`, `/history`) 간 state shape를 고정한다.
- DoD:
  - `src/lib/types.ts`가 컴파일 에러 없이 다음을 export 한다(런타임 코드 없음):
    - `EpochMs`, `AppErrorCode`, `Result<T,E>`, `Paginated<T>`
    - `PresetScenario`, `SimulationInput`, `BuyRepaymentType`, `OptionType`, `OptionResult`, `CostBreakdownRow`, `SimulationResult`
    - `HistoryEntry`, `SharePayload`, `LastInputSnapshot`
    - `PresetService`, `SimulationValidationService`, `SimulationService`, `ShareService`, `HistoryStorage`, `LastInputStorage`
    - `FieldErrors`, `SimulationInputUserField`
    - ✅ `RouteState` 예시 형태로 포함:
      ```ts
      export type RouteState = {
        "/": undefined;
        "/input": { presetId: string | null } | null;
        "/result":
          | { input: SimulationInput }
          | { input: SimulationInput; historyId: string }
          | null;
        "/history": undefined;
      };
      ```
- Covers: []
- Files:
  - `src/lib/types.ts`
- Depends on: none

---

## Epic 2. Data layer (services + localStorage helpers)

### Risk Analysis
- Complexity: **Medium**
- Risk factors:
  - localStorage 스키마 파손/마이그레이션 누락 → 파싱 실패/앱 크래시
  - 서비스 함수에서 throw 발생 또는 NaN/Infinity 생성 → 결과 화면 오류
  - base64/JSON 디코딩 실패 케이스 누락 → 공유 링크 진입 불가
- Mitigation:
  - **타입 → (유틸/서비스) → storage CRUD → state** 순으로 분리
  - 모든 함수는 **throw 금지** 및 `Result` 반환으로 실패를 표준화
  - storage 레이어 내부에서 스키마 체크/마이그레이션(예: `updatedAt` 보정) 캡슐화

---

### Task 2.1 [PresetService] 하드코딩 프리셋 4개 + 조회 서비스 구현
- Description:
  - 4개 프리셋을 하드코딩하고 `listPresets/getPresetById`를 구현한다.
  - `createdAt/updatedAt`은 앱 런타임 초기화 시 `Date.now()` 기반으로 채워도 된다(SPEC 허용).
- DoD:
  - `listPresets()`는 항상 `{ page:1, total:4, items:[4개] }` 반환
  - `items.length === 4`이며 `PresetScenario.id` 4개는 모두 서로 다름
  - `getPresetById()`:
    - 존재 시 `{ ok:true, value }` 및 `value.id === id`
    - 미존재 시 `{ ok:false, error:{ code:'NOT_FOUND' } }`
  - 어떤 케이스에서도 throw 하지 않음
- Covers: [AC-PS-1, AC-PS-2, AC-PS-3, AC-PS-4]
- Files:
  - `src/lib/presetService.ts`
- Depends on: Task 1.1

---

### Task 2.2 [Validation] 입력 정규화/검증 서비스 구현 (throw 금지)
- Description:
  - `SimulationValidationService.validate()`를 SPEC의 정규화/검증 규칙 및 **고정 에러 문구 테이블** 그대로 구현한다.
  - `id/createdAt/updatedAt` 메타 필드 정규화 포함.
  - UUID 생성은 `crypto.randomUUID()` 우선, 미지원 시 fallback 유틸 제공.
- DoD:
  - 성공 시 `{ ok:true, value }`이며 `value`는 `SimulationInput` **필수 필드 모두 포함**
  - 성공 시:
    - `value.id`는 빈 문자열 아님
    - `Number.isFinite(value.createdAt) === true`
    - `Number.isFinite(value.updatedAt) === true`
  - 실패 시 `{ ok:false, error:{ code:'INVALID_INPUT', fieldErrors } }` 반환, throw 금지
  - 실패 시 `fieldErrors`의 key는 `SimulationInputUserField` 범위 안에서만 생성된다(즉, `'id'|'createdAt'|'updatedAt'` 키가 존재하면 **실패**)  
    - Pass/Fail: `('id' in fieldErrors) === false` AND `('createdAt' in fieldErrors) === false` AND `('updatedAt' in fieldErrors) === false`
  - 아래 케이스가 **정확히** 동작:
    - `stayPeriodYears=0` → `fieldErrors.stayPeriodYears === "거주기간은 1~30년만 가능해요"`
    - `buyEquityKRW > buyPriceKRW` → `fieldErrors.buyEquityKRW === "자기자본은 매매가 이하여야 해요"`
- Covers: [AC-VS-1, AC-VS-2, AC-VS-3, AC-VS-4]
- Files:
  - `src/lib/validationService.ts`
  - `src/lib/uuid.ts`
- Depends on: Task 1.1

---

### Task 2.3 [Simulation] 시뮬레이션 계산/추천/인사이트 순수 함수 구현
- Description:
  - `SimulationService.calculate/createInsight` 구현.
  - 내부에서 validation을 호출해 사전 검증 실패 시 `INVALID_INPUT` 반환.
  - 계산 중 NaN/Infinity 위험 감지 시 `CALC_ERROR` 반환.
  - 결과는 항상 3개(JEONSE, MONTHLY, BUY) 순서 고정.
  - `insightCopy` 템플릿/옵션 한글 매핑(전세/월세/매매) 포함.
- DoD:
  - `calculate()` 성공 시:
    - `{ ok:true, value }`
    - `value.results.length === 3`
    - 순서가 `JEONSE`, `MONTHLY`, `BUY`
  - `stayPeriodYears=N`이면 모든 `netWorthByYearKRW.length === N+1`
  - 입력 검증 규칙 위반(예: `jeonseLoanRatio=1.5`) 시 `{ ok:false, error:{ code:'INVALID_INPUT' } }`, throw 금지
  - NaN/Infinity 위험 감지 시 `{ ok:false, error:{ code:'CALC_ERROR' } }`, throw 금지
  - SPEC 단순 케이스(F3-AC-2) 결과가 정확히 일치:
    - JEONSE `finalNetWorthKRW === 100000000`
    - MONTHLY `finalNetWorthKRW === 88000000`
    - BUY `finalNetWorthKRW === 100000000`
  - 인사이트 문구가 F3-AC-4와 정확히 일치:
    - `"집값상승률을 1%p 높이면 매매가 1년 후 1000000원 더 유리해요."`
- Covers: [AC-SS-1, AC-SS-2, AC-SS-3, AC-SS-4, F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-7]
- Files:
  - `src/lib/simulationService.ts`
- Depends on: Task 1.1, Task 2.2

---

### Task 2.4 [Share] 공유 URL 인코드/디코드 서비스 구현 (v=1 고정)
- Description:
  - `ShareService.buildShareUrl/parseShareSearch` 구현.
  - `buildShareUrl()`은 `/result?v=1&s=...` 형태의 URL 문자열 생성(현재 origin + pathname 기반).
  - `parseShareSearch(search)`는 v 체크, base64 decode + JSON.parse 후 validation까지 수행.
- DoD:
  - `buildShareUrl()` 성공 시:
    - `value.url`에 `?v=1&s=` 포함
    - `value.payload.version === 1`
  - `parseShareSearch()` 성공 시 `{ ok:true, value:{ input } }` 반환 및 `input`은 validation 통과한 스키마
  - `v !== 1`이면 `{ ok:false, error:{ code:'UNSUPPORTED_VERSION' } }` (throw 금지)
  - base64 디코드/JSON 파싱 실패 시 `{ ok:false, error:{ code:'DECODE_ERROR' } }` (throw 금지)
- Covers: [AC-SH-1, AC-SH-2, AC-SH-3, AC-SH-4]
- Files:
  - `src/lib/shareService.ts`
  - `src/lib/base64.ts`
- Depends on: Task 1.1, Task 2.2

---

### Task 2.5 [Storage-Errors] localStorage 접근/쿼터 에러 판별 유틸 추가
- Description:
  - storage 레이어에서 공통으로 사용할 localStorage 에러 판별 유틸을 만든다.
  - QuotaExceededError / 접근 불가(보안/프라이빗 모드) / 기타 에러를 **throw 없이** 코드로 변환할 수 있게 한다.
- DoD:
  - `isStorageUnavailableError(e: unknown): boolean`
  - `isQuotaExceededError(e: unknown): boolean`
  - 어떤 입력에도 throw 하지 않음
- Covers: []
- Files:
  - `src/lib/storage/storageErrors.ts`
- Depends on: Task 1.1

---

### Task 2.6 [Storage-History] 히스토리 localStorage CRUD + 스키마/에러 처리
- Description:
  - `rentcheck_history_v1`에 대한 `HistoryStorage.list/prepend` 구현.
  - page 계약(page=1만 허용, pageSize 1..5), 정렬(createdAt DESC), 최대 5개 유지.
  - 파싱/스키마 오류 및 마이그레이션(updatedAt 누락 시 createdAt으로 보정).
- DoD:
  - `prepend()` 성공 시:
    - localStorage `rentcheck_history_v1`는 JSON 배열
    - 첫 항목 `id === entry.id`
    - 전체 길이 `<= 5`
  - `list({ page:1, pageSize:k })` 성공 시:
    - `items.length <= k`
    - `items`는 `createdAt DESC` 정렬
  - `page !== 1`이면 `{ ok:false, error:{ code:'PAGE_OUT_OF_RANGE' } }` (throw 금지)
  - 파싱 불가면 `{ ok:false, error:{ code:'STORAGE_PARSE' } }` (throw 금지)
- Covers: [AC-HS-1, AC-HS-2, AC-HS-3, AC-HS-4]
- Files:
  - `src/lib/storage/historyStorage.ts`
- Depends on: Task 1.1, Task 2.5

---

### Task 2.7 [Storage-LastInput] 마지막 입력 스냅샷 localStorage CRUD
- Description:
  - `rentcheck_last_input_v1`에 대한 `LastInputStorage.load/save/clear` 구현.
  - 스키마 검증 및 파싱/접근 불가/쿼터 에러를 Result로 변환.
- DoD:
  - `save(input, now)` 성공 시:
    - localStorage `rentcheck_last_input_v1`는 `LastInputSnapshot` 스키마
    - `snapshot.input.id === input.id`
  - 저장된 값이 없을 때 `load()`는 `{ ok:true, value:null }`
  - 파싱 불가면 `{ ok:false, error:{ code:'STORAGE_PARSE' } }` (throw 금지)
  - 접근 불가 시 `load/save/clear`는 `{ ok:false, error:{ code:'STORAGE_UNAVAILABLE' } }`
  - quota 시 `save`는 `{ ok:false, error:{ code:'STORAGE_QUOTA' } }`
- Covers: [AC-LI-1, AC-LI-2, AC-LI-3, AC-LI-4]
- Files:
  - `src/lib/storage/lastInputStorage.ts`
- Depends on: Task 1.1, Task 2.5

---

### Task 2.8 [State] 히스토리 로딩 상태/프리뷰를 위한 경량 store hook
- Description:
  - Home/History 화면에서 공통으로 사용할 히스토리 로딩 훅 생성.
  - localStorage는 동기지만 화면 요구사항에 맞게 **로딩 상태를 최대 200ms까지 노출**할 수 있도록 타이머 기반 상태를 제공.
- DoD:
  - `useHistoryList({ pageSize })` 훅이 아래 shape로 동작:
    - 반환: `{ status:'loading'|'success'|'error', items: HistoryEntry[], errorCode?: AppErrorCode, refresh: () => void }`
  - 최초 mount 직후 `status === 'loading'`
  - 200ms 이내에 `success` 또는 `error`로 전이(타이머 사용)
  - `status === 'error'`여도 `items === []`로 UI가 안전 렌더링 가능
- Covers: []
- Files:
  - `src/lib/state/useHistoryList.ts`
- Depends on: Task 2.6

---

### Task 2.9 [UI Constants] 고정 문구 상수 파일 추가(Toast/Dialog 메시지)
- Description:
  - SPEC에서 고정 문구로 등장하는 메시지를 상수로 정의해 페이지 구현에서 재사용 가능하게 한다.
  - (페이지 파일을 나중에 다시 수정하지 않도록) 페이지 태스크에서 처음부터 이 상수를 import해 사용한다.
- DoD:
  - `src/lib/ui/messages.ts`에 최소 아래 상수가 export 된다(문구 정확히 일치):
    - `MSG_HISTORY_LOAD_FAIL = "기록을 불러오지 못했어요"`
    - `MSG_HOME_HISTORY_EMPTY = "최근 시뮬레이션이 없어요"`
    - `MSG_RESULT_EMPTY = "입력값이 없어요. 홈으로 이동해주세요."`
    - `MSG_PRESET_LOAD_FAIL_DIALOG = "프리셋을 불러오지 못했어요"`
    - `MSG_SHARE_DECODE_FAIL_DIALOG = "공유 링크를 해석할 수 없어요"`
    - `MSG_RESULT_CALC_FAIL_TITLE = "계산할 수 없어요"`
    - `MSG_RESULT_CALC_FAIL_BODY = "입력값을 확인한 뒤 다시 시도해주세요"`
- Covers: []
- Files:
  - `src/lib/ui/messages.ts`
- Depends on: Task 1.1

---

## Epic 3. Core UI pages (`src/pages/`) — ONE page per task

### Risk Analysis
- Complexity: **High**
- Risk factors:
  - 입력 폼 검증 에러 메시지(고정 문구) 불일치
  - `/result` 입력 복원 우선순위/저장 호출 누락
  - 광고 게이팅/배너 위치가 SPEC와 다르면 검수 리스크
- Mitigation:
  - **페이지 1개 = 태스크 1개**로 고정하여 변경 범위를 국소화
  - 각 페이지에서 `RouteState` import + `location.state` 캐스팅 강제
  - Result 페이지에서 게이팅/배너/복원 규칙을 한 번에 완결

---

### Task 3.1 [Page-/] 홈 페이지 구현 (프리셋 4개 + 히스토리 프리뷰)
- Description:
  - `/` 홈 UI 구현: 프리셋 4개 ListRow, “직접 입력하기” 버튼, 최근 기록 프리뷰(최대 5).
  - 히스토리 로딩 중(최대 200ms) “불러오는 중…” 표시 및 주요 버튼 disabled.
  - 히스토리 파싱/스키마 오류 시 Toast 노출 + 프리뷰 0개 렌더.
  - 각 ListRow 탭 시 RouteState 계약대로 navigate.
- DoD:
  - 프리셋 ListRow가 정확히 4개 렌더링된다.
  - 프리셋 탭 시 `navigate('/input', { state:{ presetId } })`가 1회 호출되고 `presetId`는 탭한 프리셋 id와 동일하다.
  - “직접 입력하기” 탭 시 `navigate('/input', { state:{ presetId:null } })`가 1회 호출된다.
  - 히스토리 0개면 `MSG_HOME_HISTORY_EMPTY` 문구가 `Typography`로 표시된다.
  - 히스토리 파싱/스키마 오류면 `Toast`에 `MSG_HISTORY_LOAD_FAIL`가 표시되고 프리뷰는 0개로 렌더링된다.
  - 로딩 상태 동안 “불러오는 중…” 표시 + 프리셋/직접입력 버튼 `disabled=true`.
  - 히스토리 항목 탭 시 `navigate('/result', { state:{ input: entry.input, historyId: entry.id } })`가 1회 호출된다.
  - `location.state` 미사용(항상 자체 진입).
- Covers: [F1-AC-1, F1-AC-2, F1-AC-3, F1-AC-4, F1-AC-5, F1-AC-6, F1-AC-7, S1-AC-1, S1-AC-2, S1-AC-3, S1-AC-4]
- Files:
  - `src/pages/HomePage.tsx`
- Depends on: Task 1.1, Task 2.1, Task 2.8, Task 2.9

---

### Task 3.2 [Page-/input] 입력 페이지 구현 (3탭 폼 + 검증/에러 표시)
- Description:
  - `/input` 페이지 구현: TabBar(전세/월세/매매), 각 탭별 TextField, 공통 설정, “결과 보기” 버튼.
  - route state로 `{ presetId }`를 받아 프리셋 채우기.
  - 제출 시 validate 1회 호출, 실패 시 필드 하단 고정 문구로 노출, 성공 시 `/result`로 navigate.
  - 제출 직후 300ms 로딩 상태(버튼 disabled + 라벨 “계산 중…”).
  - 키보드 대응: 숫자/소수 inputMode 적용, submit 시 `document.activeElement instanceof HTMLElement`면 `.blur()` 호출.
  - 에러 시 첫 에러 필드 컨테이너에 `scrollIntoView({ block:'center' })` 호출(브라우저 기본 스크롤).
  - 프리셋 id가 NOT_FOUND면 Dialog 표시 후 확인 시 홈으로 이동.
- DoD:
  - `jeonseDepositKRW` TextField는 `inputMode="numeric"` 이다.
  - `housePriceGrowthRateAnnual` TextField는 `inputMode="decimal"` 이다.
  - `{ presetId:string }`로 진입 시 `PresetService.getPresetById(presetId)`를 호출하며:
    - 성공 시 폼이 프리셋 값으로 채워진다.
    - `{ ok:false, error:{code:'NOT_FOUND'} }`이면 `Dialog`에 `MSG_PRESET_LOAD_FAIL_DIALOG` 표시, 확인 탭 시 `navigate('/')` 1회 호출
  - “결과 보기” 탭 시 `SimulationValidationService.validate`가 1회 호출되고:
    - `ok:true`일 때만 `navigate('/result', { state:{ input } })`가 1회 호출
    - `ok:false(code:INVALID_INPUT)`면 `fieldErrors`에 포함된 키의 TextField 하단에 메시지가 그대로 표시되고 navigate는 호출되지 않음
  - 버튼 로딩: 탭 직후 300ms 동안 `disabled=true`, 라벨 `"계산 중…"`
  - `location.state`는 `RouteState['/input']`로 캐스팅하여 사용한다.
- Covers: [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-6, S2-AC-1, S2-AC-2, S2-AC-3, S2-AC-4]
- Files:
  - `src/pages/InputPage.tsx`
- Depends on: Task 1.1, Task 2.1, Task 2.2, Task 2.9

---

### Task 3.3 [Page-/result] 결과 페이지 구현 (복원 우선순위 + 요약/상세 게이팅 + 광고/공유 + 히스토리 저장)
- Description:
  - `/result` 페이지 구현:
    - 입력 복원 우선순위 1) `location.state.input` 2) query decode 3) last input 4) empty
    - 입력 확보 시 `LastInputStorage.save(input, Date.now())` 1회 호출
    - 계산 로딩(최대 300ms) 동안 “계산 중…” 표시 + 주요 버튼 disabled + 상세 렌더링 금지
    - 계산 실패 시 Dialog(타이틀/본문 고정 문구 + 다시시도/홈으로)
    - 공유 디코드 실패 시 Dialog 고정 문구
    - 성공 시 요약 3카드 + 추천 Chip + 인사이트 + 상세영역(`TossRewardAd` 게이팅)
    - 상세영역: 라인 차트(SVG) + 비용 분석표(ListRow)
    - 비용 분석표 섹션 이후 `AdSlot` 1개 배치(오버레이 금지)
    - 공유하기: `navigator.share` 지원 시에만 사용, 미지원 시 클립보드 복사
    - **성공적으로 입력이 확보된 경우(1~3 중 하나)**: 히스토리 `HistoryStorage.prepend(entry)`를 1회 시도(실패 시 Toast로 안내)
- DoD:
  - 마운트 시 입력 복원 우선순위를 **1→2→3→4**로 적용한다. (S3-AC-1)
  - 입력이 확보되면 `LastInputStorage.save(input, Date.now())`가 1회 호출된다. (S3-AC-2)
  - 1~3 모두 실패하면 Empty UI:
    - `MSG_RESULT_EMPTY` 표시
    - “홈으로” 탭 시 `navigate('/')` 1회 호출 (S3-AC-3)
  - 계산 중(최대 300ms) “계산 중…” `Typography` 표시 + 상세 영역(차트/표) 렌더링을 시도하지 않는다. (F3-AC-6)
  - `SimulationService.calculate()`가 `{ ok:false, error:{ code:'INVALID_INPUT'|'CALC_ERROR' } }`면:
    - `Dialog` 타이틀 `MSG_RESULT_CALC_FAIL_TITLE`
    - 본문 `MSG_RESULT_CALC_FAIL_BODY`
    - 요약/상세 결과 UI는 렌더링되지 않는다. (S3-AC-4)
  - query 디코드 실패 시 `Dialog`에 `MSG_SHARE_DECODE_FAIL_DIALOG` 표시
  - 상세 영역은 `TossRewardAd`로 감싸져 있다.
  - 비용 분석표 이후 콘텐츠 흐름을 끊지 않는 위치에 `AdSlot`이 **정확히 1개** 렌더링된다.
  - 입력이 확보된 경우(복원 1~3) `HistoryStorage.prepend(entry)`가 **정확히 1회 호출**된다.
    - `prepend()`가 `{ ok:false, error:{ code:'STORAGE_UNAVAILABLE'|'STORAGE_QUOTA'|'STORAGE_PARSE'|'STORAGE_SCHEMA' } }`를 반환하면 `Toast`가 **1회** 표시된다(문구는 Epic2의 고정 문구 상수/또는 페이지 내 고정 문구로 구현하되 throw 금지).
  - `location.state`는 `RouteState['/result']`로 캐스팅하여 사용한다.
- Covers: [S3-AC-1, S3-AC-2, S3-AC-3, S3-AC-4, F3-AC-6]
- Files:
  - `src/pages/ResultPage.tsx`
- Depends on: Task 1.1, Task 2.3, Task 2.4, Task 2.7, Task 2.6, Task 2.9

---

### Task 3.4 [Page-/history] 히스토리 페이지 구현 (최대 5개 전체)
- Description:
  - `/history` 페이지 구현: mount 시 `HistoryStorage.list({ page:1, pageSize:5 })` 호출, 성공 시 ListRow 렌더.
  - 로딩(200ms 이내) “불러오는 중…”
  - empty 시 “저장된 기록이 없어요” + “홈으로”
  - parse/schema 오류 시 Toast `MSG_HISTORY_LOAD_FAIL` + 목록 0개
  - 항목 탭 시 `/result`로 navigate(state에 input/historyId 포함)
- DoD:
  - mount 시 `HistoryStorage.list({ page:1, pageSize:5 })` 호출 후 성공한 `items` 수만큼 ListRow 렌더. (S4-AC-1)
  - `items.length === 0`이면 `"저장된 기록이 없어요"` `Typography`와 “홈으로” 버튼 렌더. (S4-AC-2)
  - `{ ok:false, error:{ code:'STORAGE_PARSE'|'STORAGE_SCHEMA' } }`면:
    - `Toast`에 `MSG_HISTORY_LOAD_FAIL` 표시
    - 목록은 0개로 렌더링 (S4-AC-3)
  - 항목 탭 시 `navigate('/result', { state:{ input: entry.input, historyId: entry.id } })`가 1회 호출 (S4-AC-4)
  - `location.state`는 `RouteState['/history']`(undefined)로 일관되게 처리한다.
- Covers: [S4-AC-1, S4-AC-2, S4-AC-3, S4-AC-4]
- Files:
  - `src/pages/HistoryPage.tsx`
- Depends on: Task 1.1, Task 2.8, Task 2.9

---

## Epic 4. Integration + polish (routing wiring)

### Risk Analysis
- Complexity: **Medium**
- Risk factors:
  - 라우팅 누락/경로 오타로 페이지 진입 불가
  - 라우트 연결 후 빌드 에러(미사용 import, 경로 불일치)
- Mitigation:
  - 마지막 태스크에서 **라우팅만** 연결하여 회귀 범위를 최소화
  - 페이지 파일 변경 없이 App 라우팅만 연결(파일 충돌 방지)

---

### Task 4.1 [Routing] React Router 라우팅 연결
- Description:
  - `App.tsx`에서 `/`, `/input`, `/result`, `/history` 라우트를 각 페이지로 연결한다.
- DoD:
  - 앱 실행 시 아래 경로가 각 페이지를 렌더링한다:
    - `/` → `HomePage`
    - `/input` → `InputPage`
    - `/result` → `ResultPage`
    - `/history` → `HistoryPage`
  - TypeScript 컴파일 및 Vite dev 서버가 에러 없이 구동된다.
- Covers: []
- Files:
  - `src/App.tsx`
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4

---

## AC Coverage
- Total ACs in SPEC: **60**
- Covered by tasks: **60**
  - PresetService(4): AC-PS-1..4 → Task 2.1
  - SimulationValidationService(4): AC-VS-1..4 → Task 2.2
  - SimulationService(4): AC-SS-1..4 → Task 2.3
  - ShareService(4): AC-SH-1..4 → Task 2.4
  - HistoryStorage(4): AC-HS-1..4 → Task 2.6
  - LastInputStorage(4): AC-LI-1..4 → Task 2.7
  - Screens S1(4): S1-AC-1..4 → Task 3.1
  - Screens S2(4): S2-AC-1..4 → Task 3.2
  - Screens S3(4): S3-AC-1..4 → Task 3.3
  - Screens S4(4): S4-AC-1..4 → Task 3.4
  - Features F1(7): F1-AC-1..7 → Task 3.1
  - Features F2(6): F2-AC-1..6 → Task 3.2
  - Features F3(7): F3-AC-1..5,7 → Task 2.3 / F3-AC-6 → Task 3.3
- Uncovered: **0**