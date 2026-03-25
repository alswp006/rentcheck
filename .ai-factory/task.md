# TASK

## Epic 1. TypeScript types + interfaces (`src/lib/types.ts`)
### Task 1.1 핵심 타입/계약 정의
- Description:
  - SPEC에 정의된 **모든 엔티티/계약 타입**을 `src/lib/types.ts`에 “순수 타입”으로 정리한다(런타임 로직/상수 없음).
  - 포함 범위: Data Models, StorageAdapter 계약, Toss SDK Integrations 계약(로그인/결제/광고), 공통 Result 타입.
- DoD:
  - `src/lib/types.ts`에 아래 타입/인터페이스가 **모두 export** 된다.
    - Data models: `PresetScenario`, `SimulationInput`, `SimulationResult`, `HistoryEntry`, `SharePayload`, `AppSettings`, `Entitlement`
    - Value types: `BuyRepaymentType`, `OptionKey`
    - Storage: `StorageErrorCode`, `StorageResult<T>`, `ListHistoryParams`, `HistoryListResponse`, `StorageAdapter`
    - Auth: `TossUser`, `TossAuthErrorCode`, `TossAuthResult`, `TossLoginAdapter`
    - Payment: `PaymentRequest`, `PaymentFailCode`, `PaymentSuccess`, `PaymentResult`, `TossPaymentAdapter`
    - Reward ad: `RewardAdFailCode`, `RewardAdResult`
  - 앱이 컴파일된다(Type-only 파일, 미사용 export 허용).
- Covers: (타입 정의 태스크이므로 기능 AC 직접 커버 없음)
- Files:
  - `src/lib/types.ts`
- Depends on: none

**Risk Analysis (Epic 1)**
- Complexity: Low
- Risk factors: 타입 누락/이름 불일치로 이후 태스크 연쇄 TS 에러 발생
- Mitigation: 가장 먼저 단일 소스로 타입을 고정해 이후 구현이 이 파일만 기준으로 진행되도록 함

---

## Epic 2. Data layer (helpers, localStorage, state, pure functions)

### Task 2.1 프리셋/기본 입력 + 유틸(딥카피/uuid/라벨) 준비
- Description:
  - 코드 상수 프리셋 4개와 입력 스냅샷 생성 유틸을 만든다.
  - 포함: `PRESET_SCENARIOS`(길이 4), `createSimulationInputFromPreset`, `createDefaultSimulationInput`, `deepClone`, `createUuid`, `buildHistoryLabel`.
- DoD:
  - `PRESET_SCENARIOS.length === 4`가 보장된다.
  - `PRESET_SCENARIOS`에는 SPEC 예시를 만족하는 항목이 **최소 1개 포함**된다:
    - `{ id:"preset-1", name:"프리셋1", defaultInput.presetId === "preset-1", defaultInput.jeonseDeposit === 300000000, ... residenceYears === 10 }`
  - `createUuid()`:
    - `crypto.randomUUID`가 존재하면 그 값을 사용한다.
    - 없으면 fallback으로 비어있지 않은 uuid 형태 문자열(충돌 가능성이 낮은 랜덤 기반)을 반환한다.
  - `deepClone(obj)`는 JSON 기반으로 동작하며 원본 객체 참조를 유지하지 않는다.
  - `buildHistoryLabel(input, presetNameOrNull)`은 빈 문자열을 반환하지 않는다.
  - 앱 컴파일 성공.
- Covers:
  - AC-F1-1, AC-F1-2 (프리셋 4개/프리셋1 존재 전제)
  - AC-F4-1 (라벨에 “직접 입력” 포함 가능 기반)
- Files:
  - `src/lib/presets.ts`
  - `src/lib/utils/uuid.ts`
  - `src/lib/utils/clone.ts`
  - `src/lib/history/label.ts`
- Depends on: Task 1.1

### Task 2.2 localStorage StorageAdapter 구현 (Settings/Entitlement/History CRUD)
- Description:
  - SPEC의 `StorageAdapter` 계약을 만족하는 localStorage 어댑터를 구현한다.
  - 키/기본값/에러코드 매핑/History pagination/최대 5개 유지/ID 충돌 검증 포함.
- DoD (pass/fail):
  - `STORAGE_KEYS` 런타임 상수가 아래 값으로 export 된다.
    - `history: "rc_history_v1"`, `settings:"rc_settings_v1"`, `entitlement:"rc_entitlement_v1"`
  - `getSettings()`:
    - 키가 없으면 **에러가 아니라** `ok:true`로 기본값(`hasSeenSimulationDisclaimer:false`, `createdAt:0`, `updatedAt:0`)을 반환한다.
  - `getEntitlement()`:
    - 키가 없으면 **에러가 아니라** `ok:true`로 기본값 `{ isPremium:false, premiumSince:null, ownerUserId:null, maxResidenceYears:10, createdAt:0, updatedAt:0, id:<string> }`를 반환한다.
  - `listHistory({page, pageSize})`:
    - `page < 1` 또는 `pageSize !== 5`면 `ok:false, code:"INVALID_PARAMS"`
    - 반환 items는 `createdAt` 내림차순(최신순)
    - `page > 1` 요청은 `ok:true`이며 `items:[]`, `total` 유지, `page`는 요청값 그대로
  - `saveHistoryEntry(entry)`:
    - 동일 `id`가 이미 존재하면 `ok:false, code:"VALIDATION_ERROR"`
    - 저장 후 `rc_history_v1` 배열 길이가 항상 `<= 5`
    - 6개째 추가 시 `createdAt`이 가장 작은 1개를 제거하고도 반환은 `ok:true`
  - `deleteHistoryById(id)`:
    - id가 없으면 `ok:false, code:"NOT_FOUND"`
  - `QuotaExceededError`(또는 동일 성격 예외)는 `code:"QUOTA_EXCEEDED"`로 매핑된다.
  - 앱 컴파일 성공.
- Covers:
  - AC-S4-1, AC-S4-2, AC-S4-4, AC-S4-6
  - AC-F4-2, AC-F4-6
- Files:
  - `src/lib/storage/keys.ts`
  - `src/lib/storage/localStorageAdapter.ts`
- Depends on: Task 1.1, Task 2.1

### Task 2.3 SharePayload 인코딩/디코딩 유틸 (base64 + 버전 검증)
- Description:
  - `SharePayload` 생성/인코딩 및 `?s=` 디코딩을 담당하는 순수 유틸을 만든다.
  - UTF-8 안전(TextEncoder/TextDecoder) 기반 base64 encode/decode를 구현한다.
- DoD:
  - `encodeShareParamV1(input)`이 `{ version:1, input }`를 JSON stringify 후 base64로 인코딩한 문자열을 반환한다(throw 금지).
  - `decodeShareParam(s)`:
    - base64 디코딩 또는 JSON 파싱 실패 시 `ok:false`를 반환(throw 금지)
    - `version !== 1`이면 `ok:false`이며 “버전 불일치”를 구분 가능한 코드/필드로 반환한다.
  - 앱 컴파일 성공.
- Covers:
  - AC-F5-2, AC-F5-4
  - AC-S2-6, AC-F2-8 (디코딩 실패 UI 처리를 가능하게 하는 기반)
- Files:
  - `src/lib/share/shareCodec.ts`
- Depends on: Task 1.1, Task 2.1

### Task 2.4 시뮬레이션 엔진 + 입력 검증 (순수 함수)
- Description:
  - `SimulationInput` → `SimulationResult` 순수 계산 함수를 구현한다.
  - NaN/Infinity/음수/과도한 residenceYears 방어 및 추천 옵션/차이 계산 규칙 포함.
- DoD:
  - `simulate(input)`은 **절대 throw 하지 않는다**.
  - `residenceYears=10`이면 `netWorthByYear.jeonse/monthly/buy.length === 11`을 만족한다.
  - `finalNetWorth`에서 최댓값이 monthly인 경우:
    - `recommendedOption === "monthly"`
    - `diffFromBest.monthly === 0`
  - `SimulationInput`에 `NaN` 또는 `Infinity`가 포함되면:
    - 실패 결과를 반환하고(throw 금지)
    - 호출자가 “입력값을 확인해주세요”를 표시할 수 있도록 실패 메시지/코드를 제공한다.
  - `residenceYears`가 과도(예: 100)하면 계산을 수행하지 않고 실패 결과를 반환하며 메시지는 **정확히** `"거주기간이 너무 커요"`이다.
  - 결과의 모든 금액 값은 원 단위 정수로 반올림되어 저장된다.
  - 앱 컴파일 성공.
- Covers:
  - AC-F3-1, AC-F3-2, AC-F3-5, AC-F3-6
- Files:
  - `src/lib/simulation/simulate.ts`
  - `src/lib/simulation/validation.ts`
- Depends on: Task 1.1

### Task 2.5 App 상태 관리(Context): entitlement/settings hydrate + effective entitlement selector
- Description:
  - 앱 전역에서 `Entitlement`, `AppSettings`를 hydrate하고 갱신하는 Context/Hook을 만든다.
  - “ownerUserId 불일치 시 premium 미적용”을 **저장값 변경 없이** 계산하는 selector 제공.
- DoD:
  - `AppProvider` 마운트 시 `StorageAdapter.getEntitlement()` + `getSettings()`를 1회 호출하고 로딩 플래그를 제공한다.
  - `setEntitlement(next)`:
    - storage 저장이 `ok:true`일 때만 in-memory 상태가 갱신된다.
    - 저장 실패 시 in-memory 상태는 변경되지 않는다.
  - `getEffectiveEntitlement(currentUserId)`:
    - 저장된 entitlement가 `isPremium:true`여도, `ownerUserId !== currentUserId`이면 반환값은 `isPremium:false`, `maxResidenceYears:10`이다.
    - storage 레코드는 수정하지 않는다.
  - 앱 컴파일 성공.
- Covers:
  - AC-S1-4, AC-F1-4 (홈 로딩 표시를 위한 hydrate 상태 기반)
  - AC-F6-5 (다른 계정 로그인 시 프리미엄 미적용 로직 기반)
- Files:
  - `src/lib/state/AppProvider.tsx`
  - `src/lib/state/useAppState.ts`
- Depends on: Task 2.2

**Risk Analysis (Epic 2)**
- Complexity: Medium
- Risk factors:
  - localStorage 예외(SecurityError/QuotaExceeded) 미흡 시 크래시
  - base64 UTF-8 처리 미흡 시 payload 디코딩 실패
  - 계산 엔진 NaN/Infinity로 렌더링 크래시
- Mitigation:
  - (2.2)에서 모든 I/O 예외를 `StorageResult`로 흡수 → UI는 Toast/Dialog로만 처리
  - (2.3) 디코딩을 throw-free로 고정
  - (2.4) simulate를 throw 금지로 고정해 ResultPage 안정성 확보

---

## Epic 3. Core UI pages (`src/pages/`) — ONE page per task

### Task 3.1 홈 페이지(`/`) 구현 (프리셋 4개 + 이동)
- Description:
  - SPEC S1 UI/상태/실패 처리를 포함한 `HomePage` 구현.
- DoD:
  - 최초 렌더에서 `ListRow` 4개가 렌더되고 각 row에 프리셋 `name`이 표시된다.
  - entitlement hydrate 전에는 `Typography`로 정확히 `"불러오는 중..."`이 표시된다.
  - 프리셋 탭 시 `/result`로 navigate 되며 navigation state에 `SimulationInput.presetId === preset.id`가 포함된다.
  - “직접 입력하기” 탭 시 `/input`으로 이동한다.
  - 프리셋 길이가 4가 아니면 `Dialog` 본문에 정확히 `"프리셋을 불러오지 못했어요"` 포함, 확인 탭 시 `/input` 이동.
  - 프리셋 탭 처리 중 예외 발생 시 `Toast`로 정확히 `"이동에 실패했어요"`, 라우트는 `/` 유지.
  - 앱 컴파일 성공.
- Covers:
  - AC-S1-1, AC-S1-2, AC-S1-3, AC-S1-4, AC-S1-5, AC-S1-6
  - AC-F1-1, AC-F1-2, AC-F1-3, AC-F1-4, AC-F1-5, AC-F1-6
- Files:
  - `src/pages/HomePage.tsx`
- Depends on: Task 2.1, Task 2.5

### Task 3.2 입력 페이지(`/input`) 구현 (TabBar + 숫자키보드 + 검증 + hydrate)
- Description:
  - SPEC S2 입력 폼(전세/월세/매매 탭 + 공통 설정)과 검증/로딩/실패 Dialog를 구현한다.
  - `?s=` 공유 파라미터가 있으면 디코딩해 폼을 hydrate한다.
- DoD:
  - `jeonseDeposit`, `monthlyRent` TextField에 `inputMode="numeric"`가 설정된다.
  - TabBar에서 “월세” 탭 선택 시 `monthlyRent` 입력 그룹이 화면에 표시된다.
  - `residenceYears=0`으로 “결과 보기” 탭 시 residenceYears TextField 하단 에러가 정확히 `"거주기간은 1년 이상이어야 해요"`, 라우트 유지(`/input`).
  - `monthlyRent=-1` 입력 시 해당 필드 하단 에러가 정확히 `"음수는 입력할 수 없어요"`.
  - free 유저(effective entitlement 기준)에서 `residenceYears=15` 제출 시:
    - `Dialog` 제목이 정확히 `"프리미엄이 필요해요"`
    - 본문에 `"무료 버전은 최대 10년까지 계산할 수 있어요"` 포함
  - 하단 `housePriceGrowthRate` TextField 포커스 시 해당 DOM에 `scrollIntoView({ block:"center" })`가 **1회 호출**된다.
  - `?s=` 디코딩 중에는 `Typography`로 정확히 `"불러오는 중..."` 표시.
  - `?s=` 디코딩 실패 시 `Dialog` 본문에 정확히 `"입력값을 불러올 수 없어요"` 표시, 확인 탭 후에도 `/input`에 남고 기본 폼 상태 유지.
  - 유효 입력 제출 시 `/result`로 이동하며 navigation state에 입력 스냅샷을 전달한다.
  - 앱 컴파일 성공.
- Covers:
  - AC-S2-1, AC-S2-2, AC-S2-3, AC-S2-4, AC-S2-5, AC-S2-6
  - AC-F2-1, AC-F2-2, AC-F2-3, AC-F2-4, AC-F2-5, AC-F2-6, AC-F2-7, AC-F2-8
  - AC-F6-2 (프리미엄 시 20년 허용: maxResidenceYears=20이면 제한 없이 제출 가능)
- Files:
  - `src/pages/InputPage.tsx`
- Depends on: Task 2.3, Task 2.5

### Task 3.3 결과 페이지(`/result`) 1차 구현 (hydrate + 계산 + 요약/차트/조건수정)
- Description:
  - `/result`에서 navigation state 또는 `?s=`로 입력을 복원해 계산/요약/차트/조건수정 BottomSheet까지 구현한다.
  - **상세 비용 분석/광고/결제/공유/히스토리 저장은 Epic 4에서 추가**(이 태스크는 골격 + 계산 흐름 안정성 확보).
- DoD:
  - 입력 hydrate 또는 계산이 완료되지 않았을 때 `Typography`로 정확히 `"계산 중..."` 표시되고 공유 버튼(임시 버튼) `disabled=true`.
  - 계산 완료 후 전세/월세/매매 요약 `ListRow`가 정확히 3개 표시되며 각 row에 `"N년 후 순자산"` 텍스트 포함.
  - `recommendedOption==="jeonse"`이면 전세 영역에 `Chip` 텍스트가 정확히 `"추천"`으로 표시된다.
  - 차트에 5년 지점 탭 가능한 UI(터치 타깃 44px 이상) 제공:
    - 탭 시 `BottomSheet`가 열리고 제목에 정확히 `"5년차 순자산"` 포함
    - 본문에 전세/월세/매매 값이 각각 숫자로 1개 이상 표시
  - “조건 수정” 탭 → BottomSheet에서 `investmentReturnRate` 변경 후 “적용” 탭 시:
    - 인사이트 `Typography`가 변경되고
    - 요약 순자산 숫자(3개 중 최소 1개)가 변경된다.
  - 진입 시 입력이 navigation state에도 없고 `?s=`도 없으면 `Dialog` 본문에 정확히 `"결과를 불러올 수 없어요"` 표시, 확인 탭 시 `/` 이동.
  - `simulate()` 실패(예: NaN) 시 throw 없이 `Dialog`로 정확히 `"입력값을 확인해주세요"` 표시.
  - 앱 컴파일 성공.
- Covers:
  - AC-S3-1, AC-S3-2, AC-S3-3, AC-S3-5
  - AC-F3-3, AC-F3-4, AC-F3-7, AC-F3-8, AC-F3-9, AC-F3-12, AC-F3-13
  - AC-F5-2, AC-F5-3
- Files:
  - `src/pages/ResultPage.tsx`
- Depends on: Task 2.3, Task 2.4, Task 2.5

### Task 3.4 히스토리 페이지(`/history`) 구현 (최근 5개 + 재실행 + 전체삭제 + 에러 복구)
- Description:
  - SPEC S4 UI/상태/실패 처리를 포함한 `HistoryPage` 구현.
- DoD:
  - 로딩 중 `Typography`로 정확히 `"불러오는 중..."` 표시.
  - 히스토리 1개 이상이면 최신순으로 최대 5개 `ListRow` 표시.
  - 첫 번째 `ListRow` 탭 시 `/result`로 이동하고 해당 항목 `input`과 동일 값으로 계산되게 navigation state로 전달.
  - “전체 삭제” 탭 → 확인 Dialog 확인 탭 시 `rc_history_v1`가 정확히 `"[]"`로 저장되고, Empty 문구가 표시된다.
  - Empty 상태에서:
    - `Typography`로 정확히 `"아직 저장된 기록이 없어요"` 표시
    - “시뮬레이션 하러 가기” 버튼 표시
  - `rc_history_v1`가 파싱 불가능이면:
    - `Dialog` 본문에 정확히 `"기록을 불러오지 못했어요"` 표시
    - 확인 탭 시 `rc_history_v1`를 `"[]"`로 초기화 후 Empty 상태로 전환
  - 개별 항목 삭제 UI에서 대상 id가 없을 때 `Toast`로 정확히 `"기록을 찾을 수 없어요"` 표시(= `deleteHistoryById`가 NOT_FOUND인 경우에만).
  - 앱 컴파일 성공.
- Covers:
  - AC-S4-1, AC-S4-2, AC-S4-3, AC-S4-4, AC-S4-5, AC-S4-6
  - AC-F4-3, AC-F4-4, AC-F4-5
- Files:
  - `src/pages/HistoryPage.tsx`
- Depends on: Task 2.2

**Risk Analysis (Epic 3)**
- Complexity: High
- Risk factors:
  - 모바일 폼(키보드 가림) 처리 누락
  - 결과 페이지 상태 분기(입력 없음/디코딩 실패/계산 실패)에서 크래시
  - TDS 여백 규칙 위반 시 검수 반려
- Mitigation:
  - 페이지를 1 task = 1 page로 분리
  - Result는 “골격(3.3) → 기능 추가(4.x)”로 분해
  - 여백은 `Spacing`/TDS 기본 패딩만 사용하도록 DoD에서 강제

---

## Epic 4. Integration + polish (routing wiring, history save, ads, share, payment)

### Task 4.1 라우팅/앱 셸 연결 (React Router + Provider)
- Description:
  - 라우트를 `/`, `/input`, `/result`, `/history`로 연결하고 전역 `AppProvider`로 감싼다.
- DoD:
  - `react-router-dom`으로 4개 route가 실제 렌더링된다.
  - `AppProvider`가 라우터 상단에서 1회 마운트된다.
  - 앱 컴파일 및 페이지 간 네비게이션 가능.
- Covers:
  - AC-S1-2, AC-S1-3, AC-S3-5, AC-S4-3 (라우트 이동 전제 충족)
- Files:
  - `src/App.tsx` (또는 템플릿의 루트 컴포넌트 경로)
  - `src/routes.tsx` (템플릿 구조에 맞게 라우터 파일이 이미 있으면 그 파일)
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 2.5

### Task 4.2 `/result` 진입 시 히스토리 스냅샷 저장 + Quota 토스트
- Description:
  - `/result` 진입(계산 시작) 시 `SimulationInput`을 **깊은 복사 스냅샷**으로 `HistoryEntry` 저장.
  - 저장 실패 중 `QUOTA_EXCEEDED`는 토스트로 처리.
- DoD:
  - `/input`에서 유효 입력으로 `/result` 이동 시 `rc_history_v1` 길이가 1 증가(최대 5 유지).
  - 첫 저장이고 `presetId:null`이면 저장된 첫 항목 `label`에 정확히 `"직접 입력"` 문자열이 포함된다.
  - 이미 5개가 있을 때 추가 저장 후에도 길이는 정확히 5이고 가장 오래된 1개가 제거된다.
  - 저장 중 `QUOTA_EXCEEDED` 발생 시 `Toast`로 정확히 `"저장 공간이 부족해 기록을 저장하지 못했어요"` 표시, 앱 크래시 없음.
  - 앱 컴파일 성공.
- Covers:
  - AC-F4-1, AC-F4-2, AC-F4-6
- Files:
  - `src/pages/ResultPage.tsx`
- Depends on: Task 3.3, Task 2.2, Task 2.1

### Task 4.3 상세 비용 분석표 게이팅(TossRewardAd) + 배너 AdSlot 위치 고정
- Description:
  - 결과 페이지의 “상세 비용 분석표” 섹션만 보상형 광고로 게이팅.
  - 프리미엄은 즉시 열람, 무료는 광고 완료 시에만 언락.
  - 배너 광고는 **상세 비용 섹션 아래**에만 렌더링.
- DoD:
  - 무료(effective premium=false)에서:
    - “광고 보고 상세 보기” 버튼이 렌더링된다.
    - 버튼 탭 → `TossRewardAd` 실행 → 광고 완료(ok:true) 후 상세 비용 `ListRow`가 **최소 3개 이상** 표시된다.
  - 광고가 `AD_LOAD_FAILED` 또는 `AD_SHOW_FAILED`로 종료되면:
    - `Toast`로 정확히 `"광고를 불러오지 못했어요"` 표시
    - 상세 비용 `ListRow`는 **0개** 표시(언락 금지)
  - 프리미엄(effective premium=true)에서는:
    - “광고 보고 상세 보기” 버튼이 렌더링되지 않는다.
    - 상세 비용 `ListRow`가 **최소 3개 이상** 즉시 표시된다.
  - `AdSlot`은 상세 비용 섹션 “아래”에만 렌더링되며, overlay가 아닌 일반 플로우로 배치된다.
  - `ownerUserId !== currentUserId`이면 저장된 isPremium=true여도 effective premium=false로 간주되어 광고 버튼이 렌더링된다.
  - 앱 컴파일 성공.
- Covers:
  - AC-S3-4, AC-S3-6
  - AC-F3-10, AC-F3-11, AC-F3-14, AC-F3-15
  - AC-F6-5
- Files:
  - `src/pages/ResultPage.tsx`
- Depends on: Task 4.2

### Task 4.4 공유 플로우 (URL 복사 + clipboard fallback + 외부 이동 금지)
- Description:
  - 결과 화면에서 공유 액션 제공: BottomSheet로 “URL 복사” 노출.
  - Clipboard 미지원 시 Dialog로 URL을 보여주고 “닫기”로 종료.
  - 외부 도메인 이탈 금지 준수(직접 `window.open`/`window.location.href` 사용 금지).
- DoD:
  - “공유하기” → “URL 복사” 선택 시:
    - 클립보드에 `"/result?s="`를 포함한 문자열이 복사된다.
    - `Toast`로 정확히 `"링크를 복사했어요"` 표시.
  - `navigator.clipboard`가 없으면:
    - `Dialog` 본문에 생성된 URL 문자열이 표시된다.
    - `Dialog` 확인 버튼 텍스트는 정확히 `"닫기"`이다.
  - 공유 로직 어디에도 `window.open` 호출이 없다.
  - 공유 로직 어디에도 `window.location.href = "<외부도메인...>"` 할당이 없다.
  - 앱 컴파일 성공.
- Covers:
  - AC-F5-1, AC-F5-5, AC-F5-6
  - AC-S3-1, AC-F3-4 (계산중 공유 disabled 유지)
- Files:
  - `src/pages/ResultPage.tsx`
- Depends on: Task 4.3

### Task 4.5 프리미엄 결제 연동 + entitlement 저장/적용 + 실패/취소 처리
- Description:
  - 결과 화면의 “프리미엄 구매” 버튼을 `useTossPayment`에 연결하고 성공 시 entitlement를 localStorage에 저장/상태 반영.
  - 취소/실패 시 UX 규칙(Toast/Dialog)과 권한 미부여 보장.
- DoD:
  - 구매 성공 시 localStorage `rc_entitlement_v1`에 아래 형태로 저장된다:
    - `{ isPremium:true, premiumSince:<number>, ownerUserId:<string>, maxResidenceYears:20, createdAt:<number>, updatedAt:<number>, id:<uuid> }`
  - 성공 시 `Toast`로 정확히 `"프리미엄이 활성화됐어요"` 표시.
  - cancel 결과 시:
    - `Toast`로 정확히 `"결제가 취소됐어요"`
    - localStorage의 `rc_entitlement_v1.isPremium`은 `false`로 유지
  - fail 결과 시:
    - `Dialog` 제목이 정확히 `"결제에 실패했어요"`
    - localStorage의 `rc_entitlement_v1.isPremium`은 `false`로 유지
  - 프리미엄 활성화 후 `/input`에서 `residenceYears=20` 제출이 가능해진다(= maxResidenceYears=20이 반영되어 상한 다이얼로그가 뜨지 않음).
  - 앱 컴파일 성공.
- Covers:
  - AC-F6-1, AC-F6-2, AC-F6-3, AC-F6-4
  - AC-F2-4 (free 상한 다이얼로그는 premium 전환 전/후로 동작 일관)
- Files:
  - `src/pages/ResultPage.tsx`
- Depends on: Task 4.4

**Risk Analysis (Epic 4)**
- Complexity: Medium
- Risk factors:
  - ResultPage에 기능이 몰려 수정 충돌/리그레션 발생 가능
  - entitlement “owner mismatch”를 저장값 변경으로 처리하면 데이터 손상
  - 클립보드 미지원 환경에서 공유 UX 실패
- Mitigation:
  - ResultPage 변경을 4.2→4.3→4.4→4.5로 **단일 선형 의존**으로 쪼개 충돌 방지
  - effective entitlement는 selector로만 처리(저장 불변)
  - 클립보드 fallback을 Dialog로 고정

---

## AC Coverage
- Total ACs in SPEC: 70
- Covered by tasks: 70
  - S1(6): Task 3.1
  - S2(6): Task 3.2
  - S3(6): Task 3.3, 4.3
  - S4(6): Task 3.4, 2.2
  - F1(6): Task 2.1, 3.1
  - F2(8): Task 3.2
  - F3(15): Task 2.4(1,2,5,6), Task 3.3(3,4,7,8,9,12,13), Task 4.3(10,11,14,15)
  - F4(6): Task 4.2(1,2,6), Task 2.2(2,6), Task 3.4(3,4,5)
  - F5(6): Task 2.3(2,4), Task 3.3(2,3), Task 4.4(1,5,6)
  - F6(5): Task 2.5(5), Task 4.5(1~4)
- Uncovered: 0