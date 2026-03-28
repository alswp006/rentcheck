```md
# TASK (UPDATED)

> 목적: Consistency Check Report에서 지적된 PRD/SPEC/TASK 간 갭(스토리지 I/O, simulate(), share 인코딩/디코딩, 폼 탭 상태, 키보드/CTA, S1~S4 UI/네비게이션, AppBar back)을 **모두 해소**한 “MVP 완성 가능한” 작업 리스트.
> 제약: Vite+React+TS, TDS(@toss/tds-mobile)만 UI, react-router-dom, localStorage만 영속. 서버 코드 없음. TossRewardAd는 “결과/분석/추천” 노출 전 게이트에만 사용.

---

## Epic 1. TypeScript types + interfaces

### Risk Analysis
- Complexity: Low
- Risk factors: Route state 타입이 불완전하면 페이지 간 `location.state` 불일치로 런타임 오류 발생
- Mitigation: 첫 작업에서 `RouteState`를 “단일 소스 오브 트루스”로 정의하고, 이후 모든 페이지가 이를 import해 캐스팅하도록 강제

### Task 1.1 [Domain Types + RouteState 계약 정의]
- Description: SPEC의 모든 도메인 타입과 라우팅 state 계약(`RouteState`)을 `src/lib/types.ts`에 정의한다. (런타임 코드 없음)
- DoD:
  - `src/lib/types.ts`에 아래 타입들이 export 된다:
    - `PresetScenario`, `BuyRepaymentType`, `SimulationInput`, `RecommendedOption`, `CostBreakdownRow`, `SimulationResult`, `SimulationError`, `SimulationOutcome`
    - `HistoryEntry`
    - `SharePayloadVersion`, `SharePayloadV1`, `SharePayload`, `ShareDecodeError`
    - **`RouteState`** (아래 경로 키 포함: `'/' | '/input' | '/result' | '/history'`)
  - `RouteState`는 최소 아래를 만족한다(컴파일 타임 검증 가능):
    - `RouteState['/input']`는 `{ presetId: 'P1'|'P2'|'P3'|'P4'|null } | { input: SimulationInput } | undefined`
    - `RouteState['/result']`는 `{ input: SimulationInput; source: 'input'|'history'|'share' } | undefined`
    - `RouteState['/']`와 `RouteState['/history']`는 `undefined`
  - 앱이 TypeScript 에러 없이 빌드/컴파일 된다.
- Covers: []
- Files:
  - `src/lib/types.ts`
- Depends on: none

---

## Epic 2. Data layer (pure utilities + storage + share + core simulation)

### Risk Analysis
- Complexity: Medium
- Risk factors:
  - localStorage 파싱 실패/스키마 손상 시 크래시
  - 히스토리 중복/정렬/eviction 정책 구현 누락
  - QuotaExceededError 처리 누락 시 저장 시점 크래시
  - 순수 계산 함수에서 NaN/Infinity 발생
  - 공유 payload 길이/스키마 불일치 처리 누락
- Mitigation:
  - (1) 저장소 로드/스키마검증을 먼저 분리 구현 → UI는 “정상 데이터만 받는” 전제 확보
  - (2) upsert/eviction/에러 반환을 독립 helper로 구현 → AC를 단위로 확인 가능
  - (3) simulate/share는 순수 모듈로 분리 → UI와 독립 검증 가능

### Task 2.1 [Preset 상수 테이블 구현]
- Description: 프리셋 4종 상수 `PRESET_SCENARIOS`를 SPEC 그대로 구현한다.
- DoD:
  - `PRESET_SCENARIOS`가 길이 4이고 id가 `P1~P4`로 고정된다.
  - 각 `defaultInput`은 `SimulationInput`의 **전체 필드**를 포함(누락 시 TS 에러로 검출).
  - 각 `defaultInput.presetId === id`를 만족한다.
  - 컴파일 성공.
- Covers: []
- Files:
  - `src/lib/presets.ts`
- Depends on: Task 1.1

### Task 2.2 [숫자/원화 포맷 + 입력 파서 유틸]
- Description: 원화(천단위 콤마+원), 퍼센트 표시, 숫자 입력 문자열을 number로 파싱하는 유틸을 만든다.
- DoD:
  - `formatKRW(1234567) === "1,234,567원"` 형태로 반환한다.
  - `formatKRW(NaN)` / `formatKRW(Infinity)` / `formatKRW(-123)` 입력에 대해 반환 규칙이 코드로 고정되어 있다(예: `"0원"` 또는 `""` 중 하나로 통일).
  - `parseNumberInput("1,234") === 1234`, `parseNumberInput("") === null`, `parseNumberInput("  ") === null`
  - 유틸은 DOM/브라우저 API에 의존하지 않는 순수 함수다.
- Covers: []
- Files:
  - `src/lib/format.ts`
- Depends on: Task 1.1

### Task 2.3 [SimulationInput 검증 + 히스토리 라벨 생성]
- Description: 입력 검증 로직과 히스토리 라벨 생성 함수를 구현한다.
- DoD:
  - `validateSimulationInput(input)`가 필드별 에러를 반환한다(예: `{ residencePeriodYears?: string; buyEquity?: string; jeonseLoanRatio?: string; investmentReturnRate?: string; ... }`).
  - 아래 케이스에서 정확히 지정 문구를 반환한다:
    - `residencePeriodYears`가 1~30 밖 → `"거주기간은 1~30년만 입력할 수 있어요"`
    - `buyEquity > buyPrice` → `"자기자본은 매매가를 초과할 수 없어요"`
    - `jeonseLoanRatio`가 0~1 밖 → `"대출비율은 0~1 사이만 입력할 수 있어요"`
    - (결과 화면용) `investmentReturnRate`가 0~30 밖 → `"투자수익률은 0~30%만 입력할 수 있어요"`
  - `buildHistoryLabel(input, source)`가 문자열을 반환한다(길이 1~60자).
  - `buildHistoryLabel`은 입력에 따라 항상 동일한 결과를 반환한다(랜덤/시간 의존 없음).
- Covers: [F2-AC-2, F2-AC-3, F2-AC-4, F5-AC-3]
- Files:
  - `src/lib/validate.ts`
- Depends on: Task 1.1, Task 2.2

### Task 2.4 [순수 시뮬레이션 엔진 simulate(input) 구현]
- Description: SPEC의 Calculation Logic에 따라 `simulate(input): SimulationOutcome`를 구현한다. (예외 throw 금지)
- DoD:
  - `simulate(input)`는 어떤 입력에서도 예외를 throw하지 않는다.
  - NaN/Infinity 감지 시 즉시 `{ ok:false, error:'INVALID_INPUT' }` 반환한다.
  - `residencePeriodYears=10`이면 `netWorthByYear.jeonse|monthly|buy` 각각 `length === 11`이다(0년~10년).
  - `finalNetWorth.*`는 `netWorthByYear.*[residencePeriodYears]`와 동일하다.
  - 추천 옵션/동률 우선순위 `BUY > JEONSE > MONTHLY`가 코드로 고정되어 있다.
  - `insightCopy`는 1~80자이며, 80자 초과 시 잘라내기 규칙이 코드로 존재한다.
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5]
- Files:
  - `src/lib/simulate.ts`
- Depends on: Task 1.1, Task 2.2

### Task 2.5 [SharePayload Base64URL 인코딩/디코딩]
- Description: `/result?s=` 공유 규약에 맞게 encode/decode 유틸을 구현한다.
- DoD:
  - `encodeSharePayload(input)`는 `SharePayloadV1`(v=1, input 포함)을 Base64URL 문자열로 반환한다.
  - `decodeSharePayloadFromSearch(search: string)`가 아래를 만족:
    - `s` 미존재 → `{ ok:false, error:'MISSING_PARAM' }`
    - `s.length > 1800` → `{ ok:false, error:'TOO_LONG' }`
    - base64 decode 실패 → `{ ok:false, error:'INVALID_BASE64' }`
    - JSON parse 실패 → `{ ok:false, error:'INVALID_JSON' }`
    - 스키마 불일치(v!==1, input 필수필드 누락/타입 불일치) → `{ ok:false, error:'SCHEMA_MISMATCH' }`
  - 성공 시 `{ ok:true, payload: SharePayloadV1 }` 반환.
- Covers: [AC-S3-3, F4-AC-6]
- Files:
  - `src/lib/share.ts`
- Depends on: Task 1.1

### Task 2.6 [History 로드: 안전 파싱 + 스키마 검증 + 손상 엔트리 스킵]
- Description: localStorage에서 `rentcheck.history.v1`를 로드하고, 스키마 검증을 통과한 항목만 반환한다.
- DoD:
  - `loadHistory(): { ok:true; entries: HistoryEntry[] } | { ok:false; error:'READ_FAIL'|'PARSE_FAIL' }` 형태로 구현(throw 금지).
  - 키 미존재(`getItem === null`) → `entries=[]`로 ok 반환.
  - JSON이 `"NOT_JSON"`이면 `{ ok:false, error:'PARSE_FAIL' }`.
  - 배열 내 `input`이 `null` 등 필수 필드 누락 엔트리는 반환 배열에서 제외된다(나머지 정상 엔트리는 유지).
- Covers: [F1-AC-4, F1-AC-5, F1-AC-7]
- Files:
  - `src/lib/storage/historyLoad.ts`
- Depends on: Task 1.1

### Task 2.7 [History 저장(upsert): deepEqual 중복 처리 + 정렬 + max-5 eviction + quota 에러 반환]
- Description: 결과 저장 시 히스토리를 정책대로 갱신하고 localStorage에 저장한다.
- DoD:
  - `upsertHistory(input, nowISO)` 동작:
    - 기존 엔트리와 `entry.input`이 deep equal이면 새 엔트리 생성 금지, 해당 엔트리 `updatedAt` 갱신 + label 재생성 + index 0 이동 + `createdAt` 유지
    - deep equal이 없으면 새 엔트리 생성 후 index 0에 추가
    - 저장 후 길이 > 5면 **createdAt이 가장 오래된 1개 제거**하여 길이 5 유지
  - `localStorage.setItem`이 QuotaExceededError면 `{ ok:false, error:'QUOTA_EXCEEDED' }`로 반환(throw 금지) + 실제 저장값은 변경하지 않음
  - 저장 성공 시 항상 `rentcheck.history.v1`의 배열 길이는 `<=5`.
- Covers: [AC-S4-5, F6-AC-2, F6-AC-3, F6-AC-5]
- Files:
  - `src/lib/storage/historyUpsert.ts`
- Depends on: Task 1.1, Task 2.3

### Task 2.8 [UI 저장소: lastPresetId(optional)]
- Description: 선택 UI 상태 저장(`rentcheck.ui.v1`)을 위한 간단 helper를 구현한다.
- DoD:
  - `loadUiState()`는 실패 시 `{ ok:false }`로 반환(throw 금지).
  - `saveUiState(next)`는 실패 시 `{ ok:false }`로 반환(throw 금지).
  - 저장 성공 시 `rentcheck.ui.v1`에는 JSON 오브젝트가 저장된다.
- Covers: []
- Files:
  - `src/lib/storage/uiState.ts`
- Depends on: Task 1.1

### Task 2.9 [State management: HistoryStore(Context) 구축]
- Description: 페이지들이 공통으로 히스토리 로드/저장/삭제를 사용할 수 있도록 React Context를 만든다.
- DoD:
  - `HistoryProvider` + `useHistoryStore()` 제공:
    - 상태: `entries`, `isLoading`, `loadError: null|'READ_FAIL'|'PARSE_FAIL'`, `lastWriteError: null|'QUOTA_EXCEEDED'`
    - 액션: `refresh()`, `saveFromInput(input, source)`, `clearAll()`
  - `refresh()`는 내부적으로 `loadHistory()`를 호출하고, 성공 시 `entries`를 교체한다.
  - `saveFromInput`은 내부적으로 upsert를 호출하고, 성공 시 `entries`를 즉시 갱신한다.
  - 어떤 액션도 예외를 throw하지 않아야 한다(try/catch 처리).
  - 컴파일 성공(아직 페이지에서 미사용이어도 됨).
- Covers: [F6-AC-2, F6-AC-3, F6-AC-5]
- Files:
  - `src/lib/state/HistoryStore.tsx`
- Depends on: Task 2.6, Task 2.7

### Task 2.10 [클립보드 복사 유틸 (공유용)]
- Description: Result 공유 링크를 클립보드에 복사하기 위한 유틸을 만든다.
- DoD:
  - `copyTextToClipboard(text: string): Promise<{ ok:true } | { ok:false }>` 형태로 구현한다(throw 금지).
  - `navigator.clipboard?.writeText`가 존재하면 이를 사용한다.
  - 존재하지 않으면 `document.createElement('textarea')` + `document.execCommand('copy')` fallback을 사용한다.
- Covers: [F4-AC-5]
- Files:
  - `src/lib/clipboard.ts`
- Depends on: none

---

## Epic 3. Core UI (shared components + pages)

### Risk Analysis
- Complexity: Medium
- Risk factors:
  - `location.state` 타입 불일치로 런타임 오류
  - TossRewardAd 게이트 전 결과 DOM 노출(검수/AC 실패)
  - 키보드/스크롤로 CTA가 가려짐
  - Toast/Dialog가 중복 노출
  - AppBar back 동작 불일치
- Mitigation:
  - 모든 페이지에서 `RouteState`를 import하여 `location.state as RouteState['/path']`로 캐스팅
  - Result는 “게이트 완료 플래그” 이전에 결과 섹션을 조건부 렌더링
  - Toast는 동일 메시지 1회만 뜨도록 `useRef` 가드
  - AppBar back은 공용 컴포넌트로 통일

### Task 3.0 [공용 AppBar: Back 버튼 규칙 컴포넌트]
- Description: `/input`, `/result`, `/history`에서 공통으로 쓰는 Back AppBar를 만든다.
- DoD:
  - `AppBarWithBack` 컴포넌트가 생성된다.
  - props:
    - `title: string`
    - `fallbackPath?: '/' | '/history' | '/input'` (미지정 시 `/`)
  - Back 탭 시 동작:
    - `window.history.length > 1`이면 `navigate(-1)`가 1회 호출된다.
    - 아니면 `navigate(fallbackPath ?? '/')`가 1회 호출된다.
  - TDS `AppBar`만 사용한다.
- Covers: []
- Files:
  - `src/components/AppBarWithBack.tsx`
- Depends on: Task 1.1

### Task 3.1 [홈 페이지 `/` 구현]
- Description: 프리셋 4개 + 직접입력 진입 + 히스토리 미리보기(최대 2개) + “더보기” + 로드 실패 토스트를 구현한다.
- DoD:
  - 프리셋 영역:
    - 프리셋 P1 ListRow 탭 시 `navigate('/input', { state: { presetId: 'P1' } })`가 **1회** 호출된다.
    - 프리셋 P2~P4도 각각 동일 규칙으로 동작한다(각 id에 대해 state가 정확히 전달됨).
    - “직접 입력” ListRow 탭 시 `navigate('/input', { state: { presetId: null } })`가 **1회** 호출된다.
  - 히스토리 미리보기:
    - 히스토리 로드 성공 & entries 길이 0이면 `"최근 기록이 없어요"`가 보이고 히스토리 ListRow는 0개다.
    - 히스토리 로드 성공 & entries 길이 1 이상이면 **최대 2개**만 렌더링된다.
    - 히스토리 항목 탭 시 `navigate('/input', { state: { input: entry.input } })`가 1회 호출된다.
  - 히스토리 더보기:
    - “기록 더보기” ListRow(또는 Button) 탭 시 `navigate('/history')`가 1회 호출된다.
  - 에러:
    - 히스토리 로드가 `READ_FAIL|PARSE_FAIL`이면 300ms 이내 `"저장된 기록을 불러오지 못했어요"` Toast가 1회 표시되고, 미리보기는 0개다.
  - `RouteState`를 import하여 state 전달 타입이 컴파일 타임에 검증된다.
- Covers:
  - [AC-S1-1, AC-S1-2, AC-S1-3, AC-S1-4]
  - [F1-AC-1, F1-AC-2, F1-AC-3, F1-AC-4, F1-AC-5, F1-AC-6, F1-AC-7, F1-AC-8]
- Files:
  - `src/pages/HomePage.tsx`
- Depends on: Task 1.1, Task 2.9, Task 2.1

### Task 3.2 [입력 페이지 `/input` 구현]
- Description: 3탭(전세/월세/매매) + 공통 입력 + state 기반 초기화(프리셋/히스토리) + 유효성 검증 + 키보드 blur/스크롤 + 결과로 navigate를 구현한다.
- DoD:
  - 진입/초기화:
    - 진입 시 `location.state as RouteState['/input']`를 사용한다.
    - `state={ presetId:'P2' }`로 들어오면 최대 300ms 동안 `"입력값을 불러오는 중..."`이 보인 뒤, `PRESET_SCENARIOS['P2'].defaultInput` 기반 값이 폼에 채워진다.
    - `state={ input }`로 들어오면 최대 300ms 내에 해당 `input` 기반 값이 폼에 채워진다.
    - 손상된 state(예: `{ input:{ presetId:null } as any }`)이면 `"입력값을 불러올 수 없어요"` Dialog가 보이고, 확인 탭 시 `navigate('/')`가 1회 호출된다.
  - TabBar/상태:
    - TabBar에 `"전세" / "월세" / "매매"` 탭이 존재한다.
    - 탭 전환 후 다시 돌아왔을 때, 사용자가 입력한 값이 유지된다(리셋되지 않음).
  - 검증/네비게이션:
    - 유효 입력으로 “결과 보기” 탭 시 `navigate('/result', { state: { input, source:'input' } })`가 1회 호출된다.
    - 아래 invalid 시 navigate가 호출되지 않고 필드 하단 에러 Typography가 정확히 표시된다:
      - `residencePeriodYears=0` → `"거주기간은 1~30년만 입력할 수 있어요"`
      - `buyEquity > buyPrice` → `"자기자본은 매매가를 초과할 수 없어요"`
      - `jeonseLoanRatio=1.2` → `"대출비율은 0~1 사이만 입력할 수 있어요"`
  - 키보드:
    - “결과 보기” 탭 시 `document.activeElement`가 HTMLElement이면 `blur()`가 1회 호출된다.
    - 각 TextField의 `onFocus`에서 CTA 영역 ref에 대해 `scrollIntoView({ block: 'nearest' })`가 호출되도록 구현되어 있다(CTA 가림 방지 최소 보장).
  - AppBar:
    - 상단에 `AppBarWithBack`이 렌더링된다.
- Covers:
  - [AC-S2-1, AC-S2-2, AC-S2-3, AC-S2-4]
  - [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-6]
- Files:
  - `src/pages/InputPage.tsx`
- Depends on: Task 3.0, Task 1.1, Task 2.1, Task 2.3, Task 2.2

### Task 3.3 [결과 페이지 `/result` 구현 (광고 게이트 + 계산 + 재계산 + 공유 + 저장)]
- Description: 보상형 광고 게이트 후 결과 렌더링, 쿼리 공유 진입 처리, 즉시 재계산(적용 버튼), 공유(BottomSheet+복사), 히스토리 저장, 배너 광고(AdSlot) 배치를 구현한다.
- DoD:
  - 진입 처리:
    - 진입 시 `location.state as RouteState['/result']`를 사용한다.
    - query `?s=`가 존재하면 `decodeSharePayloadFromSearch(location.search)`로 디코딩을 시도한다.
  - 광고 게이트:
    - 광고 완료 전에는 결과 카드(ListRow 섹션) DOM이 **0개**다.
    - 광고 완료 콜백 이후 결과 카드가 **정확히 3개(전세/월세/매매)** 렌더링된다.
    - `"적용"`을 여러 번 눌러도 `TossRewardAd`가 추가 노출되지 않는다(게이트 완료 boolean으로 제어).
  - 빈 상태/에러:
    - state/쿼리 모두 없으면 `"결과를 표시할 수 없어요"` + `"홈으로"` 버튼이 보이고 버튼 탭 시 `navigate('/')`가 1회 호출된다.
    - `/result?s=...`에서 디코딩이 `ShareDecodeError`면 300ms 이내 `"공유 링크가 올바르지 않아요"` Toast 1회 + `navigate('/')` 1회 호출된다.
  - 계산/렌더:
    - 최초 계산/재계산 공통으로 `isCalculating=true` 동안 `"계산 중..."` 텍스트가 보인다(동기 계산이면 즉시 사라져도 됨).
    - 최초 계산 결과가 `{ ok:false }`면 `"계산할 수 없는 입력값이 있어요"` Dialog가 표시되고 `"입력 수정"` 탭 시 `navigate('/input', { state:{ input } })`가 1회 호출된다.
    - 결과 렌더 조건:
      - 카드 각 1개 이상에 `"N년 후 순자산"` 텍스트 포함
      - 추천 옵션 카드에만 `"추천"` Chip이 1개 표시
      - `insightCopy`가 Typography로 그대로 표시
      - 비용표가 ListRow로 정확히 5행 렌더링(각 행에 label/전세/월세/매매 금액 텍스트)
  - 재계산(게이트 완료 후):
    - 집값상승률 2→3 변경 후 `"적용"` 탭 시 `simulate()`가 1회 호출되고, 최종 순자산 표시(최소 1개)가 이전 값과 달라진다.
    - 투자수익률 5→7 변경 후 `"적용"` 탭 시 `insightCopy` 문자열이 이전과 달라진다.
    - 투자수익률 -1로 `"적용"` 탭 시 `"투자수익률은 0~30%만 입력할 수 있어요"` 표시 + `simulate()` 미호출
    - 거주기간 10→12로 `"적용"` 탭 시 새 결과 `netWorthByYear.jeonse.length === 13`이고, “차트(연도 리스트)” 행 수도 13으로 다시 렌더링된다.
    - 재계산이 `{ ok:false }`면 300ms 이내 `"입력값을 확인해 주세요"` Toast 1회 + **기존 결과 표시가 유지**된다.
  - 공유:
    - “공유” 버튼 탭 시 BottomSheet가 열린다.
    - BottomSheet 내 “링크 복사” 버튼 탭 시 `encodeSharePayload(currentInput)`로 링크를 만들고 `copyTextToClipboard(url)`이 1회 호출된다.
    - 복사 성공 시 300ms 이내 Toast `"링크를 복사했어요"`가 1회 표시된다. 실패 시 300ms 이내 Toast `"링크를 복사하지 못했어요"`가 1회 표시된다.
  - 히스토리 저장:
    - `/input`→`/result` 진입 후 **광고 게이트 완료 시점**에 `saveFromInput`이 호출되어 저장이 시도된다.
    - QuotaExceeded인 경우 크래시 없이 300ms 이내 `"저장 공간이 부족해 기록을 저장하지 못했어요"` Toast 1회 표시.
  - 광고 배치:
    - 페이지 하단에 `AdSlot`이 렌더링된다(게이트 완료 여부와 무관하게 컴포넌트 존재).
  - AppBar:
    - 상단에 `AppBarWithBack`이 렌더링된다.
- Covers:
  - [AC-S3-1, AC-S3-2, AC-S3-3, AC-S3-4]
  - [F3-AC-6]
  - [F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-5, F4-AC-6, F4-AC-7]
  - [F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-4, F5-AC-5, F5-AC-6, F5-AC-7]
  - [F6-AC-1, F6-AC-3]
- Files:
  - `src/pages/ResultPage.tsx`
- Depends on: Task 3.0, Task 1.1, Task 2.4, Task 2.5, Task 2.10, Task 2.2, Task 2.3, Task 2.9

### Task 3.4 [히스토리 페이지 `/history` 구현]
- Description: 최근 5개 목록, 로딩/빈상태/에러 토스트, 항목 탭 재진입, 전체 삭제 Dialog를 구현한다.
- DoD:
  - 진입 후 로드 중(최대 300ms) `"기록을 불러오는 중..."`이 표시된다.
  - 로드 실패 시 300ms 이내 `"저장된 기록을 불러오지 못했어요"` Toast 1회 표시된다.
  - entries 길이 0이면 `"저장된 기록이 없어요"` + 홈으로 버튼이 표시되고, 버튼 탭 시 `navigate('/')`가 1회 호출된다.
  - entries 길이 1 이상이면 ListRow로 entries 길이만큼 렌더링되며(최대 5개), 각 항목 탭 시 `navigate('/input', { state:{ input: entry.input } })`가 1회 호출된다.
  - “전체 삭제” → Dialog 확인 “삭제” 탭 시:
    - localStorage `rentcheck.history.v1`가 `[]`로 저장되고
    - 화면에 `"저장된 기록이 없어요"`가 표시된다.
  - AppBar:
    - 상단에 `AppBarWithBack`이 렌더링된다.
- Covers:
  - [AC-S4-1, AC-S4-2, AC-S4-3, AC-S4-4, AC-S4-5]
  - [F6-AC-4]
- Files:
  - `src/pages/HistoryPage.tsx`
- Depends on: Task 3.0, Task 1.1, Task 2.9

---

## Epic 4. Integration + polish (routing wiring, provider)

### Risk Analysis
- Complexity: Low / Medium
- Risk factors:
  - 라우팅 누락/오타로 페이지 진입 불가
  - Provider 미적용으로 히스토리 동작 불가
  - 콘솔 에러 출력(검수 리스크)
- Mitigation:
  - 마지막에 라우팅/Provider를 한 번에 연결하고, “예상 가능한 오류”는 Toast/Dialog로만 처리하도록 정리

### Task 4.1 [Router 연결 + Provider 장착 + Ad 배치 최종 점검]
- Description: React Router에 4개 화면을 연결하고, 전역 Provider를 적용한다. Result 하단 배너 광고(AdSlot) 배치를 최종 확인한다.
- DoD:
  - 라우팅:
    - `/` → `HomePage`
    - `/input` → `InputPage`
    - `/result` → `ResultPage`
    - `/history` → `HistoryPage`
  - 앱 최상단에서 `HistoryProvider`로 감싼다.
  - Result 페이지 하단에 `AdSlot`이 렌더링된다.
  - 개발/프로덕션 빌드에서 TypeScript 에러 없이 컴파일된다.
  - 코드에 `console.error(` 직접 호출이 존재하지 않는다(검색 기준 0건).
- Covers: [F1-AC-8]
- Files:
  - `src/App.tsx` (또는 템플릿 라우터 파일)
  - `src/routes.tsx` (프로젝트 구조에 맞게, 생성/수정)
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 2.9

---

## AC Coverage
- Total ACs in SPEC: 56
- Covered by tasks: 56 (all)
- Uncovered: 0

## Gap Fix Trace (Report → Task)
- S1 history load/error/toast → Task 2.6, 2.9, 3.1
- S1 preset UI rendering + /input navigation → Task 2.1, 3.1
- S2 tab switching + form state + incoming state parse/init → Task 3.2
- S2 keyboard blur + CTA scrollIntoView → Task 3.2
- S3 simulate() engine → Task 2.4
- S3 breakdown table UI(5행) → Task 3.3
- S3 share encode/decode + clipboard → Task 2.5, 2.10, 3.3
- S4 history list + clear-all → Task 3.4 (+ storage via 2.6/2.7/2.9)
- AppBar/back button logic → Task 3.0 (and used by 3.2~3.4)
```
