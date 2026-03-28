# SPEC

## Common Principles

- **Tech/Framework**
  - Vite + React + TypeScript
  - UI: `@toss/tds-mobile` 컴포넌트만 사용(여백은 `Spacing` 또는 `ListRow` 패딩만 사용)
  - Routing: `react-router-dom`
  - Persistence: `localStorage` (총 5MB 이하)

- **Global UX / Interaction**
  - 모든 인터랙티브 요소(버튼/탭/리스트 행/차트 포인트)는 **터치 타겟 ≥ 44px**
  - 모든 폼은 모바일 키보드 대응:
    - 숫자 필드: `inputMode="numeric"` 또는 `"decimal"`
    - 제출 시 `blur()`로 키보드 닫힘
    - 오류 발생 시 해당 입력 영역이 화면에 보이도록 스크롤(브라우저 기본 스크롤 사용, 과도한 커스텀 레이아웃 금지)

- **Ads**
  - 배너 광고: 결과 화면에서 **비용 분석표 섹션 이후** 콘텐츠 흐름을 끊지 않는 위치에 `AdSlot` 1개 배치(콘텐츠 오버레이 금지)
  - 보상형 광고: 결과 화면의 **상세 결과(차트/표)** 영역을 `TossRewardAd`로 게이팅

- **Error Handling**
  - 사용자 입력 오류는 **필드 하단 에러 메시지(고정 문구)**로 표시
  - 저장 실패(localStorage quota 등)는 `Toast`로 고정 문구 표시

- **Toss 검수/정책 준수(전역)**
  - 외부 도메인 이탈 금지: `window.location.href`, `window.open`로 외부 URL 이동 로직을 두지 않음(공유는 OS Share Sheet / 클립보드로만)
  - Android 7+, iOS 16+ 호환 API만 사용(예: `navigator.share`는 지원 여부 체크 후 fallback 제공)
  - 프로덕션 빌드에서 `console.error` 호출 금지(디버그 로그는 제거)

---

## Service / Function Contracts (클라이언트 내 “API” 계약)

> 네트워크 API는 없으므로, **검증 가능한 pass/fail**을 위해 모든 데이터/계산 작업을 함수 계약으로 명시한다.  
> 모든 함수는 **throw 금지**(예외는 내부에서 `Result`로 변환)이며, 실패는 `ok:false`로 반환한다.

### 공통 타입

```ts
export type EpochMs = number;

export type AppErrorCode =
  // 400 equivalents
  | 'INVALID_INPUT'
  | 'DECODE_ERROR'
  | 'ENCODE_ERROR'
  | 'UNSUPPORTED_VERSION'
  | 'PAGE_OUT_OF_RANGE'

  // 401 equivalent (MVP에서는 사용 가능성만 열어둠)
  | 'UNAUTHENTICATED'

  // 404 equivalent
  | 'NOT_FOUND'

  // storage / runtime
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA'
  | 'STORAGE_PARSE'
  | 'STORAGE_SCHEMA'
  | 'CALC_ERROR';

export type Result<T, E extends { code: AppErrorCode }> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface Paginated<T> {
  items: T[];
  total: number; // items.length가 아니라 전체 개수
  page: number;  // 1-based
}
```

---

### Preset Service

```ts
export interface PresetService {
  // 항상 page=1, total=4, items.length=4
  listPresets(): Paginated<PresetScenario>;
  getPresetById(id: string): Result<PresetScenario, { code: 'NOT_FOUND' }>;
}
```

- Failure modes
  - 존재하지 않는 id면 `{ ok:false, error:{code:'NOT_FOUND'} }`

---

### Input Validation / Normalization

```ts
// FieldErrors는 "사용자 입력 필드"에 대해서만 반환한다(메타 필드 제외).
export type SimulationInputUserField = Exclude<
  keyof SimulationInput,
  'id' | 'createdAt' | 'updatedAt'
>;

export type FieldErrors = Partial<Record<SimulationInputUserField, string>>;

export interface SimulationValidationService {
  validate(input: unknown): Result<
    SimulationInput,
    { code: 'INVALID_INPUT'; fieldErrors: FieldErrors }
  >;
}
```

- Validation rules (pass/fail)
  - `SimulationInput`의 모든 숫자 필드(아래 **Validation Rules Table**의 number 필드)는 `Number.isFinite(value) === true` 이어야 한다.
  - KRW 필드(명세 내 `...KRW`)는 **정수**여야 한다. (`Number.isInteger(value)`)
  - 범위는 Data Model의 주석 범위를 그대로 적용한다.
  - `buyEquityKRW <= buyPriceKRW`가 아니면 실패.
- Normalization rules (명시)
  - `validate` 입력의 각 number 필드는 다음 규칙으로 정규화 후 검증한다.
    - `typeof v === 'number'`이면 그대로 사용
    - `typeof v === 'string'`이고 `v.trim() !== ''`이면 `Number(v)`로 변환 후 사용
    - 그 외 타입(예: `null`, `undefined`, `boolean`, `object`)은 즉시 검증 실패로 처리
  - `id/createdAt/updatedAt` 메타 필드 정규화:
    - `id`가 없거나 빈 문자열이면 새 `id`를 생성한다(예: `crypto.randomUUID()`; 미지원 시 대체 UUID 함수)
    - `createdAt`이 없거나 유효한 epoch ms가 아니면 `Date.now()`를 사용한다
    - `updatedAt`이 없거나 유효한 epoch ms가 아니면 `createdAt`과 동일 값으로 설정한다
- Failure modes
  - 타입 불일치/NaN/Infinity/범위 위반/정수 아님 → `{code:'INVALID_INPUT', fieldErrors:{...}}`

#### Validation Rules Table (필드별 required/범위/에러키/고정 메시지)

> 아래 메시지는 **필드 하단 고정 문구**로 사용한다(문구 변경 금지).

- `presetId: string | null` (optional)
  - 문자열이면 공백만으로 구성될 수 없음(공백 문자열은 `null`로 정규화)
  - 오류 메시지 없음(사용자 입력 필드가 아니므로 fieldErrors에 포함하지 않음)

- 전세
  - `jeonseDepositKRW: number` (required, integer, **0..2_000_000_000**)
    - 범위 위반/정수 아님 → `fieldErrors.jeonseDepositKRW = "전세보증금은 0원~20억원만 가능해요"`
    - 값 없음/파싱 불가 → `fieldErrors.jeonseDepositKRW = "전세보증금을 입력해주세요"`
  - `jeonseLoanRatio: number` (required, **0..1**)
    - 범위 위반/파싱 불가 → `fieldErrors.jeonseLoanRatio = "전세 대출비율은 0~1 사이만 가능해요"`
    - 값 없음 → `fieldErrors.jeonseLoanRatio = "전세 대출비율을 입력해주세요"`
  - `jeonseLoanRateAPR: number` (required, **0..20**)
    - 범위 위반/파싱 불가 → `fieldErrors.jeonseLoanRateAPR = "전세 대출금리는 0%~20%만 가능해요"`
    - 값 없음 → `fieldErrors.jeonseLoanRateAPR = "전세 대출금리를 입력해주세요"`

- 월세
  - `monthlyDepositKRW: number` (required, integer, **0..2_000_000_000**)
    - 범위 위반/정수 아님 → `fieldErrors.monthlyDepositKRW = "월세 보증금은 0원~20억원만 가능해요"`
    - 값 없음/파싱 불가 → `fieldErrors.monthlyDepositKRW = "월세 보증금을 입력해주세요"`
  - `monthlyRentKRW: number` (required, integer, **0..10_000_000**)
    - 범위 위반/정수 아님 → `fieldErrors.monthlyRentKRW = "월세는 0원~1,000만원만 가능해요"`
    - 값 없음/파싱 불가 → `fieldErrors.monthlyRentKRW = "월세를 입력해주세요"`
  - `monthlyRentIncreaseRateAnnual: number` (required, **0..20**)
    - 범위 위반/파싱 불가 → `fieldErrors.monthlyRentIncreaseRateAnnual = "월세 상승률은 0%~20%만 가능해요"`
    - 값 없음 → `fieldErrors.monthlyRentIncreaseRateAnnual = "월세 상승률을 입력해주세요"`

- 매매
  - `buyPriceKRW: number` (required, integer, **0..5_000_000_000**)
    - 범위 위반/정수 아님 → `fieldErrors.buyPriceKRW = "매매가는 0원~50억원만 가능해요"`
    - 값 없음/파싱 불가 → `fieldErrors.buyPriceKRW = "매매가를 입력해주세요"`
  - `buyEquityKRW: number` (required, integer, **0..buyPriceKRW**)
    - `buyEquityKRW > buyPriceKRW` → `fieldErrors.buyEquityKRW = "자기자본은 매매가 이하여야 해요"`
    - 음수/정수 아님/파싱 불가 → `fieldErrors.buyEquityKRW = "자기자본은 0원 이상 정수로 입력해주세요"`
    - 값 없음 → `fieldErrors.buyEquityKRW = "자기자본을 입력해주세요"`
  - `buyLoanRateAPR: number` (required, **0..20**)
    - 범위 위반/파싱 불가 → `fieldErrors.buyLoanRateAPR = "매매 대출금리는 0%~20%만 가능해요"`
    - 값 없음 → `fieldErrors.buyLoanRateAPR = "매매 대출금리를 입력해주세요"`
  - `buyLoanPeriodYears: number` (required, integer, **1..40**)
    - 범위 위반/정수 아님/파싱 불가 → `fieldErrors.buyLoanPeriodYears = "대출기간은 1~40년만 가능해요"`
    - 값 없음 → `fieldErrors.buyLoanPeriodYears = "대출기간을 입력해주세요"`
  - `buyRepaymentType: '원리금균등' | '원금균등' | '만기일시'` (required)
    - 허용 값 외 → `fieldErrors.buyRepaymentType = "상환방식을 선택해주세요"`

- 공통
  - `initialAssetKRW: number` (required, integer, **0..5_000_000_000**)
    - 범위 위반/정수 아님 → `fieldErrors.initialAssetKRW = "초기자산은 0원~50억원만 가능해요"`
    - 값 없음/파싱 불가 → `fieldErrors.initialAssetKRW = "초기자산을 입력해주세요"`
  - `stayPeriodYears: number` (required, integer, **1..30**)
    - 범위 위반/정수 아님/파싱 불가 → `fieldErrors.stayPeriodYears = "거주기간은 1~30년만 가능해요"`
    - 값 없음 → `fieldErrors.stayPeriodYears = "거주기간을 입력해주세요"`
  - `investmentReturnRateAnnual: number` (required, **0..20**)
    - 범위 위반/파싱 불가 → `fieldErrors.investmentReturnRateAnnual = "투자수익률은 0%~20%만 가능해요"`
    - 값 없음 → `fieldErrors.investmentReturnRateAnnual = "투자수익률을 입력해주세요"`
  - `housePriceGrowthRateAnnual: number` (required, **-10..20**)
    - 범위 위반/파싱 불가 → `fieldErrors.housePriceGrowthRateAnnual = "집값상승률은 -10%~20%만 가능해요"`
    - 값 없음 → `fieldErrors.housePriceGrowthRateAnnual = "집값상승률을 입력해주세요"`

---

### Simulation Engine

```ts
export interface SimulationService {
  calculate(
    input: SimulationInput
  ): Result<SimulationResult, { code: 'INVALID_INPUT' | 'CALC_ERROR' }>;

  createInsight(
    input: SimulationInput
  ): Result<string, { code: 'INVALID_INPUT' | 'CALC_ERROR' }>;
}
```

- Failure modes
  - 사전 검증 실패(예: `stayPeriodYears=0`, `jeonseLoanRatio=1.5`) → `{code:'INVALID_INPUT'}`
  - 계산 과정에서 0으로 나눔 등으로 NaN/Infinity가 발생할 위험이 감지되면 `{code:'CALC_ERROR'}` 반환
- Pass conditions
  - 성공 시 `SimulationResult.results`는 항상 3개이며 순서 고정(전세/월세/매매)

---

### Share Encode/Decode

```ts
export interface ShareService {
  // 생성된 URL은 "현재 pathname(/result)" + "?v=1&s=..." 형태를 포함한다.
  buildShareUrl(
    input: SimulationInput
  ): Result<{ url: string; payload: SharePayload }, { code: 'ENCODE_ERROR' }>;

  // search = location.search를 그대로 받는다.
  parseShareSearch(
    search: string
  ): Result<
    { input: SimulationInput },
    { code: 'DECODE_ERROR' | 'UNSUPPORTED_VERSION' | 'INVALID_INPUT' }
  >;
}
```

- Failure modes
  - `v !== 1` → `{code:'UNSUPPORTED_VERSION'}`
  - base64 디코드/JSON.parse 실패 → `{code:'DECODE_ERROR'}`
  - 디코딩은 되었으나 input 검증 실패 → `{code:'INVALID_INPUT'}`
- Pass/fail 조건(외부 도메인 이탈 금지)
  - `buildShareUrl`/공유 UX는 `window.open`, `window.location.href`를 호출하지 않는다(검수 포인트)

---

### History Storage (localStorage)

```ts
export interface HistoryStorage {
  list(params: {
    page: number;
    pageSize: number;
  }): Result<
    Paginated<HistoryEntry>,
    {
      code:
        | 'INVALID_INPUT'
        | 'PAGE_OUT_OF_RANGE'
        | 'STORAGE_UNAVAILABLE'
        | 'STORAGE_PARSE'
        | 'STORAGE_SCHEMA';
    }
  >;

  // 결과 생성 시 호출: 새 엔트리를 "앞"에 추가하고 최대 5개로 자른다.
  // 성공 시 저장은 완료되어야 하며, 반환값은 void로 한다(쓰기 API가 pagination을 반환하지 않음).
  prepend(
    entry: HistoryEntry
  ): Result<
    void,
    {
      code:
        | 'STORAGE_UNAVAILABLE'
        | 'STORAGE_QUOTA'
        | 'STORAGE_PARSE'
        | 'STORAGE_SCHEMA';
    }
  >;
}
```

- 정렬/페이지 계약(일관된 list shape)
  - 정렬: `createdAt DESC` (최신이 앞)
  - 페이지: MVP는 최대 5개만 저장하므로 `page=1`만 허용
    - `page !== 1`이면 `{code:'PAGE_OUT_OF_RANGE'}` 반환
  - `pageSize`는 `1..5`만 허용. 범위 밖이면 `{code:'INVALID_INPUT'}`
- Failure modes
  - localStorage 접근 불가(보안/프라이빗 모드 등) → `{code:'STORAGE_UNAVAILABLE'}`
  - JSON.parse 실패 → `{code:'STORAGE_PARSE'}`
  - 스키마 불일치(배열이 아니거나 필드 누락/타입 불일치 등) → `{code:'STORAGE_SCHEMA'}`
  - setItem이 QuotaExceededError throw → `{code:'STORAGE_QUOTA'}`
- 마이그레이션/정규화(버전 불일치 대응)
  - `HistoryEntry.updatedAt` 누락(구버전 데이터) 시:
    - 로드 시 `updatedAt = createdAt`으로 보정 후 정상 처리(스키마 호환)
  - 그 외 필수 필드 누락 시 `{code:'STORAGE_SCHEMA'}`

---

### Last Input Snapshot (preset 진입/새로고침 대비)

```ts
export interface LastInputSnapshot {
  version: 1;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  input: SimulationInput;
}

export interface LastInputStorage {
  load(): Result<
    LastInputSnapshot | null,
    { code: 'STORAGE_UNAVAILABLE' | 'STORAGE_PARSE' | 'STORAGE_SCHEMA' }
  >;

  save(
    input: SimulationInput,
    now: EpochMs
  ): Result<
    LastInputSnapshot,
    { code: 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA' }
  >;

  clear(): Result<void, { code: 'STORAGE_UNAVAILABLE' }>;
}
```

- `/result` 입력 복원 우선순위(명시)
  1) `location.state.input`  
  2) Query `?v=1&s=...` 디코드 성공값  
  3) `LastInputStorage.load()` 성공값  
  4) 모두 없으면 Empty UI 표시

---

### ✅ Service-Level Formal ACs (EARS)

> 각 서비스 함수는 최소 4개 AC(그 중 최소 2개 failure AC)를 가진다. 시간 조건이 필요한 경우에만 ms를 명시한다.

#### PresetService ACs (EARS)

- **AC-PS-1 [U]**
  - WHEN `listPresets()`가 호출되면 THEN 반환값은 `{ page: 1, total: 4, items: [...] }` 형태여야 하고 AND `items.length === 4`여야 한다.
- **AC-PS-2 [U]**
  - WHEN `listPresets()`가 호출되면 THEN `items` 내 `PresetScenario.id`는 4개 모두 서로 달라야 한다.
- **AC-PS-3 [E]**
  - WHEN `getPresetById(id)`가 `listPresets().items`에 존재하는 `id`로 호출되면 THEN `{ ok:true, value }`를 반환해야 하고 AND `value.id === id`여야 한다.
- **AC-PS-4 [W]**
  - WHEN `getPresetById(id)`가 존재하지 않는 `id`로 호출되면 THEN `{ ok:false, error:{ code:'NOT_FOUND' } }`를 반환해야 하고 AND 예외를 throw하지 않아야 한다.

#### SimulationValidationService ACs (EARS)

- **AC-VS-1 [E]**
  - WHEN `validate(input)`가 성공하면 THEN `{ ok:true, value }`를 반환해야 하고 AND `value`는 `SimulationInput` 스키마(필수 필드 포함)를 만족해야 한다.
- **AC-VS-2 [E]**
  - WHEN `validate(input)`가 성공하면 THEN `value.id`는 빈 문자열이 아니어야 한다 AND `value.createdAt`/`value.updatedAt`은 `Number.isFinite`를 만족해야 한다.
- **AC-VS-3 [W]**
  - WHEN `stayPeriodYears = 0`인 입력이 전달되면 THEN `{ ok:false, error:{ code:'INVALID_INPUT', fieldErrors:{ stayPeriodYears: "거주기간은 1~30년만 가능해요" }}}`를 반환해야 한다 AND 예외를 throw하지 않아야 한다.
- **AC-VS-4 [W]**
  - WHEN `buyEquityKRW > buyPriceKRW`인 입력이 전달되면 THEN `{ ok:false, error:{ code:'INVALID_INPUT', fieldErrors:{ buyEquityKRW: "자기자본은 매매가 이하여야 해요" }}}`를 반환해야 한다.

#### SimulationService ACs (EARS)

- **AC-SS-1 [E]**
  - WHEN `calculate(input)`가 성공하면 THEN `{ ok:true, value }`를 반환해야 하고 AND `value.results.length === 3`이어야 하며 AND 순서는 `JEONSE`, `MONTHLY`, `BUY`여야 한다.
- **AC-SS-2 [E]**
  - WHEN `calculate(input)`가 성공하고 `stayPeriodYears = N`이면 THEN 모든 `OptionResult.netWorthByYearKRW.length === N + 1`이어야 한다.
- **AC-SS-3 [W]**
  - WHEN `calculate(input)`가 입력 검증 규칙을 위반한 `input`을 받으면 THEN `{ ok:false, error:{ code:'INVALID_INPUT' } }`를 반환해야 하고 AND 예외를 throw하지 않아야 한다.
- **AC-SS-4 [W]**
  - WHEN `calculate(input)` 계산 중 NaN 또는 Infinity 발생 위험이 감지되면 THEN `{ ok:false, error:{ code:'CALC_ERROR' } }`를 반환해야 하고 AND 예외를 throw하지 않아야 한다.

#### ShareService ACs (EARS)

- **AC-SH-1 [E]**
  - WHEN `buildShareUrl(input)`가 성공하면 THEN `value.url`은 `?v=1&s=`를 포함해야 하고 AND `value.payload.version === 1`이어야 한다.
- **AC-SH-2 [E]**
  - WHEN `parseShareSearch(search)`가 성공하면 THEN `{ ok:true, value:{ input } }`를 반환해야 하고 AND 반환된 `input`은 `SimulationValidationService.validate`를 통과한 값과 동일한 스키마여야 한다.
- **AC-SH-3 [W]**
  - WHEN `parseShareSearch`가 `v !== 1`을 포함한 `search`를 받으면 THEN `{ ok:false, error:{ code:'UNSUPPORTED_VERSION' } }`를 반환해야 한다 AND 예외를 throw하지 않아야 한다.
- **AC-SH-4 [W]**
  - WHEN `parseShareSearch`가 base64 디코드 또는 JSON 파싱에 실패하면 THEN `{ ok:false, error:{ code:'DECODE_ERROR' } }`를 반환해야 한다 AND 예외를 throw하지 않아야 한다.

#### HistoryStorage ACs (EARS)

- **AC-HS-1 [E]**
  - WHEN `prepend(entry)`가 성공하면 THEN localStorage `rentcheck_history_v1`는 JSON 배열이어야 하고 AND 첫 번째 항목의 `id === entry.id`여야 한다 AND 전체 길이는 5 이하여야 한다.
- **AC-HS-2 [E]**
  - WHEN `list({ page:1, pageSize:k })`가 성공하면 THEN 반환된 `items.length <= k`여야 하고 AND `items`는 `createdAt DESC` 정렬이어야 한다.
- **AC-HS-3 [W]**
  - WHEN `list({ page:2, pageSize:5 })`가 호출되면 THEN `{ ok:false, error:{ code:'PAGE_OUT_OF_RANGE' } }`를 반환해야 한다 AND 예외를 throw하지 않아야 한다.
- **AC-HS-4 [W]**
  - WHEN localStorage의 `rentcheck_history_v1`가 파싱 불가능한 값이면 THEN `list(...)`는 `{ ok:false, error:{ code:'STORAGE_PARSE' } }`를 반환해야 한다 AND 예외를 throw하지 않아야 한다.

#### LastInputStorage ACs (EARS)

- **AC-LI-1 [E]**
  - WHEN `save(input, now)`가 성공하면 THEN localStorage `rentcheck_last_input_v1`는 `LastInputSnapshot` 스키마여야 하고 AND `snapshot.input.id === input.id`여야 한다.
- **AC-LI-2 [E]**
  - WHEN `load()`가 저장된 값이 없을 때 호출되면 THEN `{ ok:true, value:null }`을 반환해야 한다.
- **AC-LI-3 [W]**
  - WHEN `load()`가 파싱 불가능한 값을 만나면 THEN `{ ok:false, error:{ code:'STORAGE_PARSE' } }`를 반환해야 한다 AND 예외를 throw하지 않아야 한다.
- **AC-LI-4 [W]**
  - WHEN localStorage 접근이 불가능한 환경이면 THEN `load/save/clear`는 `{ ok:false, error:{ code:'STORAGE_UNAVAILABLE' } }` 또는 `{ ok:false, error:{ code:'STORAGE_QUOTA' } }`를 반환해야 한다 AND 예외를 throw하지 않아야 한다.

---

## Screen Definitions

> 네비게이션 state는 **Outgoing/Incoming 타입을 완전히 일치**시킨다.

#### S1. 홈(프리셋/진입) — `/`
- **TDS Components**
  - `AppBar`, `Typography`, `ListRow`, `Button`, `Spacing`, `Toast`(오류 시)
- **Content**
  - 프리셋 4개 ListRow(카드형 행)
  - “직접 입력하기” 버튼
  - “최근 기록” 프리뷰(최대 5개, 없으면 Empty)
- **Loading/Empty/Error**
  - Loading: 히스토리 로딩 중(최대 200ms) “불러오는 중…” `Typography` 표시 + 주요 버튼 disabled
  - Empty: 히스토리 0개면 “최근 시뮬레이션이 없어요” `Typography`
  - Error: localStorage 파싱 실패 시 “기록을 불러오지 못했어요” `Toast`
- **Touch**
  - 프리셋 행/히스토리 행/버튼 모두 높이 44px 이상(`ListRow` 기본 높이 사용)
- **Navigation state contract**
  - Outgoing
    - 프리셋 탭 → `navigate('/input', { state: { presetId: string } })`
    - 직접 입력하기 → `navigate('/input', { state: { presetId: null } })`
    - 히스토리 항목 탭 → `navigate('/result', { state: { input: SimulationInput, historyId: string } })`
  - Incoming
    - `location.state` 사용 없음(항상 자체 진입)

##### S1 Formal ACs (EARS)
- WHEN 사용자가 홈에서 프리셋 ListRow를 탭하면 THEN `navigate('/input', { state:{ presetId } })`가 1회 호출되어야 한다 AND `presetId`는 탭한 프리셋의 `id`와 동일해야 한다.
- WHEN 사용자가 “직접 입력하기”를 탭하면 THEN `navigate('/input', { state:{ presetId:null } })`가 1회 호출되어야 한다.
- WHEN 히스토리 로딩이 200ms를 초과하지 않는 동안 진행 중이면 THEN “불러오는 중…” `Typography`가 표시되어야 한다 AND 프리셋/직접입력 버튼은 `disabled=true`여야 한다.
- WHEN localStorage의 히스토리 파싱이 실패하면 THEN `Toast`로 `"기록을 불러오지 못했어요"`가 표시되어야 한다 AND 히스토리 프리뷰는 0개로 렌더링되어야 한다. *(failure AC)*

---

#### S2. 입력(3탭 폼 + 공통) — `/input`
- **TDS Components**
  - `AppBar`, `TabBar`, `TextField`, `Typography`, `Button`, `Spacing`, `Dialog`(오류 안내), `Toast`
- **Content**
  - TabBar: 전세 / 월세 / 매매
  - 각 탭별 입력 필드(TextField)
  - 공통 설정 입력(초기자산/거주기간/투자수익률/집값상승률)
  - “결과 보기” 버튼
- **Loading/Empty/Error**
  - Loading: “결과 보기” 탭 후 300ms 동안 버튼 `disabled` + 버튼 라벨 “계산 중…”
  - Empty: 필수값 미입력 시 버튼은 enable 가능하되 제출 시 필드 오류 노출(Empty 화면은 없음)
  - Error: 라우트 state에 `presetId`가 있어도 프리셋을 찾을 수 없으면 `Dialog`로 “프리셋을 불러오지 못했어요”
- **Touch**
  - TabBar 탭, 버튼 모두 44px 이상(TDS 기본)
- **Navigation state contract**
  - Incoming
    - `location.state = { presetId: string | null } | null`
  - Outgoing
    - 결과 보기 → `navigate('/result', { state: { input: SimulationInput } })`
    - 뒤로가기(AppBar) → `navigate(-1)`

##### S2 Formal ACs (EARS)
- WHEN `/input`이 `{ presetId: string }` state로 진입하면 THEN `PresetService.getPresetById(presetId)`를 호출해야 한다 AND 성공 시 폼은 해당 프리셋 값으로 채워져야 한다.
- WHEN “결과 보기”를 탭하면 THEN `SimulationValidationService.validate`를 1회 호출해야 한다 AND 성공(`ok:true`)인 경우에만 `navigate('/result', { state:{ input } })`가 1회 호출되어야 한다.
- WHEN `validate`가 `{ ok:false, error:{ code:'INVALID_INPUT', fieldErrors } }`를 반환하면 THEN `fieldErrors`에 포함된 키에 해당하는 입력 필드 하단에 메시지가 그대로 표시되어야 한다 AND `/result`로 navigate가 호출되지 않아야 한다. *(failure AC)*
- WHEN `{ presetId:'preset_unknown' }`로 진입했을 때 프리셋 조회가 `{ ok:false, error:{ code:'NOT_FOUND' } }`이면 THEN `Dialog`에 `"프리셋을 불러오지 못했어요"`가 표시되어야 한다 AND 확인 버튼 탭 시 `navigate('/')`가 1회 호출되어야 한다. *(failure AC)*

---

#### S3. 결과(요약 + 추천 + 상세 게이팅) — `/result`
- **TDS Components**
  - `AppBar`, `Typography`, `ListRow`, `Chip`(추천 배지), `Button`, `Spacing`, `BottomSheet`(조건 수정), `Toast`, `Dialog`
  - Ads: `TossRewardAd`, `AdSlot`
- **Content**
  - 요약 카드 3개(전세/월세/매매): 최종 순자산, 총비용 요약
  - 추천 옵션 배지(Chip)
  - “상세 결과 보기(광고)” 버튼 → 광고 시청 후 상세 영역 표시
  - 상세 영역: 라인 차트(커스텀 SVG) + 비용 분석표(ListRow 목록)
  - 비용 분석표 이후 배너 `AdSlot` 1개
  - “조건 수정하기” 버튼 → BottomSheet
  - “공유하기” 버튼
- **Loading/Empty/Error**
  - Loading: 입력 수신 직후 계산 중(최대 300ms) “계산 중…” `Typography` + 주요 버튼 disabled
  - Empty: `location.state`도 없고 쿼리도 없고 `LastInputStorage`에도 없으면 “입력값이 없어요. 홈으로 이동해주세요.” + “홈으로” 버튼
  - Error(공유 디코드): 공유 파라미터 디코드 실패 시 `Dialog` “공유 링크를 해석할 수 없어요”
  - Error(계산 실패): `SimulationService.calculate`가 `{ ok:false }`를 반환하면 `Dialog`로 아래 고정 문구 및 액션 제공
    - 타이틀: `"계산할 수 없어요"`
    - 본문: `"입력값을 확인한 뒤 다시 시도해주세요"`
    - 버튼 2개:
      - `"다시 시도"`: 동일 입력으로 `calculate` 재시도(1회)
      - `"홈으로"`: `navigate('/')`
- **Touch**
  - 차트 포인트는 보이지 않아도 터치 히트영역을 44px로 잡는 투명 rect 적용
- **Navigation state contract**
  - Incoming
    - `location.state = { input: SimulationInput } | { input: SimulationInput; historyId: string } | null`
    - Query: `?s=<string>&v=1` (SharePayload)
  - Outgoing
    - 홈으로 버튼 → `navigate('/')`
    - 공유하기(내부 화면 이동 없음, 클립보드/Share Sheet만)
    - 조건 수정 BottomSheet 닫기(라우트 변경 없음)
- **Direct navigation / refresh fallback (명시)**
  - `/result` 마운트 시 입력 복원 우선순위는 “Service / Function Contracts”의 1)~4) 규칙을 따른다.
  - 입력이 1)~3) 중 하나로 확보되면, 즉시 `LastInputStorage.save(input, Date.now())`를 호출해 새로고침 복원을 가능하게 한다.

##### S3 Formal ACs (EARS)
- WHEN `/result`가 마운트되면 THEN 입력 복원 우선순위를 1) location.state 2) query decode 3) last input 4) empty 순으로 적용해야 한다.
- WHEN 어떤 경로로든 입력이 확보되면 THEN `LastInputStorage.save(input, Date.now())`가 1회 호출되어야 한다.
- WHEN 1)~3)에서 입력 확보에 실패하면 THEN Empty UI로 `"입력값이 없어요. 홈으로 이동해주세요."`가 표시되어야 한다 AND “홈으로” 탭 시 `navigate('/')`가 1회 호출되어야 한다. *(failure AC)*
- WHEN `SimulationService.calculate`가 `{ ok:false, error:{ code:'INVALID_INPUT'|'CALC_ERROR' } }`를 반환하면 THEN Error Dialog(계산 실패)가 표시되어야 한다 AND 요약/상세 결과 UI는 렌더링되지 않아야 한다. *(failure AC)*

---

#### S4. 히스토리(최근 5개 전체) — `/history`
- **TDS Components**
  - `AppBar`, `Typography`, `ListRow`, `Button`, `Spacing`, `Dialog`(삭제 확인), `Toast`
- **Loading/Empty/Error**
  - Loading: 200ms 이내 “불러오는 중…”
  - Empty: “저장된 기록이 없어요” + “홈으로” 버튼
  - Error: 파싱 실패 시 “기록을 불러오지 못했어요” `Toast`
- **Scroll**
  - 최대 5개이므로 가상 스크롤 미적용(일반 스크롤)
- **Navigation state contract**
  - Incoming: 없음
  - Outgoing
    - 항목 탭 → `navigate('/result', { state: { input: SimulationInput, historyId: string } })`

##### S4 Formal ACs (EARS)
- WHEN `/history`가 마운트되면 THEN `HistoryStorage.list({ page:1, pageSize:5 })`를 호출해야 한다 AND 성공 시 반환된 `items` 개수만큼 ListRow를 렌더링해야 한다.
- WHEN 히스토리 `items.length === 0`이면 THEN `"저장된 기록이 없어요"` `Typography`와 “홈으로” `Button`이 표시되어야 한다.
- WHEN `HistoryStorage.list`가 `{ ok:false, error:{ code:'STORAGE_PARSE'|'STORAGE_SCHEMA' } }`를 반환하면 THEN `Toast`로 `"기록을 불러오지 못했어요"`가 표시되어야 한다 AND 목록은 0개로 렌더링되어야 한다. *(failure AC)*
- WHEN 사용자가 항목 ListRow를 탭하면 THEN `navigate('/result', { state:{ input: entry.input, historyId: entry.id } })`가 1회 호출되어야 한다.

---

## Data Models

### ✅ Entity Relationships & Cascade (명시)

- `PresetScenario.defaultInput` → `SimulationInput` 스냅샷
  - 프리셋은 하드코딩 데이터이며 삭제/수정 기능 없음(MVP)
- `HistoryEntry.input` → `SimulationInput` 스냅샷(히스토리 생성 시점의 입력)
  - **Cascade:** `HistoryEntry`를 삭제(또는 전체 히스토리 초기화)해도 다른 엔티티(예: `LastInputSnapshot`)는 자동 삭제되지 않는다.
- `SimulationResult`는 `SimulationInput`으로부터 계산 시 생성되는 파생 데이터
  - **Cascade:** 결과 화면에서 입력이 변경되면 기존 `SimulationResult`는 UI 상태에서만 폐기되며, localStorage에 저장하지 않는다(MVP).
- `SharePayload`는 공유 URL 생성 시점의 런타임 메타데이터이며, localStorage에 저장하지 않는다(MVP).

---

### PresetScenario — fields, types, constraints
```ts
export interface PresetScenario {
  id: string; // e.g. "preset_seoul_newlywed"
  name: string; // e.g. "서울 신혼부부"
  defaultInput: SimulationInput;

  createdAt: number; // epoch ms (하드코딩 데이터는 앱 런타임 초기화 시 Date.now()로 채워도 됨)
  updatedAt: number; // epoch ms
}
```
- Constraints
  - 앱 내 하드코딩된 4개 프리셋 사용(로컬 저장 없음)

---

### SimulationInput — fields, types, constraints
```ts
export type BuyRepaymentType = '원리금균등' | '원금균등' | '만기일시';

export interface SimulationInput {
  id: string; // 입력 스냅샷 ID(공유/히스토리/복원용). validate 성공 시 항상 채워져야 함.
  createdAt: number; // epoch ms (입력 스냅샷 생성 시각)
  updatedAt: number; // epoch ms (입력 스냅샷 마지막 업데이트 시각)

  presetId: string | null;

  // 전세
  jeonseDepositKRW: number;          // 0..2_000_000_000
  jeonseLoanRatio: number;           // 0..1 (e.g. 0.7)
  jeonseLoanRateAPR: number;         // 0..20 (percent)

  // 월세
  monthlyDepositKRW: number;         // 0..2_000_000_000
  monthlyRentKRW: number;            // 0..10_000_000 (per month)
  monthlyRentIncreaseRateAnnual: number; // 0..20 (percent)

  // 매매
  buyPriceKRW: number;               // 0..5_000_000_000
  buyEquityKRW: number;              // 0..buyPriceKRW
  buyLoanRateAPR: number;            // 0..20 (percent)
  buyLoanPeriodYears: number;        // 1..40 (integer)
  buyRepaymentType: BuyRepaymentType;

  // 공통
  initialAssetKRW: number;           // 0..5_000_000_000
  stayPeriodYears: number;           // 1..30 (integer)
  investmentReturnRateAnnual: number;    // 0..20 (percent)
  housePriceGrowthRateAnnual: number;    // -10..20 (percent)
}
```
- Constraints (MVP)
  - 모든 KRW 입력은 **정수**로 취급(소수점 불가)
  - `stayPeriodYears`는 1~30 정수
  - `buyEquityKRW <= buyPriceKRW` 강제
  - 음수 금액은 불가(단, `housePriceGrowthRateAnnual`은 -10까지 허용)

---

### OptionResult — fields, types, constraints
```ts
export type OptionType = 'JEONSE' | 'MONTHLY' | 'BUY';

export interface OptionResult {
  id: string; // 결과 행 ID(계산 1회 내에서 유니크)
  option: OptionType;
  netWorthByYearKRW: number[]; // length = stayPeriodYears + 1, index 0..N
  finalNetWorthKRW: number;    // = netWorthByYearKRW[N]
  totalCostKRW: number;        // 요약용(이자/월세 등 비용 합)

  createdAt: number; // epoch ms (계산 생성 시각)
  updatedAt: number; // epoch ms
}
```

---

### SimulationResult — fields, types, constraints
```ts
export interface CostBreakdownRow {
  id: string;        // breakdown row ID
  label: string;     // e.g. "월세(총)"
  valueKRW: number;  // >= 0

  createdAt: number; // epoch ms (계산 생성 시각)
  updatedAt: number; // epoch ms
}

export interface SimulationResult {
  id: string; // 계산 결과 ID
  stayPeriodYears: number;
  results: OptionResult[]; // 항상 3개, JEONSE/MONTHLY/BUY 순서 고정
  recommendedOption: OptionType;
  deltaToSecondBestKRW: number; // >= 0
  insightCopy: string;
  costBreakdownRows: CostBreakdownRow[];

  createdAt: number; // epoch ms (계산 생성 시각)
  updatedAt: number; // epoch ms
}
```
- `insightCopy` 템플릿(고정)
  - `"집값상승률을 1%p 높이면 {OPTION_KO}가 {N}년 후 {DELTA_KRW}원 더 유리해요."`
  - `{OPTION_KO}`: 전세/월세/매매

---

### HistoryEntry — fields, types, constraints
```ts
export interface HistoryEntry {
  id: string;          // crypto.randomUUID() 사용(미지원 시 대체 함수)
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms
  label: string;       // "{프리셋명 또는 '직접 입력'} · 집값 {x}% · {N}년"
  input: SimulationInput; // 입력 스냅샷(생성 시점 값)
}
```
- Constraints
  - 최대 5개 저장(최신이 앞)

---

### SharePayload — fields, types, constraints
```ts
export interface SharePayload {
  id: string; // 공유 payload ID(런타임 메타데이터)
  encoded: string; // Base64(JSON.stringify({ version, input }))
  version: number; // 1 고정(MVP)

  createdAt: number; // epoch ms (공유 링크 생성 시각, 런타임 메타데이터)
  updatedAt: number; // epoch ms
}
```

---

### localStorage keys — data shape, size estimation
- `rentcheck_history_v1`
  - Shape: `HistoryEntry[]` (length 0..5)
  - Sort: `createdAt DESC`
  - Cap: **write time에 5개로 자름**(prepend 시)
  - Size: 입력값 20여개 숫자 + 라벨 포함 엔트리 1개당 ~0.6~1.2KB 추정 → 5개면 **최대 ~6KB**
- `rentcheck_last_input_v1`
  - Shape: `LastInputSnapshot`
  - 목적: `/result` 새로고침/직접 진입 시 입력 복원
  - Size: ~1~2KB 내외
- (기타 저장 없음, 5MB 한도 여유)

---

## Feature List

### F1. 홈 프리셋 선택 + 빠른 입력 진입
- **Description:** 사용자는 홈에서 프리셋 4종 또는 “직접 입력하기”로 진입한다. 프리셋을 탭하면 입력 화면으로 이동하며 해당 프리셋 기본값이 폼에 채워진다.
- **Data:** `PresetScenario`(하드코딩), `HistoryEntry`(프리뷰)
- **API:** 없음
- **Requirements:**
- **AC-1 [U]: Scenario: 홈에서 프리셋 4종 노출**
  - Given 앱이 `/` 라우트로 진입했을 때
  - Then 프리셋 ListRow가 정확히 4개 렌더링되어야 함
  - And 각 ListRow의 터치 영역 높이는 44px 이상이어야 함
- **AC-2 [E]: Scenario: 프리셋 탭 시 입력으로 이동**
  - Given 사용자가 `/` 화면에서 프리셋 `{ id: "preset_seoul_newlywed" }` ListRow를 탭했을 때
  - When `navigate('/input', { state: { presetId } })`가 호출될 때
  - Then 전달되는 `state.presetId`는 `"preset_seoul_newlywed"` 이어야 함
  - And `/input` 화면이 렌더링되어야 함
- **AC-3 [E]: Scenario: 직접 입력하기 탭 시 입력 화면으로 이동**
  - Given 사용자가 `/` 화면에 있을 때
  - When “직접 입력하기” `Button`을 탭했을 때
  - Then `navigate('/input', { state: { presetId: null } })`가 호출되어야 함
- **AC-4 [S]: Scenario: 히스토리 프리뷰가 0개일 때 Empty 문구 노출**
  - Given localStorage `rentcheck_history_v1` 값이 `[]`일 때
  - While 사용자가 `/` 화면에 있을 때
  - Then “최근 시뮬레이션이 없어요” `Typography`가 표시되어야 함
- **AC-5 [W]: Scenario: 히스토리 파싱 실패 처리**
  - Given localStorage `rentcheck_history_v1` 값이 `"NOT_JSON"`일 때
  - When 사용자가 `/` 화면에 진입했을 때
  - Then `Toast`로 `"기록을 불러오지 못했어요"`가 표시되어야 함
  - And 히스토리 프리뷰 영역은 0개 상태로 렌더링되어야 함
- **AC-6 [E]: Scenario: 히스토리 항목 탭 시 결과로 재진입**
  - Given localStorage `rentcheck_history_v1`에 `HistoryEntry`가 1개 있고 `entry.id = "h_001"`일 때
  - When 사용자가 해당 히스토리 `ListRow`를 탭했을 때
  - Then `navigate('/result', { state: { input: entry.input, historyId: "h_001" } })`가 호출되어야 함
- **AC-7 [W]: Scenario: 히스토리 스키마 불일치 처리(Home)**
  - Given localStorage `rentcheck_history_v1` 값이 `[{ "bad": true }]`일 때
  - When 사용자가 `/` 화면에 진입했을 때
  - Then `Toast`로 `"기록을 불러오지 못했어요"`가 표시되어야 함
  - And 히스토리 프리뷰 영역은 0개 상태로 렌더링되어야 함

---

### F2. 3탭 입력 폼 + 공통 설정 입력/검증
- **Description:** 사용자는 전세/월세/매매 탭에서 각 옵션의 입력값을 설정하고, 공통 설정(초기자산/거주기간/투자수익률/집값상승률)을 입력한다. 제출 시 입력값을 검증하고, 유효할 때만 결과 화면으로 이동한다.
- **Data:** `SimulationInput`
- **API:** 없음
- **Requirements:**
- **AC-1 [U]: Scenario: 숫자 입력 필드 키보드 타입**
  - Given 사용자가 `/input` 화면에 진입했을 때
  - Then `jeonseDepositKRW` 입력 `TextField`는 `inputMode="numeric"` 이어야 함
  - And `housePriceGrowthRateAnnual` 입력 `TextField`는 `inputMode="decimal"` 이어야 함
- **AC-2 [E]: Scenario: 제출 성공 시 결과 화면으로 이동**
  - Given 사용자가 `/input` 화면에 있고 토스 로그인된 유저가 있을 때
  - When 사용자가 입력 폼에서 다음 값을 입력 후 “결과 보기”를 탭했을 때  
    `{ initialAssetKRW: 100000000, stayPeriodYears: 1, investmentReturnRateAnnual: 0, housePriceGrowthRateAnnual: 0, jeonseDepositKRW: 50000000, jeonseLoanRatio: 0, jeonseLoanRateAPR: 0, monthlyDepositKRW: 10000000, monthlyRentKRW: 1000000, monthlyRentIncreaseRateAnnual: 0, buyPriceKRW: 100000000, buyEquityKRW: 100000000, buyLoanRateAPR: 0, buyLoanPeriodYears: 30, buyRepaymentType: "원리금균등", presetId: null }`
  - Then `navigate('/result', { state: { input: SimulationInput } })`가 호출되어야 함
- **AC-3 [W]: Scenario: 거주기간 범위 오류**
  - Given 사용자가 `/input` 화면에 있을 때
  - When `stayPeriodYears`에 `0`을 입력하고 “결과 보기”를 탭했을 때
  - Then `stayPeriodYears` 필드에 에러 메시지 `"거주기간은 1~30년만 가능해요"`가 표시되어야 함
  - And `/result`로 navigate가 호출되지 않아야 함
- **AC-4 [W]: Scenario: 매매 자기자본이 매매가를 초과하는 경우 거부**
  - Given 사용자가 `/input` 화면에 있을 때
  - When `{ buyPriceKRW: 500000000, buyEquityKRW: 600000000 }`로 입력하고 “결과 보기”를 탭했을 때
  - Then `buyEquityKRW` 필드에 에러 메시지 `"자기자본은 매매가 이하여야 해요"`가 표시되어야 함
  - And `/result`로 navigate가 호출되지 않아야 함
- **AC-5 [S]: Scenario: 제출 직후 로딩 상태**
  - Given 사용자가 유효한 입력값을 가진 상태로 `/input` 화면에 있을 때
  - While 사용자가 “결과 보기” 버튼을 탭한 직후 300ms 동안
  - Then “결과 보기” `Button`은 `disabled=true` 이어야 함
  - And 버튼 라벨은 `"계산 중…"` 이어야 함
- **AC-6 [W]: Scenario: 프리셋 로드 실패 시 다이얼로그**
  - Given `/input`이 `navigate('/input', { state: { presetId: "preset_unknown" } })`로 진입했을 때
  - When 화면이 렌더링될 때
  - Then `Dialog`에 `"프리셋을 불러오지 못했어요"`가 표시되어야 함
  - And `Dialog`의 확인 버튼 탭 시 `navigate('/')`가 호출되어야 함

---

### F3. 시뮬레이션 계산 엔진(클라이언트 순수 함수) + 추천/인사이트 생성
- **Description:** 입력값을 기반으로 전세/월세/매매 3옵션의 연도별 순자산 배열과 최종 순자산/총비용을 계산한다. 계산 결과에서 최종 순자산이 가장 큰 옵션을 추천하고, 집값상승률을 +1%p로 재계산하여 인사이트 문구를 생성한다.
- **Data:** `SimulationInput`, `OptionResult`, `SimulationResult`
- **API:** 없음
- **Requirements:**
- **AC-1 [U]: Scenario: 결과 구조 고정**
  - Given `SimulationInput.stayPeriodYears = 10`일 때
  - When 시뮬레이션을 실행했을 때
  - Then `SimulationResult.results`는 정확히 3개여야 함
  - And 각 `OptionResult.netWorthByYearKRW.length`는 `11`이어야 함
- **AC-2 [E]: Scenario: 0%/비용 단순 케이스의 최종 순자산 검증**
  - Given 다음 입력값이 있을 때  
    `{ initialAssetKRW: 100000000, stayPeriodYears: 1, investmentReturnRateAnnual: 0, housePriceGrowthRateAnnual: 0, jeonseDepositKRW: 50000000, jeonseLoanRatio: 0, jeonseLoanRateAPR: 0, monthlyDepositKRW: 10000000, monthlyRentKRW: 1000000, monthlyRentIncreaseRateAnnual: 0, buyPriceKRW: 100000000, buyEquityKRW: 100000000, buyLoanRateAPR: 0, buyLoanPeriodYears: 30, buyRepaymentType: "원리금균등", presetId: null }`
  - When 시뮬레이션을 실행했을 때
  - Then 전세(`option="JEONSE"`)의 `finalNetWorthKRW`는 `100000000`이어야 함
  - And 월세(`option="MONTHLY"`)의 `finalNetWorthKRW`는 `88000000`이어야 함
  - And 매매(`option="BUY"`)의 `finalNetWorthKRW`는 `100000000`이어야 함
- **AC-3 [E]: Scenario: 추천 옵션 및 2등과의 차이 계산**
  - Given AC-2의 입력값이 있을 때
  - When 시뮬레이션을 실행했을 때
  - Then `recommendedOption`은 `"JEONSE"` 또는 `"BUY"` 중 하나여야 함
  - And `deltaToSecondBestKRW`는 `0`이어야 함
- **AC-4 [E]: Scenario: 인사이트 문구(집값상승률 +1%p) 생성**
  - Given AC-2의 입력값이 있고 `housePriceGrowthRateAnnual=0`일 때
  - When 인사이트 생성을 위해 집값상승률을 `1`로 바꿔 재계산했을 때
  - Then `insightCopy`는 정확히 `"집값상승률을 1%p 높이면 매매가 1년 후 1000000원 더 유리해요."` 이어야 함
- **AC-5 [W]: Scenario: NaN/Infinity 방지**
  - Given `SimulationInput.buyLoanPeriodYears = 0`인 비정상 입력이 함수에 전달됐을 때
  - When 시뮬레이션을 실행했을 때
  - Then 함수는 예외를 throw하지 않고 `{ ok:false, error:{ code: "INVALID_INPUT" } }` 또는 `{ ok:false, error:{ code: "CALC_ERROR" } }`를 반환해야 함
  - And 호출 측에서 `Dialog`로 `"입력값을 확인해주세요"`를 표시할 수 있어야 함(실패 상태 식별 가능)
- **AC-6 [S]: Scenario: 계산 중 로딩 상태 계약**
  - Given `/result` 화면이 입력값을 받았을 때
  - While 계산이 완료되기 전(최대 300ms)
  - Then UI는 “계산 중…” `Typography`를 표시해야 함
  - And 상세 영역(차트/표) 렌더링을 시도하지 않아야 함
- **AC-7 [W]: Scenario: 입력 범위 위반(예: 전세 대출비율) 거부**
  - Given `SimulationInput.jeonseLoanRatio = 1.5`인 입력이 계산 함수에 전달됐을 때
  - When 시뮬레이션을 실행했을 때
  - Then 반환값은 `{ ok:false }`여야 함
  - And 에러 코드는 정확히 `"INVALID_INPUT"`이어야 함

> 계산 정의(MVP, 명시적)
- 모든 계산은 **연 단위 결과 배열**을 생성하되, 월세/대출 상환은 월 단위로 누적 후 연말에 합산한다.
- 월세 증가율은 매년 1회 적용: `year k`의 월세 = `monthlyRentKRW * (1 + increaseRate)^(k-1)` (k=1..N)
- 투자수익은 연복리: `cash * (1 + investmentReturnRateAnnual/100)`
- 세금/거래비용은 MVP에서 0으로 둔다(Non-goals 준수)

---

### F4. 결과 화면(요약 3카드 + 추천 배지 + 상세 게이팅 + 배너 광고)
- **Description:** 결과 화면은 3옵션 요약 카드와 추천 배지, 차이 금액을 즉시 보여준다. 상세 결과(라인 차트/비용 분석표)는 보상형 광고 시청 완료 후 노출하며, 비용 분석표 이후