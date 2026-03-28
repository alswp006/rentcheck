```md
# SPEC

## Common Principles

### 제품 범위/기술 제약
- 클라이언트 전용 MVP로 구현한다. 시뮬레이션 계산은 **네트워크 없이 순수 함수**로 재현 가능해야 한다.
- 기술 스택: **Vite + React + TypeScript**, UI는 **@toss/tds-mobile** 컴포넌트만 사용한다(레이아웃 flex/grid 목적의 최소 CSS만 허용). 라우팅은 **react-router-dom**, 영속성은 **localStorage**만 사용한다.
- 인증은 템플릿의 `useTossLogin`만 사용하며, 자체 회원가입/로그인은 구현하지 않는다.
- 광고는 템플릿의 `useTossAd`, `AdSlot`, `TossRewardAd`만 사용한다.
- 지원 환경: **Android 7+**, **iOS 16+**에서 동작해야 하며 최신 전용 API 의존을 금지한다.

### 입력/표기 규칙(숫자/퍼센트/기간)
- 금액 단위: 원(₩) 정수. UI 표시는 `1,234,567원` 형태(천 단위 콤마).
- 퍼센트 입력: UI에는 `%`를 표시하되 내부 값은 **연 이율(%)** 숫자(예: 4.2).
- 기간 입력: `residencePeriodYears`는 **1~30** 정수.
- 모든 계산은 `Math.round()`로 원 단위 반올림 후 저장/표시한다.

### 폼/모바일 키보드 원칙
- 숫자 입력 필드는 `inputMode="numeric"`(또는 `decimal`)에 준하는 동작을 하도록 구성한다(TDS TextField props 범위 내).
- 키보드가 올라온 상태에서 하단 CTA가 가려질 경우, 화면은 스크롤로 CTA가 노출되어야 한다.
- 제출 시 포커스를 해제(`blur`)하여 키보드를 내린다.

### 리스트/스크롤 원칙
- 프리셋 리스트(4개), 히스토리 리스트(최대 5개), 비용표(고정 행 수)는 가상 스크롤을 적용하지 않는다.
- 만약 개발 중 리스트 항목 수가 **50개를 초과**하도록 변경되는 경우, 가상 스크롤(윈도잉)을 적용해야 한다(본 MVP에서는 발생하지 않음).

### Toss 검수/정책 준수(필수)
- 외부 도메인 이탈 금지: `window.location.href`, `window.open`으로 외부 URL 이동을 구현하지 않는다.
- “앱 설치 유도” 문구/배너/링크를 포함하지 않는다.
- 프로덕션 빌드에서 `console.error`가 출력되지 않도록 한다(에러는 UI로 처리).

---

## Screen Definitions (React Router)

#### S1. 홈(프리셋 선택) — `/`
- **주요 목적**: 프리셋 4종 또는 “직접 입력”으로 입력 화면 진입, 최근 히스토리로 빠른 재진입.
- **TDS 컴포넌트**
  - `AppBar`, `Typography`
  - 프리셋/바로가기: `ListRow`, `Button`
  - 구분 간격: `Spacing`
  - 피드백: `Toast`(실패 시)
- **Loading/Empty/Error**
  - Empty: 히스토리가 0개일 때 `Typography`로 “최근 기록이 없어요” 표시.
  - Error: localStorage 읽기 실패 시 `Toast`로 `"저장된 기록을 불러오지 못했어요"` 표시.
- **Touch interactions**
  - 모든 `ListRow`는 기본 터치 영역으로 **44px 이상**을 만족해야 한다(TDS 기본).
- **Navigation state contract**
  - Outgoing
    - 프리셋 탭 → `navigate('/input', { state: { presetId: string } })`
    - 직접 입력 탭 → `navigate('/input', { state: { presetId: null } })`
    - 히스토리 항목 탭 → `navigate('/input', { state: { input: SimulationInput } })`
    - 히스토리 더보기 탭 → `navigate('/history')` (state 없음)
  - Incoming
    - `location.state` 사용하지 않음(항상 `undefined`로 처리)

#### S2. 입력(3탭 + 공통 설정) — `/input`
- **주요 목적**: 전세/월세/매매 입력과 공통 설정 입력 후 결과 화면으로 이동.
- **TDS 컴포넌트**
  - `AppBar`, `TabBar`
  - 입력: `TextField`, `Chip`(상환방식 선택), `Toggle`(선택 옵션이 생길 경우에만), `Typography`
  - CTA: `Button`
  - 에러: `Dialog`(치명적), 필드 하단 에러 텍스트는 `Typography`
  - 간격: `Spacing`
- **Loading/Empty/Error**
  - Loading: 프리셋/히스토리 입력값을 state로 받아 폼 초기화 중(최대 300ms) `Typography`로 `"입력값을 불러오는 중..."` 표시.
  - Error: 잘못된 incoming state(필수 필드 누락)일 때 `Dialog`로 `"입력값을 불러올 수 없어요"` 표시 후 확인 탭 시 `/`로 이동.
- **모바일 키보드**
  - 하단 “결과 보기” 버튼이 키보드에 가려지면 스크롤로 노출되어야 한다.
  - “결과 보기” 탭 시 모든 TextField `blur` 처리.
- **Touch interactions**
  - TabBar 탭, 칩, 버튼은 모두 44px 이상.
- **Navigation state contract**
  - Incoming
    - `location.state = { presetId: string | null } | { input: SimulationInput } | undefined`
  - Outgoing
    - 결과 보기 탭(검증 성공) → `navigate('/result', { state: { input: SimulationInput, source: 'input' } })`

#### S3. 결과 — `/result`
- **주요 목적**: 보상형 광고 시청 후 결과(추천/카드/차트/비용표) 노출, 슬라이더로 즉시 재계산, 공유.
- **TDS 컴포넌트**
  - `AppBar`, `Typography`
  - 결과 카드: `ListRow`(카드형 섹션 구성), `Chip`(추천)
  - 슬라이더 대체 UI: MVP에서는 `TextField`로 수치 입력(투자수익률/집값상승률) + `Button`(“적용”) 조합으로 즉시 재계산(가로 슬라이더 컴포넌트는 TDS 핵심 11개에 없으므로 제외)
  - 표: `ListRow` 반복
  - 광고: `TossRewardAd`(게이트), `AdSlot`(하단 배너)
  - 공유: `BottomSheet`, `Button`, `Toast`
- **Loading/Empty/Error**
  - Loading(게이트): `TossRewardAd` 진행 중 `"광고 시청 후 결과가 열립니다"` 표시.
  - Empty: 결과 생성 전(필수 state 없음) `"결과를 표시할 수 없어요"` 표시 + 홈으로 버튼 제공.
  - Error: 공유 쿼리 파싱 실패 시 `Toast` `"공유 링크가 올바르지 않아요"`를 1회 표시하고, `navigate('/')`가 호출되어 홈으로 이동한다.
- **Touch interactions**
  - 공유 버튼/적용 버튼/카드 터치 요소는 44px 이상.
- **Navigation state contract**
  - Incoming
    - `location.state = { input: SimulationInput, source: 'input' | 'history' | 'share' } | undefined`
    - 또한 공유 링크 진입 시 query: `?s=string`(Base64) 사용 가능
  - Outgoing
    - “입력 수정” 탭 → `navigate('/input', { state: { input: SimulationInput } })`
    - “히스토리” 탭 → `navigate('/history')`

#### S4. 히스토리 — `/history`
- **주요 목적**: 최근 5개 기록 목록 확인 및 탭하여 재진입, 전체 삭제.
- **TDS 컴포넌트**
  - `AppBar`, `Typography`, `ListRow`, `Button`, `Dialog`, `Spacing`, `Toast`
- **Loading/Empty/Error**
  - Loading: localStorage 로드 중 `"기록을 불러오는 중..."` 표시(최대 300ms).
  - Empty: 0개일 때 `"저장된 기록이 없어요"` 표시 + 홈으로 버튼.
  - Error: 로드 실패 시 `Toast` `"저장된 기록을 불러오지 못했어요"`.
- **Touch interactions**
  - ListRow는 44px 이상.
- **Navigation state contract**
  - Incoming: state 없음
  - Outgoing
    - 항목 탭 → `navigate('/input', { state: { input: SimulationInput } })`
    - “전체 삭제” 확인 → state 없이 현재 화면 유지(리스트 갱신)

---

## (추가) Screen-level Acceptance Criteria (EARS, pass/fail 명시)

> 표기 규칙: 각 AC는 **PASS 조건**과 **FAIL 조건**을 함께 명시한다.

### S1. 홈(`/`) AC
- AC-S1-1 [E]: 프리셋 탭 내비게이션
  - When 사용자가 프리셋 `P1` ListRow를 탭할 때  
  - Then `navigate('/input', { state: { presetId: 'P1' } })`가 **1회** 호출되면 **PASS**  
  - And 호출이 없거나 2회 이상 호출되면 **FAIL**
- AC-S1-2 [E]: 히스토리 미리보기 탭 내비게이션
  - When 사용자가 히스토리 미리보기 ListRow를 탭할 때  
  - Then `navigate('/input', { state: { input: entry.input } })`가 **1회** 호출되면 **PASS**  
  - And 호출이 없거나 state에 `input`이 없으면 **FAIL**
- AC-S1-3 [S]: 빈 히스토리 문구 표시
  - While localStorage `rentcheck.history.v1`가 `[]`(또는 키 미존재)일 때  
  - Then `"최근 기록이 없어요"` Typography가 화면에 존재하면 **PASS**  
  - And 해당 문구가 없으면 **FAIL**
- AC-S1-4 [W]: localStorage 로드 예외 토스트
  - When localStorage getItem/parse 과정에서 예외가 throw될 때  
  - Then `"저장된 기록을 불러오지 못했어요"` Toast가 **300ms 이내**에 **1회** 표시되면 **PASS**  
  - And 토스트가 표시되지 않거나 2회 이상 표시되면 **FAIL**

### S2. 입력(`/input`) AC
- AC-S2-1 [S]: 프리셋/히스토리 초기화 로딩
  - While 폼 초기화 중(최대 300ms)일 때  
  - Then `"입력값을 불러오는 중..."`이 표시되면 **PASS**  
  - And 로딩 중 문구가 표시되지 않으면 **FAIL**
- AC-S2-2 [E]: “결과 보기” 성공 시 이동
  - When 사용자가 유효 입력으로 “결과 보기”를 탭할 때  
  - Then `navigate('/result', { state: { input, source: 'input' } })`가 1회 호출되면 **PASS**  
  - And 호출이 없으면 **FAIL**
- AC-S2-3 [W]: 유효성 실패 시 이동 차단
  - When `residencePeriodYears`가 범위를 벗어나고 “결과 보기”를 탭할 때  
  - Then `/result`로 navigate가 **호출되지 않으면 PASS**  
  - And navigate가 호출되면 **FAIL**
- AC-S2-4 [W]: incoming state 손상 시 복구 경로 제공
  - When `location.state`에 필수 필드가 누락된 `input`이 전달될 때  
  - Then `"입력값을 불러올 수 없어요"` Dialog가 표시되고 확인 탭 시 `navigate('/')`가 호출되면 **PASS**  
  - And Dialog가 표시되지 않거나 홈으로 이동하지 않으면 **FAIL**

### S3. 결과(`/result`) AC
- AC-S3-1 [E]: 광고 게이트 완료 전 결과 DOM 미노출
  - While `TossRewardAd` 완료 콜백이 호출되기 전일 때  
  - Then 결과 카드(전세/월세/매매 3개)가 DOM에 **0개**이면 **PASS**  
  - And 카드가 1개 이상 렌더링되면 **FAIL**
- AC-S3-2 [E]: 광고 완료 후 결과 노출
  - When `TossRewardAd` 완료 콜백이 호출될 때  
  - Then 결과 카드가 **3개** 렌더링되면 **PASS**  
  - And 3개 미만/초과면 **FAIL**
- AC-S3-3 [W]: 공유 파라미터 오류 시 토스트 + 홈 이동
  - When `/result?s=...` 디코딩이 `ShareDecodeError`를 반환할 때  
  - Then `"공유 링크가 올바르지 않아요"` Toast가 **300ms 이내** 1회 표시되고 `navigate('/')`가 1회 호출되면 **PASS**  
  - And 둘 중 하나라도 발생하지 않으면 **FAIL**
- AC-S3-4 [W]: 입력 state 없음(직접 진입) 처리
  - When `location.state === undefined`이고 `s`도 없을 때  
  - Then `"결과를 표시할 수 없어요"` 문구 + `"홈으로"` 버튼이 표시되고, 버튼 탭 시 `navigate('/')`가 1회 호출되면 **PASS**  
  - And 버튼이 없거나 이동이 안 되면 **FAIL**

### S4. 히스토리(`/history`) AC
- AC-S4-1 [S]: 로딩 문구 표시(최대 300ms)
  - While localStorage 로드 중일 때  
  - Then `"기록을 불러오는 중..."`이 표시되면 **PASS**  
  - And 로딩 중 문구가 표시되지 않으면 **FAIL**
- AC-S4-2 [E]: 항목 탭 시 입력으로 이동
  - When 사용자가 히스토리 항목 ListRow를 탭할 때  
  - Then `navigate('/input', { state: { input: entry.input } })`가 1회 호출되면 **PASS**  
  - And 호출이 없으면 **FAIL**
- AC-S4-3 [W]: 로드 실패 토스트
  - When localStorage getItem/parse에서 예외가 throw될 때  
  - Then `"저장된 기록을 불러오지 못했어요"` Toast가 **300ms 이내** 1회 표시되면 **PASS**  
  - And 토스트가 표시되지 않으면 **FAIL**
- AC-S4-4 [E]: 전체 삭제 후 빈 상태 전환
  - When “전체 삭제”를 확인 Dialog에서 “삭제”로 확정할 때  
  - Then localStorage `rentcheck.history.v1`가 `[]`로 저장되고 화면에 `"저장된 기록이 없어요"`가 표시되면 **PASS**  
  - And 둘 중 하나라도 만족하지 않으면 **FAIL**
- **AC-S4-5 [W]: 히스토리 5개 초과 저장 시 eviction 동작 (추가)**
  - When 새로운 시뮬레이션 결과가 저장되는 시점에 기존 localStorage `rentcheck.history.v1` 배열 길이가 `5`일 때  
  - Then 저장 직후 localStorage `rentcheck.history.v1` 배열 길이가 **정확히 `5`**이고, **새 항목이 index `0`**에 존재하면 **PASS**  
  - And 길이가 `5`가 아니거나 새 항목이 저장되지 않으면 **FAIL**

---

## Data Models

### (추가) Entity / Value Object 정책 (id, createdAt, updatedAt)
- 본 MVP에서 **localStorage에 독립적으로 저장/식별되는 엔터티(Entity)**는 `HistoryEntry`뿐이다.
- 아래 타입들은 **값 객체(Value Object)**로 취급하며, 앱 내에서 **계산/화면 렌더링을 위한 임시 값(또는 상수)**로만 사용되고 독립 저장/동기화/부분 업데이트가 발생하지 않으므로 `id/createdAt/updatedAt`을 요구하지 않는다.
  - `SimulationInput`: `HistoryEntry.input`에 **중첩 저장되는 값**이며, 독립 식별/부분 갱신 대상이 아님
  - `SimulationResult`: 매 계산 시점에 **즉시 생성되는 계산 결과 값**이며 저장하지 않음
  - `CostBreakdownRow`: `SimulationResult.costBreakdownTable`의 구성 요소로 **label 기반 고정 행**(5행)이며 저장/식별 대상이 아님
  - `PresetScenario`: 코드 상수로만 존재하며 런타임 저장/변경이 없음

### PresetScenario — fields, types, constraints
```ts
export interface PresetScenario {
  id: 'P1' | 'P2' | 'P3' | 'P4';
  name: string; // 1~20자
  defaultInput: SimulationInput;
}
```
- 저장: 프리셋은 코드 상수로 관리( localStorage 저장 없음 )

### (추가) Presets — P1~P4 정의(lookup table)
- 목적: S1에서 전달된 `presetId`로 S2 입력 폼을 **결정적으로 초기화**하기 위한 상수 테이블을 제공한다.
- 정책:
  - 프리셋은 **4개 고정**이며 `id`는 `'P1' | 'P2' | 'P3' | 'P4'`만 사용한다.
  - 각 프리셋의 `defaultInput`은 `SimulationInput` **전체 필드**를 포함해야 한다(누락 없음).
  - 프리셋의 `defaultInput.presetId`는 반드시 해당 프리셋의 `id`와 동일해야 한다.

```ts
export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'P1',
    name: '기본 10년',
    defaultInput: {
      presetId: 'P1',

      jeonseDeposit: 300_000_000,
      jeonseLoanRatio: 0.6,
      jeonseInterestRate: 4.2,

      monthlyDeposit: 10_000_000,
      monthlyRent: 1_200_000,
      monthlyRentIncreaseRate: 2,

      buyPrice: 500_000_000,
      buyEquity: 200_000_000,
      buyLoanInterestRate: 4.0,
      buyLoanPeriodYears: 30,
      buyRepaymentType: 'AMORTIZED_EQUAL_PAYMENT',

      initialAsset: 100_000_000,
      residencePeriodYears: 10,
      investmentReturnRate: 5,
      housePriceGrowthRate: 2,
    },
  },
  {
    id: 'P2',
    name: '보수적 5년',
    defaultInput: {
      presetId: 'P2',

      jeonseDeposit: 250_000_000,
      jeonseLoanRatio: 0.5,
      jeonseInterestRate: 4.5,

      monthlyDeposit: 10_000_000,
      monthlyRent: 1_000_000,
      monthlyRentIncreaseRate: 1,

      buyPrice: 450_000_000,
      buyEquity: 220_000_000,
      buyLoanInterestRate: 4.2,
      buyLoanPeriodYears: 30,
      buyRepaymentType: 'AMORTIZED_EQUAL_PAYMENT',

      initialAsset: 120_000_000,
      residencePeriodYears: 5,
      investmentReturnRate: 3,
      housePriceGrowthRate: 1,
    },
  },
  {
    id: 'P3',
    name: '공격적 15년',
    defaultInput: {
      presetId: 'P3',

      jeonseDeposit: 400_000_000,
      jeonseLoanRatio: 0.7,
      jeonseInterestRate: 4.0,

      monthlyDeposit: 20_000_000,
      monthlyRent: 1_500_000,
      monthlyRentIncreaseRate: 3,

      buyPrice: 650_000_000,
      buyEquity: 250_000_000,
      buyLoanInterestRate: 3.8,
      buyLoanPeriodYears: 30,
      buyRepaymentType: 'AMORTIZED_EQUAL_PAYMENT',

      initialAsset: 150_000_000,
      residencePeriodYears: 15,
      investmentReturnRate: 7,
      housePriceGrowthRate: 3,
    },
  },
  {
    id: 'P4',
    name: '무이자/무성장',
    defaultInput: {
      presetId: 'P4',

      jeonseDeposit: 300_000_000,
      jeonseLoanRatio: 0.5,
      jeonseInterestRate: 0,

      monthlyDeposit: 10_000_000,
      monthlyRent: 1_000_000,
      monthlyRentIncreaseRate: 0,

      buyPrice: 500_000_000,
      buyEquity: 250_000_000,
      buyLoanInterestRate: 0,
      buyLoanPeriodYears: 30,
      buyRepaymentType: 'AMORTIZED_EQUAL_PRINCIPAL',

      initialAsset: 120_000_000,
      residencePeriodYears: 10,
      investmentReturnRate: 0,
      housePriceGrowthRate: 0,
    },
  },
];
```

### SimulationInput — fields, types, constraints
```ts
export type BuyRepaymentType = 'AMORTIZED_EQUAL_PAYMENT' | 'AMORTIZED_EQUAL_PRINCIPAL';

export interface SimulationInput {
  presetId: PresetScenario['id'] | null;

  // 전세
  jeonseDeposit: number;           // 0~5_000_000_000 (원)
  jeonseLoanRatio: number;         // 0~1
  jeonseInterestRate: number;      // 0~30 (연 %, 예: 4.2)

  // 월세
  monthlyDeposit: number;          // 0~5_000_000_000
  monthlyRent: number;             // 0~20_000_000 (월 원)
  monthlyRentIncreaseRate: number; // 0~20 (연 %, 예: 2)

  // 매매
  buyPrice: number;                // 0~10_000_000_000
  buyEquity: number;               // 0~buyPrice
  buyLoanInterestRate: number;     // 0~30 (연 %)
  buyLoanPeriodYears: number;      // 1~40
  buyRepaymentType: BuyRepaymentType;

  // 공통
  initialAsset: number;            // 0~10_000_000_000
  residencePeriodYears: number;    // 1~30
  investmentReturnRate: number;    // 0~30 (연 %)
  housePriceGrowthRate: number;    // -10~20 (연 %)
}
```

### SimulationResult — fields, types, constraints
```ts
export type RecommendedOption = 'JEONSE' | 'MONTHLY' | 'BUY';

export interface CostBreakdownRow {
  label: '초기투입자산' | '대출이자(누적)' | '월세(누적)' | '대출원금상환(누적)' | '최종순자산';
  jeonse: number;  // 원
  monthly: number; // 원
  buy: number;     // 원
}

export interface SimulationResult {
  netWorthByYear: {
    jeonse: number[];  // length = residencePeriodYears + 1, year0 포함
    monthly: number[];
    buy: number[];
  };
  finalNetWorth: {
    jeonse: number;
    monthly: number;
    buy: number;
  };
  recommendedOption: RecommendedOption;
  deltaVsSecondBest: number; // 원, >= 0
  insightCopy: string; // 1~80자
  costBreakdownTable: CostBreakdownRow[]; // 고정 5행
}
```

### (추가) SimulationOutcome (계산 실패를 throw 없이 표현)
```ts
export type SimulationError = 'INVALID_INPUT';

export type SimulationOutcome =
  | { ok: true; result: SimulationResult }
  | { ok: false; error: SimulationError };
```
- `simulate(input)`는 **예외를 throw하지 않고** `SimulationOutcome`을 반환한다.

### HistoryEntry — fields, types, constraints (완전 명세)
```ts
export interface HistoryEntry {
  id: string;              // nanoid/uuid (string)
  createdAt: string;       // ISO8601 (예: "2026-03-28T12:34:56.789Z")
  updatedAt: string;       // ISO8601 (예: "2026-03-28T12:40:00.000Z")
  label: string;           // 예: "직접 입력 · 집값 2% · 10년" (1~40자 권장)
  input: SimulationInput;  // 저장 당시 입력 스냅샷(전체 필드 포함)
}
```

### (추가) History 저장/정렬/중복/eviction 정책 (max-5 명세)
- 저장 키: `rentcheck.history.v1`
- **직렬화 포맷(명시)**:
  - 저장 시: `localStorage.setItem('rentcheck.history.v1', JSON.stringify(entries))`
  - 로드 시: `JSON.parse(raw) as unknown` 후 스키마 검증을 통과한 항목만 사용
  - 키 미존재(`getItem === null`)는 `[]`로 취급
- 정렬 규칙(저장 배열 순서):
  - 배열 index 0이 **가장 최신**(recent) 항목이어야 한다.
  - 최신의 정의: `updatedAt`이 최신인 항목이 앞에 온다.
  - `updatedAt` 비교는 `Date.parse(updatedAt)` 값(epoch ms)을 기준으로 한다.
- 중복 입력 처리 규칙:
  - 새로 저장하려는 `input`이 기존 항목의 `entry.input`과 **깊은 동등(deep equal)** 이면, **새 항목을 만들지 않는다.**
  - 대신 해당 기존 항목에 대해:
    - `updatedAt = nowISO`로 갱신한다.
    - `label`은 현재 입력값 기준으로 **재생성**한다.
    - 배열에서 해당 항목을 제거 후 **index 0으로 이동**한다.
    - `createdAt`은 **원래 값을 유지**한다.
- max-5 eviction 규칙:
  - 저장 후 배열 길이가 5를 초과하면, **createdAt이 가장 오래된(가장 오래된 시간) 1개**를 제거한다.
  - `createdAt` 비교는 `Date.parse(createdAt)` 값(epoch ms)을 기준으로 한다.
- localStorage 용량 초과 처리:
  - `localStorage.setItem`이 `QuotaExceededError`(또는 동등 예외)를 throw하면:
    - 앱은 크래시되지 않는다.
    - 저장 동작은 **no-op(기존 저장값 유지)** 처리한다.
    - 사용자에게 Toast `"저장 공간이 부족해 기록을 저장하지 못했어요"`를 **300ms 이내** 1회 표시한다.

### (추가) Calculation Logic (SimulationResult 계산 규칙)

> 목적: `SimulationInput` → `SimulationOutcome` 계산을 **순수 함수**로 재현 가능하게 만들기 위한 수식/알고리즘을 명시한다.

#### 공통 변환
- 기간:
  - `Y = residencePeriodYears` (년)
  - `M = Y * 12` (개월)
- 월 수익률(투자):
  - `rInv = (investmentReturnRate / 100) / 12`
- 월 집값 성장률:
  - `rHouse = (housePriceGrowthRate / 100) / 12`

#### 옵션별 초기 상태(월 0, 첫 달 비용 차감 전)
- 전세(JEONSE)
  - `loanP = Math.round(jeonseDeposit * jeonseLoanRatio)`
  - `ownDeposit = Math.round(jeonseDeposit - loanP)`
  - `cash = Math.round(initialAsset - ownDeposit)` (투자 가능한 현금)
  - 월 이자:
    - `jeonseInterestMonthly = Math.round(loanP * (jeonseInterestRate / 100) / 12)`
- 월세(MONTHLY)
  - `cash = Math.round(initialAsset - monthlyDeposit)`
  - 월세(월별):
    - `rent(monthIndex)`:
      - `yearIndex = Math.floor(monthIndex / 12)` (0부터)
      - `rent = monthlyRent * (1 + monthlyRentIncreaseRate / 100) ** yearIndex`
      - `rentMonthly = Math.round(rent)`
- 매매(BUY)
  - `loanP0 = Math.round(buyPrice - buyEquity)` (0 이상)
  - `cash = Math.round(initialAsset - buyEquity)`
  - 월 이자율:
    - `i = (buyLoanInterestRate / 100) / 12`
  - 총 상환개월:
    - `n = buyLoanPeriodYears * 12` (단, 입력 제약상 1 이상)
  - 원리금균등(AMORTIZED_EQUAL_PAYMENT):
    - if `i === 0`:
      - `payment = Math.round(loanP0 / n)`
    - else:
      - `payment = Math.round(loanP0 * (i * (1 + i) ** n) / ((1 + i) ** n - 1))`
    - 매월:
      - `interest = Math.round(remainingP * i)`
      - `principal = Math.round(payment - interest)`
      - `principal`이 `remainingP`보다 크면 `principal = remainingP`, `payment = principal + interest`
  - 원금균등(AMORTIZED_EQUAL_PRINCIPAL):
    - `principalFixed = Math.round(loanP0 / n)`
    - 매월:
      - `interest = Math.round(remainingP * i)`
      - `principal = min(principalFixed, remainingP)`
      - `payment = principal + interest`

#### 월 단위 시뮬레이션(0 → M-1)
- 모든 옵션 공통:
  - 매월 시작 시점에 현금 성장(투자수익 반영):
    - `cash = Math.round(cash * (1 + rInv))`
- 전세:
  - `cash = cash - jeonseInterestMonthly`
  - 대출 원금(loanP)은 기간 동안 변하지 않는다(이자만 납부).
- 월세:
  - `cash = cash - rentMonthly`
- 매매:
  - 월 0부터 `min(M, n)`개월 동안만 상환 발생(대출 다 갚으면 이후 payment=0)
  - 상환이 발생하는 달:
    - `cash = cash - payment`
    - `remainingP = remainingP - principal`
    - 누적 이자/누적 원금상환을 각각 합산한다.
- **안전장치(순수 함수 내)**
  - 시뮬레이션 중 어떤 단계에서든 계산 결과가 `NaN` 또는 `Infinity`가 되면 즉시 `{ ok:false, error:'INVALID_INPUT' }` 반환한다.

#### 연도별 순자산(netWorthByYear) 정의
- `year = 0..Y`에 대해, `month = year * 12` 시점의 상태를 샘플링한다(월 시뮬레이션 중간 스냅샷).
- 전세 순자산:
  - `netWorthJeonse = cash + jeonseDeposit - loanP`
  - (동치: `cash + ownDeposit`)
- 월세 순자산:
  - `netWorthMonthly = cash + monthlyDeposit`
- 매매 순자산:
  - 집값:
    - `houseValue = Math.round(buyPrice * (1 + rHouse) ** (year * 12))`
  - `netWorthBuy = cash + houseValue - remainingP`
- `netWorthByYear.*[0]`은 항상 `initialAsset`과 같아야 한다(반올림 오차로 ±1원 허용하지 않음: 계산 경로가 위 정의를 따르면 정확히 동일해짐).

#### 최종 순자산(finalNetWorth)
- `finalNetWorth.*`는 `netWorthByYear.*[Y]` 값과 동일해야 한다.

#### 추천 옵션(recommendedOption) 및 차이(deltaVsSecondBest)
- `recommendedOption`은 `finalNetWorth`가 가장 큰 옵션으로 결정한다.
- 동률 처리(임시 정책):
  - `finalNetWorth` 최댓값이 동률이면 우선순위는 `BUY > JEONSE > MONTHLY`로 선택한다.  
  - (Open Questions에서 재확정 가능하나, MVP 구현에서는 위 우선순위를 사용한다.)
- `deltaVsSecondBest = maxFinal - secondMaxFinal` (원, 0 이상)

#### insightCopy 생성 규칙(템플릿, 1~80자)
- 옵션 이름 매핑:
  - `JEONSE` → `"전세"`
  - `MONTHLY` → `"월세"`
  - `BUY` → `"매매"`
- 기본 템플릿:
  - if `deltaVsSecondBest === 0`:
    - `"세 선택지가 비슷해요 · {Y}년 후 순자산 기준"`
  - else:
    - `"{옵션명}가 가장 유리해요 · 2위 대비 {deltaVsSecondBest}원"`
- `{deltaVsSecondBest}`는 천단위 콤마 포함 원 단위 문자열로 치환한다.
- 결과 문자열 길이가 80자를 초과하면 `{Y}년 후` 구문을 제거한 축약 템플릿으로 재생성한다.

### (추가) SharePayload / 인코딩 규약
```ts
export type SharePayloadVersion = 1;

export interface SharePayloadV1 {
  v: SharePayloadVersion; // = 1
  input: SimulationInput;
}

export type SharePayload = SharePayloadV1;

export type ShareDecodeError =
  | 'MISSING_PARAM'
  | 'TOO_LONG'
  | 'INVALID_BASE64'
  | 'INVALID_JSON'
  | 'SCHEMA_MISMATCH';
```

- **목적**: `/result?s=...`로 진입 시 동일 입력값으로 결과를 재현한다.

- **인코딩 알고리즘(생성)**:
  1. `payload: SharePayload = { v: 1, input }`
  2. `json = JSON.stringify(payload)`
  3. `b64 = Base64EncodeUTF8(json)` (표준 Base64, UTF-8 기반)
  4. URL 안전 Base64(Base64URL)로 변환:
     - `b64url = b64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')`
  5. `s = b64url`를 그대로 쿼리 파라미터 값으로 사용한다.
     - 추가 `encodeURIComponent`를 호출하지 않는다(브라우저가 쿼리스트링 인코딩을 처리하며, Base64URL은 URL-safe 문자만 사용).

- **디코딩 알고리즘(파싱)**:
  1. `s` 미존재 → `ShareDecodeError = 'MISSING_PARAM'`
  2. `s.length > 1800` → `ShareDecodeError = 'TOO_LONG'`
  3. Base64URL → Base64 복원:
     - `b64 = s.replaceAll('-', '+').replaceAll('_', '/')`
     - padding 복원: `while (b64.length % 4 !== 0) b64 += '='`
  4. `json = Base64DecodeUTF8(b64)`에서 예외 → `ShareDecodeError = 'INVALID_BASE64'`
  5. `JSON.parse(json)` 예외 → `ShareDecodeError = 'INVALID_JSON'`
  6. 스키마 검증 실패(예: `v !== 1`, `input` 누락, `residencePeriodYears` 누락 등 필수 필드 누락) → `ShareDecodeError = 'SCHEMA_MISMATCH'`

- **최대 길이(명시)**:
  - `s`(Base64URL 문자열) 길이 최대: **1800자**
  - 이 제한을 초과하는 경우 공유/진입 모두 실패로 처리한다(Toast + 홈으로 이동).

- **스키마 검증 규칙(최소)**:
  - `payload.v === 1`
  - `payload.input`이 존재하고 `SimulationInput`의 필수 필드들이 `number`/`string` 타입으로 존재해야 한다.
  - 검증 실패 시 **부분 복구(디폴트 채움)**는 하지 않고 실패 처리한다(Toast + 홈 이동).

- **ShareDecodeError 트리거 매핑(명시)**
  - `'MISSING_PARAM'`: URLSearchParams로 `s`를 조회했을 때 `null`
  - `'TOO_LONG'`: `s.length > 1800`
  - `'INVALID_BASE64'`: Base64 padding/문자 복원 후 `Base64DecodeUTF8`에서 예외 throw
  - `'INVALID_JSON'`: 디코딩된 문자열에 대해 `JSON.parse` 예외 throw
  - `'SCHEMA_MISMATCH'`: JSON 파싱은 성공했으나 `v !== 1` 또는 `SimulationInput` 필수 필드 타입/존재 검증 실패

### localStorage keys / shapes / size estimation
- `rentcheck.history.v1`
  - shape: `HistoryEntry[]` (최대 5개)
  - serialization: `JSON.stringify(HistoryEntry[])` / `JSON.parse` (키 미존재 시 `[]`)
  - size 추정: entry 1개당 input 약 16개 숫자 + label → 약 0.8~1.5KB → 5개 약 5~8KB
- `rentcheck.ai_notice_ack.v1`
  - **사용하지 않음**(본 앱은 생성형 AI 결과물을 노출하지 않음)
- `rentcheck.ui.v1` (선택)
  - shape: `{ lastPresetId?: PresetScenario['id'] }`
  - size 추정: < 1KB
- 총합: < 50KB 수준(5MB 제한 대비 충분)

---

## Feature List

### F1. 프리셋 선택(홈) + 시작 플로우
- Description: 홈에서 프리셋 4종과 “직접 입력” 진입점을 제공한다. 사용자가 프리셋을 선택하면 해당 프리셋의 기본 입력값으로 입력 화면이 초기화된다. 홈에는 최근 히스토리(최대 2개 미리보기)를 노출해 빠른 재진입을 지원한다.
- Data: `PresetScenario(상수)`, `HistoryEntry[] (rentcheck.history.v1)`
- API: 없음
- Requirements:
  - AC-1 [E]: Scenario: 프리셋 선택으로 입력 화면 진입
    - Given 홈 화면(`/`)에 프리셋 `P1` ListRow가 보일 때
    - When 사용자가 `P1` ListRow를 탭할 때
    - Then `navigate('/input', { state: { presetId: 'P1' } })`가 호출됨
  - AC-2 [E]: Scenario: 직접 입력으로 입력 화면 진입
    - Given 홈 화면(`/`)에 “직접 입력” ListRow가 보일 때
    - When 사용자가 “직접 입력” ListRow를 탭할 때
    - Then `navigate('/input', { state: { presetId: null } })`가 호출됨
  - AC-3 [S]: Scenario: 히스토리 미리보기 비어있음 표시
    - Given localStorage `rentcheck.history.v1` 값이 `[]`일 때
    - When 홈 화면을 렌더링할 때
    - Then `Typography`에 `"최근 기록이 없어요"`가 표시되어야 함
    - And 히스토리 미리보기 `ListRow` 항목은 `0`개 렌더링되어야 함
  - AC-4 [W]: Scenario: localStorage 읽기(getItem) 예외 처리
    - Given 홈 화면 렌더링 중 localStorage에서 `rentcheck.history.v1`를 읽는 과정에서 예외가 throw될 때
    - When 홈 화면을 렌더링할 때
    - Then `Toast`로 `"저장된 기록을 불러오지 못했어요"`가 `1`회 표시됨
    - And 히스토리 미리보기 `ListRow` 항목은 `0`개 렌더링되어야 함
  - AC-5 [W]: Scenario: 손상된 히스토리 엔트리 스킵(필수 필드 누락)
    - Given localStorage `rentcheck.history.v1` 값이 아래 배열일 때  
      `[{ id: 'a', createdAt: "2026-03-28T00:00:00.000Z", updatedAt: "2026-03-28T00:00:00.000Z", label: 'bad', input: null as any }, { id: 'b', createdAt: "2026-03-28T00:00:01.000Z", updatedAt: "2026-03-28T00:00:01.000Z", label: 'good', input: { presetId: null, ... } as SimulationInput }]`
    - When 홈 화면을 렌더링할 때
    - Then 손상된 엔트리(`id='a'`)에 대한 히스토리 미리보기 `ListRow`는 렌더링되지 않아야 함
    - And 정상 엔트리(`id='b'`)에 대한 히스토리 미리보기 `ListRow`는 렌더링되어야 함
  - AC-6 [E]: Scenario: 히스토리 미리보기 탭으로 입력 재진입
    - Given localStorage `rentcheck.history.v1`에 `HistoryEntry` 1개가 있고 entry.input.residencePeriodYears가 `10`일 때
    - When 홈 화면의 해당 히스토리 ListRow를 탭할 때
    - Then `navigate('/input', { state: { input: entry.input } })`가 호출됨
  - AC-7 [W]: Scenario: localStorage 히스토리 JSON 파싱 실패 처리
    - Given localStorage `rentcheck.history.v1` 값이 `"NOT_JSON"`일 때
    - When 홈 화면을 렌더링할 때
    - Then `Toast`로 `"저장된 기록을 불러오지 못했어요"`가 1회 표시됨
    - And 히스토리 미리보기는 0개로 렌더링됨
  - AC-8 [U]: Scenario: 콘솔 에러 0개(검수)
    - Given 프로덕션 빌드 환경일 때
    - When 홈 화면에서 프리셋 탭, 직접 입력 탭, 히스토리 탭을 각각 1회 수행할 때
    - Then `console.error` 호출 횟수는 `0`이어야 함

---

### F2. 입력 폼(3탭 + 공통) 및 유효성 검증
- Description: 입력 화면에서 전세/월세/매매 3개 탭과 공통 설정을 입력한다. “결과 보기” 탭 시 모든 입력값을 검증하고, 검증을 통과하면 결과 화면으로 이동한다. 입력 오류는 필드 단위로 즉시 안내한다.
- Data: `SimulationInput`
- API: 없음
- Requirements:
  - AC-1 [E]: Scenario: 입력값 검증 성공 후 결과 화면 이동
    - Given 사용자가 입력 화면(`/input`)에 있고 다음 값을 입력했을 때  
      `{ initialAsset: 100000000, residencePeriodYears: 10, investmentReturnRate: 5, housePriceGrowthRate: 2, jeonseDeposit: 300000000, jeonseLoanRatio: 0.6, jeonseInterestRate: 4.2, monthlyDeposit: 10000000, monthlyRent: 1200000, monthlyRentIncreaseRate: 2, buyPrice: 500000000, buyEquity: 200000000, buyLoanInterestRate: 4.0, buyLoanPeriodYears: 30, buyRepaymentType: 'AMORTIZED_EQUAL_PAYMENT', presetId: null }`
    - When 사용자가 “결과 보기” `Button`을 탭할 때
    - Then `navigate('/result', { state: { input, source: 'input' } })`가 호출됨
  - AC-2 [W]: Scenario: 거주기간 0년 거부
    - Given 사용자가 입력 화면(`/input`)에 있을 때
    - When 공통 설정에서 `residencePeriodYears`에 `0`을 입력하고 “결과 보기”를 탭할 때
    - Then `residencePeriodYears` 필드 하단에 `"거주기간은 1~30년만 입력할 수 있어요"`가 표시됨
    - And `/result`로 navigate가 호출되지 않음
  - AC-3 [W]: Scenario: 매매 자기자본이 매매가 초과 거부
    - Given 사용자가 입력 화면(`/input`)에 있을 때
    - When 매매 탭에서 `{ buyPrice: 500000000, buyEquity: 600000000 }`을 입력하고 “결과 보기”를 탭할 때
    - Then `buyEquity` 필드 하단에 `"자기자본은 매매가를 초과할 수 없어요"`가 표시됨
    - And `/result`로 navigate가 호출되지 않음
  - AC-4 [W]: Scenario: 전세 대출비율 범위 초과 거부
    - Given 사용자가 입력 화면(`/input`)에 있을 때
    - When 전세 탭에서 `jeonseLoanRatio`에 `1.2`를 입력하고 “결과 보기”를 탭할 때
    - Then `jeonseLoanRatio` 필드 하단에 `"대출비율은 0~1 사이만 입력할 수 있어요"`가 표시됨
    - And `/result`로 navigate가 호출되지 않음
  - AC-5 [S]: Scenario: 프리셋/히스토리 로딩 상태 표시
    - Given `location.state = { presetId: 'P2' }`로 `/input`에 진입했을 때
    - While 입력 폼 초기값을 세팅하는 상태(최대 300ms)일 때
    - Then `Typography`로 `"입력값을 불러오는 중..."`이 표시됨
  - AC-6 [W]: Scenario: 잘못된 incoming state 처리
    - Given `/input`에 `location.state = { input: { presetId: null } as any }`로 진입했을 때
    - When 화면이 렌더링될 때
    - Then `Dialog`에 `"입력값을 불러올 수 없어요"`가 표시됨
    - And 확인 버튼 탭 시 `navigate('/')`가 호출됨

---

### F3. 시뮬레이션 계산 엔진(순수 함수)
- Description: `SimulationInput`을 받아 `SimulationResult`를 생성하는 순수 계산 함수를 제공한다. 연도별 순자산 배열을 생성하고 최종 순자산 1위 옵션을 추천으로 선정한다. 계산 실패(NaN/Infinity 등) 발생 시 안전한 에러 처리를 수행한다.
- Data: `SimulationInput`, `SimulationResult`
- API: 없음
- Requirements:
  - AC-1 [U]: Scenario: 순수 함수 동일 입력 동일 출력
    - Given 동일한 입력 `inputA`가 있을 때  
      `inputA = { presetId: null, initialAsset: 100000000, residencePeriodYears: 10, investmentReturnRate: 5, housePriceGrowthRate: 2, jeonseDeposit: 300000000, jeonseLoanRatio: 0.6, jeonseInterestRate: 4.2, monthlyDeposit: 10000000, monthlyRent: 1200000, monthlyRentIncreaseRate: 2, buyPrice: 500000000, buyEquity: 200000000, buyLoanInterestRate: 4.0, buyLoanPeriodYears: 30, buyRepaymentType: 'AMORTIZED_EQUAL_PAYMENT' }`
    - When `simulate(inputA)`를 2회 호출할 때
    - Then 두 결과의 `JSON.stringify(result)` 값이 완전히 동일해야 함
  - AC-2 [U]: Scenario: 연도 배열 길이 규칙
    - Given `residencePeriodYears = 10`인 입력이 있을 때
    - When `simulate(input)`을 호출할 때
    - Then `result.netWorthByYear.jeonse.length`는 `11`이어야 함
    - And `result.netWorthByYear.monthly.length`는 `11`이어야 함
    - And `result.netWorthByYear.buy.length`는 `11`이어야 함
  - AC-3 [E]: Scenario: 추천 옵션은 최종 순자산 최댓값
    - Given `simulate(input)` 결과에서 `finalNetWorth`가 `{ jeonse: 300000000, monthly: 280000000, buy: 310000000 }`로 계산되었을 때
    - When 결과를 생성할 때
    - Then `recommendedOption`은 `'BUY'`여야 함
    - And `deltaVsSecondBest`는 `10000000`이어야 함
  - AC-4 [W]: Scenario: 입력에 NaN 포함 시 계산 차단
    - Given 입력값 중 `investmentReturnRate`가 `Number.NaN`인 `inputBad`가 있을 때
    - When `simulate(inputBad)`를 호출할 때
    - Then 함수는 예외를 throw하지 않고
    - And 호출 결과는 `{ ok: false, error: 'INVALID_INPUT' }`여야 함
  - AC-5 [W]: Scenario: 0으로 나누기/Infinity 방지
    - Given `buyLoanPeriodYears = 0`인 입력이 강제로 들어왔을 때
    - When `simulate(input)`을 호출할 때
    - Then 함수는 예외를 throw하지 않고
    - And 호출 결과는 `{ ok: false, error: 'INVALID_INPUT' }`여야 함
  - AC-6 [S]: Scenario: 계산 중 로딩 상태(결과 화면 연동)
    - Given 결과 화면에서 계산 트리거가 발생했을 때
    - While `isCalculating = true`일 때
    - Then `"계산 중..."` 텍스트가 표시되어야 함
    - And `"계산 중..."` 표시는 `500ms` 이내에 사라져야 함(동기 계산 시 즉시 false)

---

### F4. 결과 화면 UI(카드/인사이트/차트/비용표) 렌더링
- Description: 보상형 광고 게이트 완료 후 결과 화면에서 3옵션 카드, 추천 뱃지, 차이 금액, 인사이트 1줄, 연도별 추이 차트, 비용 분석표를 렌더링한다. 결과는 입력과 일관된 포맷으로 표시되어야 하며, 오류 시 사용자가 복구 가능한 경로(입력 수정/홈)를 제공한다.
- Data: `SimulationResult`, `SimulationInput`
- API: 없음
- Requirements:
  - AC-1 [E]: Scenario: 결과 카드 3장 표시
    - Given `/result`에 `location.state = { input, source: 'input' }`로 진입했고 광고 게이트가 완료됐을 때
    - When 결과가 렌더링될 때
    - Then 전세/월세/매매 각각에 대한 `ListRow`(또는 카드 섹션)가 총 `3`개 표시됨
    - And 각 카드에는 `"N년 후 순자산"` 텍스트가 포함되어야 함
  - AC-2 [E]: Scenario: 추천 뱃지 표시
    - Given 시뮬레이션 결과 `recommendedOption = 'JEONSE'`일 때
    - When 결과가 렌더링될 때
    - Then 전세 카드에만 `Chip` 텍스트 `"추천"`이 표시됨
    - And 월세/매매 카드에는 `"추천"` Chip이 표시되지 않음
  - AC-3 [E]: Scenario: 인사이트 1줄 표시
    - Given 시뮬레이션 결과 `insightCopy = "집값상승률을 1%p 올리면 10년 후 순자산이 8,000,000원 변합니다"`일 때
    - When 결과가 렌더링될 때
    - Then `Typography`로 위 인사이트 문구가 그대로 표시됨
  - AC-4 [E]: Scenario: 비용 분석표 5행 표시
    - Given 시뮬레이션 결과 `costBreakdownTable` 길이가 `5`일 때
    - When 결과가 렌더링될 때
    - Then 비용표는 `ListRow`로 `5`행이 렌더링되어야 함
    - And 각 행에는 label과 전세/월세/매매 값이 모두 표시되어야 함
  - AC-5 [S]: Scenario: 결과 진입 state 없음(빈 상태) 처리
    - Given 사용자가 주소창/라우터로 `/result`에 직접 진입해 `location.state`가 `undefined`일 때
    - When 화면이 렌더링될 때
    - Then `"결과를 표시할 수 없어요"` 텍스트가 표시됨
    - And `"홈으로"` `Button`이 표시되며 탭 시 `navigate('/')`가 호출됨
  - AC-6 [W]: Scenario: 공유 쿼리 파싱 실패 처리
    - Given `/result?s=!!!`로 진입했고 `s`를 디코딩/검증할 때 예외가 발생하거나 `ShareDecodeError`가 반환될 때
    - When 화면이 렌더링될 때
    - Then `Toast`로 `"공유 링크가 올바르지 않아요"`가 `1`회 표시되어야 함
    - And `navigate('/')`가 호출되어 홈으로 이동해야 함
  - **AC-7 [W]: Scenario: 시뮬레이션 결과가 INVALID_INPUT인 경우 복구 경로 제공 (추가)**
    - Given `/result`가 `location.state.input`으로 계산을 시도했을 때 `simulate(input)` 결과가 `{ ok:false, error:'INVALID_INPUT' }`일 때
    - When 화면이 렌더링될 때
    - Then `Dialog`로 `"계산할 수 없는 입력값이 있어요"`가 표시되어야 함
    - And `Dialog`에 `"입력 수정"` 버튼이 표시되며 탭 시 `navigate('/input', { state: { input } })`가 1회 호출되어야 함
    - And 위 조건을 하나라도 만족하지 못하면 **FAIL**

---

### F5. 공통 설정 즉시 재계산(결과 화면 내)
- Description: 결과 화면에서 공통 설정(투자수익률/집값상승률/거주기간 등)을 변경하면 결과/인사이트/차트/표가 즉시 재계산되어 반영된다. 보상형 광고는 최초 결과 공개 시점에만 적용하고, 이후 재계산에는 적용하지 않는다.
- Data: `SimulationInput`, `SimulationResult`
- API: 없음
- Requirements:
  - AC-1 [E]: Scenario: 집값상승률 변경 후 즉시 재계산
    - Given 결과 화면에서 광고 게이트가 완료되어 결과가 표시 중일 때
    - When 집값상승률 `TextField` 값을 `2`에서 `3`으로 변경하고 `"적용"` 버튼을 탭할 때
    - Then `simulate()`가 1회 호출되어야 함
    - And 결과 카드의 최종 순자산 표시 값(전세/월세/매매 중 최소 1개)은 이전 렌더 값과 달라야 함
  - AC-2 [E]: Scenario: 투자수익률 변경 후 인사이트 문구 갱신
    - Given 결과 화면에서 현재 `insightCopy`가 `"집값상승률을 1%p 올리면 10년 후 순자산이 8,000,000원 변합니다"`일 때
    - When 투자수익률을 `5`에서 `7`로 변경하고 `"적용"`을 탭할 때
    - Then `insightCopy` 텍스트는 이전 문자열과 달라야 함
  - AC-3 [W]: Scenario: 잘못된 퍼센트 입력 거부(결과 화면)
    - Given 결과 화면에서 광고 게이트가 완료되어 결과가 표시 중일 때
    - When 투자수익률 `TextField`에 `-1`을 입력하고 `"적용"`을 탭할 때
    - Then 해당 필드 하단에 `"투자수익률은 0~30%만 입력할 수 있어요"`가 표시됨
    - And `simulate()`는 호출되지 않아야 함
  - AC-4 [W]: Scenario: 거주기간 변경 시 기존 결과 배열 길이 불일치 방지
    - Given 결과 화면에서 `residencePeriodYears = 10`으로 결과가 표시 중일 때
    - When 거주기간을 `12`로 변경하고 `"적용"`을 탭할 때
    - Then 새 결과의 `netWorthByYear.jeonse.length`는 `13`이어야 함
    - And 차트는 13개 포인트로 다시 렌더링되어야 함
  - AC-5 [S]: Scenario: 재계산 로딩 상태
    - Given 결과 화면에서 `"적용"`을 탭해 재계산이 시작됐을 때
    - While `isCalculating = true`일 때
    - Then `"계산 중..."` 텍스트가 표시되어야 함
  - AC-6 [U]: Scenario: 재계산은 보상형 광고를 재노출하지 않음
    - Given 광고 게이트가 완료된 상태일 때
    - When `"적용"` 버튼을 3회 연속 탭해 재계산을 수행할 때
    - Then `TossRewardAd`는 추가로 표시되지 않아야 함
  - **AC-7 [W]: Scenario: 재계산 결과가 INVALID_INPUT이면 기존 결과 유지 + 에러 안내 (추가)**
    - Given 결과 화면에서 기존 결과가 이미 표시 중일 때
    - When 사용자가 값을 변경 후 `"적용"`을 탭했고 `simulate(nextInput)` 결과가 `{ ok:false, error:'INVALID_INPUT' }`일 때
    - Then `Toast`로 `"입력값을 확인해 주세요"`가 **300ms 이내** 1회 표시되어야 함
    - And 화면의 결과 카드 최종 순자산 표시는 탭 이전 값과 **동일**해야 함(기존 결과 유지)
    - And 위 조건을 하나라도 만족하지 못하면 **FAIL**

---

### F6. 히스토리(최근 5개) 저장/로드/삭제
- Description: 사용자가 결과를 생성하면 입력값을 히스토리에 저장하고, 최대 5개까지만 유지한다(초과 시 오래된 항목 제거). 히스토리 화면에서 항목 탭으로 입력 화면에 재진입할 수 있고, 전체 삭제를 지원한다.
- Data: `HistoryEntry[] (rentcheck.history.v1)`, `SimulationInput`
- API: 없음
- Requirements:
  - AC-1 [E]: Scenario: 결과 생성 시 히스토리 1개 저장
    - Given localStorage `rentcheck.history.v1`가 `[]`일 때
    - When 사용자가 `/input`에서 유효한 입력으로 `/result` 진입 후 광고 게이트를 완료했을 때
    - Then localStorage `rentcheck.history.v1`는 길이 `1`의 배열이어야 함
    - And 저장된 첫 항목의 `input.residencePeriodYears`는 사용자가 입력한 값(예: `10`)과 동일해야 함
  - AC-2 [E]: Scenario: 히스토리 6개 저장 시 5개로 유지(오래된 것 제거)
    - Given localStorage `rentcheck.history.v1`에 `HistoryEntry`가 5개 있고, 각 항목의 `createdAt`이 모두 유효한 ISO8601 문자열일 때
    - When 새로운 결과가 1회 더 저장될 때
    - Then localStorage `rentcheck.history.v1`는 길이 `5`의 배열이어야 함
    - And 저장된 배열에는 **방금 저장된 항목(id 기준)**이 반드시 포함되어야 함
    - And 저장된 배열에는 저장 직전 5개 중 `createdAt`이 가장 오래된 1개가 포함되지 않아야 함
  - AC-3 [W]: Scenario: localStorage setItem 실패(QuotaExceededError) 시 크래시 방지
    - Given 히스토리 저장 시점에 `localStorage.setItem`이 `QuotaExceededError`(또는 동등 예외)를 throw할 때
    - When 결과 저장 로직이 수행될 때
    - Then 앱은 크래시되지 않아야 함
    - And Toast `"저장 공간이 부족해 기록을 저장하지 못했어요"`가 300ms 이내 1회 표시되어야 함
  - AC-4 [E]: Scenario: 히스토리 화면 전체 삭제
    - Given localStorage `rentcheck.history.v1`에 `HistoryEntry`가 1개 이상 있을 때
    - When 사용자가 히스토리 화면(`/history`)에서 “전체 삭제”를 확인 Dialog에서 “삭제”로 확정할 때
    - Then localStorage `rentcheck.history.v1`가 `[]`로 저장되어야 함
    - And 화면에 `"저장된 기록이 없어요"` 텍스트가 표시되어야 함
  - **AC-5 [W]: Scenario: 히스토리 상한(5개) 저장 정책이 위반되지 않음 (추가)**
    - Given localStorage `rentcheck.history.v1`에 `HistoryEntry`가 정확히 5개 있을 때
    - When 새로운 결과 저장이 완료될 때
    - Then localStorage `rentcheck.history.v1` 배열 길이는 **정확히 5**여야 함(초과/미만이면 FAIL)
    - And index 0의 항목은 새로 저장된 항목이어야 함(아니면 FAIL)
```
