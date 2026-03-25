# SPEC

## Common Principles

- **플랫폼/기술 고정값**
  - 클라이언트: Vite + React + TypeScript
  - UI: `@toss/tds-mobile` 컴포넌트만 사용(여백은 TDS 기본 padding 또는 `Spacing`만 사용)
  - 라우팅: `react-router-dom`
  - 저장소: `localStorage` (총 5MB 이내)
  - 인증/광고/결제: 템플릿 제공 훅/컴포넌트(`useTossLogin`, `useTossAd`, `useTossPayment`, `AdSlot`, `TossRewardAd`) 그대로 사용

- **MVP 범위 원칙**
  - 모든 계산은 **클라이언트 순수 함수**로 수행(서버 없음)
  - “전세/월세/매매”를 **동일 입력(공통 가정) 기준으로 N년 후 순자산** 비교
  - **고급 기능(다중 시나리오 동시 비교, 실거래가 조회, 세금 정밀계산)**은 제외

- **UI/모바일 원칙**
  - 모든 인터랙티브 요소는 **터치 타깃 44px 이상**(TDS `Button`, `ListRow`, `Chip` 활용)
  - 모든 입력 폼은 모바일 키보드 대응:
    - 숫자 입력 `inputMode="numeric"` 및 `enterKeyHint` 지정
    - 포커스 시 입력 필드가 키보드에 가려지지 않도록 `scrollIntoView({ block: "center" })` 수행
  - 리스트 스크롤:
    - 프리셋은 고정 4개(가상 스크롤 불필요)
    - 히스토리는 최대 5개(가상 스크롤 불필요), 화면은 일반 스크롤

- **광고/결제 원칙**
  - 배너 광고: 결과 화면 하단 섹션 사이(콘텐츠 **겹침 금지**)
  - 보상형 광고: “분석/추천/상세 결과” 성격의 **상세 비용 분석표**만 게이팅(전체 화면/기본 요약 게이팅 금지)
  - 결제(프리미엄): 보상형 광고 없이 상세 비용 분석표 열람 + **거주기간 상한 확장**
    - 무료: `residenceYears` 최대 **10년**
    - 프리미엄: `residenceYears` 최대 **20년**
    - **보상형 광고 시청은 거주기간 상한을 확장하지 않는다(프리미엄 전용).**

- **검수/컴플라이언스 원칙**
  - 외부 도메인 이탈 금지: `window.location.href`, `window.open` 직접 호출 금지(공유는 URL 복사/OS 공유 시트만)
  - 프로덕션 빌드에서 `console.error` 출력 0개
  - 외부 API 호출 없음(따라서 CORS 이슈 없음)
  - Android 7+, iOS 16+ 호환: 최신 전용 API(예: `navigation.transition`, `viewTransition`) 사용 금지

---

## Toss SDK Integrations — App-side Contracts (No Server)

> 본 섹션은 “서버 엔드포인트”가 아닌, **템플릿 제공 훅/컴포넌트를 앱에서 어떻게 호출/처리할지**에 대한 **앱 내부 계약(타입/상태/실패 코드)**이다. 실제 네트워크 호출은 Toss SDK 내부에서 수행될 수 있으나, MVP는 별도 서버를 두지 않는다.

### 1) Authentication — `useTossLogin` (계약)

- **사용 목적**
  - 로그인 상태(사용자 식별자 확보)
  - 프리미엄 권한(`Entitlement.ownerUserId`)과의 소유자 매칭

- **앱 내부에서 기대하는 최소 사용자 타입**
```ts
export type TossUser = {
  userId: string; // 앱에서 권한 소유자 매칭에 사용하는 최소 식별자
} & Record<string, unknown>;
```

- **앱 내부 어댑터 계약(권장)**
```ts
export type TossAuthErrorCode =
  | "BAD_REQUEST"       // 입력/환경 문제에 준하는 상태(400 성격)
  | "UNAUTHORIZED"      // 인증 실패(401 성격)
  | "NOT_FOUND"         // 사용자 정보 누락 등(404 성격)
  | "USER_CANCELLED"    // 사용자가 로그인 플로우 취소
  | "NETWORK_ERROR"
  | "SDK_ERROR"
  | "UNKNOWN";

export type TossAuthResult =
  | { ok: true; user: TossUser }
  | { ok: false; code: TossAuthErrorCode; message: string };

export interface TossLoginAdapter {
  login: () => Promise<TossAuthResult>;
  logout: () => Promise<{ ok: true } | { ok: false; code: "SDK_ERROR" | "UNKNOWN"; message: string }>;
  getCurrentUser: () => TossUser | null;
}
```

- **실패 상태 처리 규칙**
  - `USER_CANCELLED` → `Toast`: “로그인이 취소됐어요”
  - `UNAUTHORIZED`/`SDK_ERROR`/`NETWORK_ERROR`/기타 → `Dialog` 제목 “로그인에 실패했어요”, 본문 “잠시 후 다시 시도해주세요”

---

### 2) Payments — `useTossPayment` (계약)

- **사용 목적**
  - 프리미엄 구매(상세 비용 분석 광고 제거 + 거주기간 상한 확장)

- **앱 내부 결제 요청 타입**
```ts
export type PaymentRequest = {
  orderId: string;      // uuid
  orderName: string;    // 예: "RentCheck 프리미엄"
  amount: number;       // 원 단위 정수, > 0
};

export type PaymentFailCode =
  | "BAD_REQUEST"      // (400 성격) 파라미터 누락/금액 0 등
  | "UNAUTHORIZED"     // (401 성격) 로그인 세션 무효/권한 문제
  | "NOT_FOUND"        // (404 성격) 결제 수단/주문 리소스 없음에 준하는 상태
  | "CANCELLED"        // 사용자 취소
  | "NETWORK_ERROR"
  | "SDK_ERROR"
  | "UNKNOWN";

export type PaymentSuccess = {
  paymentKey: string;   // SDK가 제공하는 결제 식별자(앱은 로깅/표시하지 않음)
  approvedAt: number;   // Date.now() 기준 저장용 타임스탬프(앱에서 세팅)
};

export type PaymentResult =
  | { status: "success"; data: PaymentSuccess }
  | { status: "cancel"; code: "CANCELLED"; message: string }
  | { status: "fail"; code: Exclude<PaymentFailCode, "CANCELLED">; message: string };

export interface TossPaymentAdapter {
  requestPayment: (req: PaymentRequest) => Promise<PaymentResult>;
}
```

- **실패 상태 처리 규칙**
  - `cancel` → `Toast`: “결제가 취소됐어요”
  - `fail` → `Dialog` 제목 “결제에 실패했어요”, 본문 “잠시 후 다시 시도해주세요”

---

### 3) Ads — `useTossAd` + `AdSlot` + `TossRewardAd` (계약)

- **배너 광고(AdSlot)**
  - 계약: `AdSlot` 컴포넌트를 결과 화면의 “상세 비용 분석 섹션 아래”에 렌더링한다.
  - 실패 상태: 로드 실패 시에도 **레이아웃이 깨지지 않고**, 콘텐츠를 overlay 하지 않는다(빈 영역 또는 SDK 기본 fallback 허용).

- **보상형 광고(TossRewardAd)**
  - 계약: “상세 비용 분석표” 섹션만 `TossRewardAd`로 래핑한다.
  - **보상형 광고 시청은 ‘상세 비용 분석표’ 열람만 언락하며, `residenceYears` 상한 확장은 언락하지 않는다(프리미엄 전용).**
  - 앱 내부 상태(권장)
```ts
export type RewardAdFailCode =
  | "AD_NOT_AVAILABLE"
  | "AD_LOAD_FAILED"
  | "AD_SHOW_FAILED"
  | "USER_SKIPPED"
  | "NETWORK_ERROR"
  | "SDK_ERROR"
  | "UNKNOWN";

export type RewardAdResult =
  | { ok: true; rewardedAt: number } // Date.now()
  | { ok: false; code: RewardAdFailCode; message: string };
```

- **실패 상태 처리 규칙**
  - `AD_LOAD_FAILED`/`AD_NOT_AVAILABLE`/`NETWORK_ERROR` 등 → `Toast`: “광고를 불러오지 못했어요”
  - `USER_SKIPPED` → `Toast`: “광고를 끝까지 보면 상세를 볼 수 있어요”
  - 실패 시 상세 비용 분석은 **언락되지 않는다**.

---

## StorageAdapter — localStorage “endpoint” contracts (No Server)

> 서버가 없으므로, 모든 데이터 I/O는 localStorage에 대한 **클라이언트 내부 엔드포인트**로 정의한다.  
> 각 메서드는 **명시적 입력/출력 타입**과 **실패 코드**를 가진다.

### 1) Common result / error codes

```ts
export type StorageErrorCode =
  // 입력/파라미터 계열 (400 성격)
  | "INVALID_PARAMS"
  | "VALIDATION_ERROR"

  // 리소스 계열 (404 성격)
  | "NOT_FOUND"

  // 저장소/환경 계열
  | "UNAVAILABLE"        // localStorage 미지원/차단(SecurityError 등)
  | "QUOTA_EXCEEDED"     // QuotaExceededError
  | "READ_ERROR"         // getItem 실패
  | "WRITE_ERROR"        // setItem/removeItem 실패

  // 직렬화/파싱 계열
  | "PARSE_ERROR"        // JSON.parse 실패
  | "SERIALIZE_ERROR"    // JSON.stringify 실패

  // 기타
  | "UNKNOWN";

export type StorageResult<T, C extends StorageErrorCode = StorageErrorCode> =
  | { ok: true; data: T }
  | { ok: false; code: C; message: string };
```

### 2) localStorage keys (fixed)

```ts
export const STORAGE_KEYS = {
  history: "rc_history_v1",
  settings: "rc_settings_v1",
  entitlement: "rc_entitlement_v1",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
```

### 3) Adapter interface (method signatures + allowed error codes)

```ts
export type ListHistoryParams = {
  page: number;     // >= 1
  pageSize: number; // MVP 고정: 5
};

export type HistoryListResponse = {
  items: HistoryEntry[];
  total: number;
  page: number; // 1부터 시작
};

export interface StorageAdapter {
  // ---------- Settings ----------
  getSettings: () => Promise<
    StorageResult<AppSettings, "UNAVAILABLE" | "READ_ERROR" | "PARSE_ERROR" | "UNKNOWN">
  >;

  setSettings: (next: AppSettings) => Promise<
    StorageResult<true, "UNAVAILABLE" | "SERIALIZE_ERROR" | "QUOTA_EXCEEDED" | "WRITE_ERROR" | "UNKNOWN">
  >;

  // ---------- Entitlement ----------
  getEntitlement: () => Promise<
    StorageResult<Entitlement, "UNAVAILABLE" | "READ_ERROR" | "PARSE_ERROR" | "UNKNOWN">
  >;

  setEntitlement: (next: Entitlement) => Promise<
    StorageResult<true, "UNAVAILABLE" | "SERIALIZE_ERROR" | "QUOTA_EXCEEDED" | "WRITE_ERROR" | "UNKNOWN">
  >;

  clearEntitlement: () => Promise<
    StorageResult<true, "UNAVAILABLE" | "WRITE_ERROR" | "UNKNOWN">
  >;

  // ---------- History ----------
  listHistory: (params: ListHistoryParams) => Promise<
    StorageResult<HistoryListResponse, "INVALID_PARAMS" | "UNAVAILABLE" | "READ_ERROR" | "PARSE_ERROR" | "UNKNOWN">
  >;

  getHistoryById: (id: string) => Promise<
    StorageResult<HistoryEntry, "VALIDATION_ERROR" | "NOT_FOUND" | "UNAVAILABLE" | "READ_ERROR" | "PARSE_ERROR" | "UNKNOWN">
  >;

  saveHistoryEntry: (entry: HistoryEntry) => Promise<
    StorageResult<true, "VALIDATION_ERROR" | "UNAVAILABLE" | "SERIALIZE_ERROR" | "QUOTA_EXCEEDED" | "WRITE_ERROR" | "UNKNOWN">
  >;

  deleteHistoryById: (id: string) => Promise<
    StorageResult<true, "VALIDATION_ERROR" | "NOT_FOUND" | "UNAVAILABLE" | "WRITE_ERROR" | "UNKNOWN">
  >;

  clearHistory: () => Promise<
    StorageResult<true, "UNAVAILABLE" | "WRITE_ERROR" | "UNKNOWN">
  >;
}
```

### 4) Storage behavior contracts (pass/fail 기준용)

- `getSettings`
  - 키가 없으면 **에러가 아니라** `{ hasSeenSimulationDisclaimer: false, createdAt: 0, updatedAt: 0 }` 같은 “기본값”을 `ok: true`로 반환한다.
- `getEntitlement`
  - 키가 없으면 **에러가 아니라** 기본값 `{ isPremium:false, premiumSince:null, ownerUserId:null, maxResidenceYears:10, ... }`을 `ok: true`로 반환한다.
- `listHistory`
  - **정렬:** 최신순(가장 최근 `createdAt`이 앞)
  - **페이지 계약:** “History Pagination Contract” 섹션과 동일
- `saveHistoryEntry`
  - 저장 후 localStorage의 `rc_history_v1`는 **최대 5개**를 유지한다.
  - 6개째 저장 시 가장 오래된 1개(= `createdAt`이 가장 작은 항목 1개)를 제거한 뒤 저장한다.
  - 위 eviction이 발생하더라도 연산 결과는 **항상** `ok:true, data:true`를 반환한다(Quota/Write 오류 등 제외).
- `deleteHistoryById`
  - 해당 id가 없으면 `ok:false, code:"NOT_FOUND"`를 반환한다.

---

## Relationship & Cascade Rules (localStorage / in-memory)

- **HistoryEntry.input**
  - 관계 유형: **embedded-by-value (스냅샷 저장)**
  - 저장 시점 규칙: `/result` 진입(계산 시작) 시 `SimulationInput`을 **깊은 복사 스냅샷**으로 저장
  - Cascade:
    - 프리셋 변경/삭제/기본값 변경이 과거 `HistoryEntry`에 **영향을 주지 않는다**.
    - 히스토리 삭제 시 `HistoryEntry` 단위로만 삭제(내부 input/result는 함께 제거)

- **SimulationInput.presetId → PresetScenario.id**
  - 관계 유형: **referenced-by-key (옵션 참조)**
  - 동작 규칙:
    - `presetId`는 “라벨 표시/출처” 용도이며, 계산에는 **현재 input 값**만 사용
    - 프리셋이 코드에서 제거되어도, `presetId`가 매칭되지 않으면 UI 라벨은 “직접 입력”으로 표시한다
    - 프리셋 `defaultInput`이 변경되어도 기존 공유 링크/히스토리는 **변경되지 않는다**

- **Entitlement ↔ TossUser**
  - 관계 유형: **referenced-by-key**
  - 규칙:
    - `Entitlement.ownerUserId`가 현재 로그인 유저의 `userId`와 다르면, 앱은 `isPremium=false`로 간주하고(권한 미적용), 결제 재유도를 한다.
    - 서버가 없으므로 **디바이스/브라우저 간 권한 동기화는 지원하지 않는다**.
  - **Cascade (명시)**
    - **로그아웃 시:** `rc_entitlement_v1` 레코드는 **삭제하지 않고 유지**한다(재로그인 시 동일 userId면 재적용 가능).
    - **ownerUserId 변경(다른 계정 로그인) 시:** 레코드를 변경/마이그레이션하지 않는다. 단, “현재 userId와 불일치”이면 **프리미엄 미적용**이다.
    - **만료(expiry):** MVP는 만료 개념이 없다(자동 만료/삭제 없음).
    - **clearEntitlement 호출 시:** `rc_entitlement_v1`만 제거되며, **히스토리(`rc_history_v1`)는 삭제/변경되지 않는다(비-cascade).**

- **SharePayload ↔ SimulationInput**
  - 관계 유형: **embedded-by-value (스냅샷)**
  - 규칙:
    - 공유 링크는 생성 시점의 `SimulationInput`을 그대로 포함하며, 이후 앱 버전/프리셋 변경으로 역변환 정책을 두지 않는다(버전 불일치 시 차단).

- **HistoryEntry.id 생성 규칙 (명시)**
  - 생성 전략: `uuid` 문자열
  - 구현 권장: `crypto.randomUUID()`가 존재하면 사용, 없으면 앱 내 uuid 생성 유틸(예: 난수 기반) 사용
  - 충돌 처리: 같은 `id`가 이미 존재할 경우(비정상 케이스) `saveHistoryEntry`는 `VALIDATION_ERROR`로 실패 처리한다.

---

## Screen Definitions

#### S1. 홈(프리셋 선택)
- Route: `/`
- TDS 컴포넌트
  - `AppBar` (타이틀: “RentCheck”)
  - 프리셋 카드 리스트: `ListRow`(4개) + `Typography`
  - 하단 CTA: `Button` (“직접 입력하기”), `Spacing`
- 상태
  - Loading: localStorage에서 설정/프리미엄 상태 로딩 중이면 `Typography`로 “불러오는 중...” 표시
  - Error: 프리셋 렌더링 실패 시 `Dialog`로 “화면을 불러오지 못했어요”
- 터치 인터랙션
  - 각 프리셋 `ListRow` 전체 탭(>=44px)
  - “직접 입력하기” 버튼 탭

**S1 Acceptance Criteria (EARS, 최소 4개 + 실패 2개 이상)**
- AC-S1-1 [U]
  - WHEN 홈(`/`)이 최초 렌더링될 때 THEN `ListRow`가 정확히 4개 렌더링되고, 각 행에 프리셋 `name`이 `Typography`로 1개 이상 표시된다.
- AC-S1-2 [E]
  - WHEN 사용자가 프리셋 `ListRow`를 탭할 때 THEN 라우트가 `/result`로 변경되고, navigation state 또는 동일 효과의 전달로 `SimulationInput.presetId`가 해당 프리셋 `id`로 세팅된 상태로 계산을 시작한다.
- AC-S1-3 [E]
  - WHEN 사용자가 “직접 입력하기” `Button`을 탭할 때 THEN 라우트가 `/input`으로 변경된다.
- AC-S1-4 [S]
  - WHILE `StorageAdapter.getEntitlement()` 또는 초기 hydrate가 완료되지 않았을 때 THEN `Typography`로 정확히 “불러오는 중...”이 표시된다.
- AC-S1-5 [W]
  - WHEN 프리셋 데이터가 4개가 아니거나(길이 ≠ 4) 렌더 중 예외가 발생할 때 THEN `Dialog` 본문에 정확히 “프리셋을 불러오지 못했어요”가 포함되어 표시되고, 확인 `Button`을 탭하면 라우트가 `/input`으로 변경된다.
- AC-S1-6 [W]
  - WHEN 프리셋 탭 처리 중 예외가 발생할 때 THEN `Toast`로 정확히 “이동에 실패했어요”가 표시되고, 라우트는 `/`로 유지된다.

---

#### S2. 입력(3탭 + 공통 설정)
- Route: `/input`
- TDS 컴포넌트
  - `AppBar` (뒤로가기)
  - `TabBar` (전세/월세/매매)
  - 입력: `TextField`(숫자/퍼센트), `Chip`(상환방식), `Typography`, `Spacing`
  - 제출: `Button` (“결과 보기”)
  - 안내: `Dialog`(검증 에러), `Toast`(저장/초기화)
- 상태
  - Loading: 공유 파라미터/히스토리로부터 입력값 hydrate 중 “불러오는 중...”
  - Empty: 초기 진입 시 기본값(0 또는 합리적 최소값)으로 폼 표시
  - Error: 잘못된 쿼리/히스토리 id면 `Dialog` “입력값을 불러올 수 없어요”
- 키보드/입력
  - 숫자 필드 `inputMode="numeric"`, 퍼센트도 숫자 키패드
  - 포커스 시 `scrollIntoView`
- 터치
  - 탭 전환 `TabBar` 항목(>=44px)
  - 제출 버튼(>=44px)

**S2 Acceptance Criteria (EARS, 최소 4개 + 실패 2개 이상)**
- AC-S2-1 [U]
  - WHEN `/input` 화면의 금액/퍼센트 `TextField`가 렌더링될 때 THEN `inputMode="numeric"` 속성을 가진다.
- AC-S2-2 [E]
  - WHEN 사용자가 `TabBar`에서 “월세” 탭을 탭할 때 THEN “월세” 입력 그룹(예: `monthlyRent`)이 화면에 표시된다.
- AC-S2-3 [E]
  - WHEN 사용자가 유효한 `SimulationInput`으로 “결과 보기”를 탭할 때 THEN 라우트가 `/result`로 변경되고, 전달된 입력값으로 계산이 시작된다.
- AC-S2-4 [S]
  - WHILE 공유 파라미터 디코딩 또는 hydrate가 진행 중일 때 THEN `Typography`로 정확히 “불러오는 중...”이 표시된다.
- AC-S2-5 [W]
  - WHEN `residenceYears`가 `0`이고 “결과 보기”를 탭할 때 THEN `TextField` 하단 에러로 정확히 “거주기간은 1년 이상이어야 해요”가 표시되고, 라우트는 `/input`으로 유지된다.
- AC-S2-6 [W]
  - WHEN 공유 파라미터가 base64/JSON 디코딩에 실패할 때 THEN `Dialog` 본문에 정확히 “입력값을 불러올 수 없어요”가 표시되고, 확인 탭 시 `/input` 기본 폼 상태로 남는다.

---

#### S3. 결과(요약 + 차트 + 인사이트 + 상세 비용)
- Route: `/result`
- 진입 방식: navigation state로 `SimulationInput` 전달 또는 URL query(`?s=`)로 복원
- TDS 컴포넌트
  - `AppBar` (공유 아이콘 버튼은 `Button` 변형 또는 `ListRow` 액션)
  - 요약 카드: `ListRow` 3개(전세/월세/매매) + `Typography` + `Chip`(추천 뱃지)
  - 인사이트: `Typography`
  - 차트 섹션: `Typography` + (커스텀 `svg`/`div` 레이아웃만 사용, 여백은 `Spacing`)
  - 상세 비용 분석:
    - 잠금 상태: `Button`(“광고 보고 상세 보기”), `Button`(“프리미엄 구매”)
    - 언락 상태: `ListRow` 반복(항목별 비용/자산)
    - 보상형 광고: `TossRewardAd`로 섹션 래핑
  - 광고: `AdSlot` (결과 하단, 상세 비용 섹션 아래)
  - 피드백: `Toast`, `Dialog`, `BottomSheet`(조건 수정)
- 상태
  - Loading: 계산 중 `Typography` “계산 중...” + 버튼 disabled
  - Empty: 입력값이 모두 0 등으로 계산 불가 시 “입력값을 확인해주세요”
  - Error: 공유 디코딩 실패/입력 검증 실패 시 `Dialog`
- 터치
  - “조건 수정” 버튼 → `BottomSheet`
  - 차트 포인트 탭(>=44px): 해당 연도 값 `BottomSheet`로 표시

**S3 Acceptance Criteria (EARS, 최소 4개 + 실패 2개 이상)**
- AC-S3-1 [S]
  - WHILE 입력값 hydrate 또는 계산이 완료되지 않았을 때 THEN `Typography`로 정확히 “계산 중...”이 표시되고, 공유 `Button`은 `disabled=true`이다.
- AC-S3-2 [U]
  - WHEN 계산이 완료된 상태로 화면이 렌더링될 때 THEN 전세/월세/매매 요약 `ListRow`가 정확히 3개 표시된다.
- AC-S3-3 [E]
  - WHEN 사용자가 “조건 수정”을 탭하고 `BottomSheet`에서 공통 설정을 변경 후 “적용”을 탭할 때 THEN 화면의 최종 순자산 숫자(3개 중 최소 1개)가 변경된다.
- AC-S3-4 [E]
  - WHEN `rc_entitlement_v1.isPremium=false`에서 사용자가 “광고 보고 상세 보기”를 탭하고 보상형 광고가 `ok:true`로 완료될 때 THEN 상세 비용 분석 `ListRow`가 최소 3개 이상 표시된다.
- AC-S3-5 [W]
  - WHEN `/result` 진입 시 입력값이 navigation state에도 없고 URL 쿼리에도 없을 때 THEN `Dialog` 본문에 정확히 “결과를 불러올 수 없어요”가 표시되고, 확인 `Button` 탭 시 `/`로 이동한다.
- AC-S3-6 [W]
  - WHEN 보상형 광고가 `AD_LOAD_FAILED` 또는 `AD_SHOW_FAILED`로 종료될 때 THEN `Toast`로 정확히 “광고를 불러오지 못했어요”가 표시되고, 상세 비용 분석 `ListRow`는 0개 표시된다(언락 금지).

---

#### S4. 히스토리(최근 5개)
- Route: `/history`
- TDS 컴포넌트
  - `AppBar`
  - `ListRow` 목록(최대 5개)
  - Empty: `Typography` + `Button`(“시뮬레이션 하러 가기”)
  - `Dialog`(삭제 확인), `Toast`
- 상태
  - Loading: localStorage 로딩 “불러오는 중...”
  - Empty: 저장 기록 0개
  - Error: 파싱 실패 시 `Dialog` “기록을 불러오지 못했어요”
- 터치
  - 항목 탭 → `/result`로 재실행(>=44px)
  - “전체 삭제” 버튼(>=44px)

**S4 Acceptance Criteria (EARS, 최소 4개 + 실패 2개 이상)**
- AC-S4-1 [S]
  - WHILE `StorageAdapter.listHistory({ page:1, pageSize:5 })`가 완료되지 않았을 때 THEN `Typography`로 정확히 “불러오는 중...”이 표시된다.
- AC-S4-2 [U]
  - WHEN 히스토리가 1개 이상일 때 THEN 최신순으로 최대 5개의 `ListRow`가 표시된다.
- AC-S4-3 [E]
  - WHEN 사용자가 히스토리의 첫 번째 `ListRow`를 탭할 때 THEN 라우트가 `/result`로 변경되고, 해당 항목의 `input`과 동일한 값으로 계산한다.
- AC-S4-4 [E]
  - WHEN 사용자가 “전체 삭제”를 탭하고 확인 `Dialog`에서 확인을 탭할 때 THEN localStorage `rc_history_v1`는 `"[]"`로 저장되고, 화면에는 Empty 상태 문구가 표시된다.
- AC-S4-5 [W]
  - WHEN `rc_history_v1`가 JSON 파싱 불가능한 문자열일 때 THEN `Dialog` 본문에 정확히 “기록을 불러오지 못했어요”가 표시되고, 확인 탭 시 `rc_history_v1`는 `"[]"`로 초기화된다.
- AC-S4-6 [W]
  - WHEN 히스토리 항목을 삭제하려는데 대상 `id`가 존재하지 않을 때 THEN `StorageAdapter.deleteHistoryById`는 `ok:false, code:"NOT_FOUND"`를 반환하고, UI는 `Toast`로 정확히 “기록을 찾을 수 없어요”를 표시한다.

---

## Data Models

> 모든 엔티티는 로컬 저장/감사(audit)/동기화 대비를 위해 `createdAt`, `updatedAt`(밀리초, `Date.now()`)를 포함한다.  
> **불변(immutable) 스냅샷**의 경우 `updatedAt === createdAt`으로 저장한다.

### PresetScenario — fields, types, constraints
```ts
export interface PresetScenario {
  id: string;            // e.g. "preset-1"
  name: string;          // 카드 타이틀
  defaultInput: SimulationInput;

  createdAt: number;     // 코드 상수: 빌드 시점 또는 0 허용
  updatedAt: number;     // 코드 상수: createdAt과 동일 또는 0 허용
}
```
- Constraints
  - `id`는 앱 내 유일
  - 프리셋은 코드 상수로 제공(저장 불필요)

### SimulationInput — fields, types, constraints (완성)
```ts
export type BuyRepaymentType = "AMORTIZED"; // MVP: 원리금균등만

export interface SimulationInput {
  id: string; // uuid. 공유/히스토리 스냅샷의 입력 식별자

  /**
   * PresetScenario.id를 참조하거나(null) 직접 입력
   * - 참조 무결성 강제 없음: 프리셋이 앱에서 제거되어도 과거 스냅샷은 유지
   */
  presetId: string | null;

  // 전세
  jeonseDeposit: number;        // >= 0, 원(정수)
  jeonseLoanRatio: number;      // 0~100, %(정수 권장)
  jeonseInterestRate: number;   // 0~30, %(소수 허용)

  // 월세
  monthlyDeposit: number;             // >= 0, 원(정수)
  monthlyRent: number;                // >= 0, 원/월(정수)
  monthlyRentIncreaseRate: number;    // 0~30, %/년(소수 허용)

  // 매매
  buyPrice: number;             // >= 0, 원(정수)
  buyEquity: number;            // >= 0, 원(정수) (자기자본)
  buyLoanRate: number;          // 0~30, %/년(소수 허용)
  buyLoanPeriodYears: number;   // 1~40, 년(정수)
  buyRepaymentType: BuyRepaymentType;

  // 공통
  initialAsset: number;           // >= 0, 원(정수)
  residenceYears: number;         // free: 1~10, premium: 1~20 (정수)
  investmentReturnRate: number;   // 0~30, %/년(소수 허용)
  housePriceGrowthRate: number;   // -10~30, %/년(소수 허용)

  createdAt: number;              // 입력 생성 시점(예: 제출/공유 생성 시)
  updatedAt: number;              // 입력 수정 시점(폼 수정/조건 수정 적용 시)
}
```
- Constraints (검증 메시지에서 사용)
  - `id`는 비어있지 않은 문자열
  - `residenceYears`는 정수
  - 금액은 정수(원 단위), 음수 금지
  - 숫자 필드에 `NaN`, `Infinity` 금지(검증 실패)

### SimulationResult — fields, types, constraints
```ts
export type OptionKey = "jeonse" | "monthly" | "buy";

export interface SimulationResult {
  netWorthByYear: {
    jeonse: number[];  // length = residenceYears + 1 (0년~N년)
    monthly: number[];
    buy: number[];
  };
  finalNetWorth: Record<OptionKey, number>;
  recommendedOption: OptionKey;
  diffFromBest: Record<OptionKey, number>; // best는 0, 나머지는 음수 또는 0
  insightCopy: string;
  costBreakdown: {
    jeonse: Record<string, number>;
    monthly: Record<string, number>;
    buy: Record<string, number>;
  };

  createdAt: number;  // 결과 계산 완료 시점
  updatedAt: number;  // 조건 수정으로 재계산 완료 시점
}
```
- Constraints
  - 모든 값은 원 단위 정수로 반올림하여 저장/표시

### HistoryEntry — fields, types, constraints (완성)
```ts
export interface HistoryEntry {
  id: string;         // uuid (생성 규칙은 Relationship 섹션 참고)
  createdAt: number;  // Date.now()
  updatedAt: number;  // 생성 직후는 createdAt과 동일. 라벨 재생성 시 갱신 가능
  label: string;      // "{프리셋명 또는 '직접 입력'} · 집값 {housePriceGrowthRate}% · {residenceYears}년"
  input: SimulationInput; // 스냅샷(embedded-by-value)
}
```
- Constraints
  - `label`은 빈 문자열 금지
  - `input.updatedAt`/`createdAt`은 `HistoryEntry.createdAt`보다 미래여도 허용(입력 작성 후 결과 진입 가능)

### SharePayload — fields, types, constraints (완성)
```ts
export interface SharePayload {
  id: string;       // uuid (공유 액션 1회당 1개)

  version: number;  // 1
  input: SimulationInput; // 스냅샷(embedded-by-value)

  /**
   * base64(JSON.stringify({ version, input }))
   * - URL query (?s=)로 전달되는 값
   */
  encoded: string;

  createdAt: number; // 공유 링크 생성 시점
  updatedAt: number; // 동일(불변) => createdAt과 동일
}
```
- Constraints
  - `version`은 `1`만 허용(MVP)
  - `encoded`는 빈 문자열 금지
  - 불변 스냅샷: `updatedAt === createdAt`

### AppSettings — fields, types, constraints
```ts
export interface AppSettings {
  hasSeenSimulationDisclaimer: boolean; // 시뮬레이션 고지 1회
  createdAt: number;
  updatedAt: number;
}
```

### Entitlement — fields, types, constraints (완성)
```ts
export interface Entitlement {
  id: string; // uuid. 디바이스 내 권한 레코드 식별자(서버 동기화는 하지 않음)

  isPremium: boolean;      // 결제 성공 시 true
  premiumSince: number | null;

  ownerUserId: string | null; // 로그인 유저 userId와 매칭. 불일치 시 권한 미적용

  /**
   * 거주기간 입력 상한(년)
   * - 무료: 10
   * - 프리미엄: 20
   * - 보상형 광고로는 변경되지 않음
   */
  maxResidenceYears: number;

  createdAt: number;
  updatedAt: number;
}
```
- Constraints
  - `isPremium=true`이면 `premiumSince`는 `number`여야 한다
  - `ownerUserId`는 로그인 성공 직후 또는 결제 성공 직후에만 세팅(그 외 임의 변경 금지)
  - `isPremium=false`이면 `maxResidenceYears === 10`이어야 한다
  - `isPremium=true`이면 `maxResidenceYears === 20`이어야 한다
  - 만료 필드 없음(MVP는 만료 없음)

### localStorage keys, shapes, size estimation
- `rc_history_v1`
  - Shape: `HistoryEntry[]` (최대 5개)
  - Est.: 입력 1개당 ~1.0KB 내외, 5개 ~5KB
- `rc_settings_v1`
  - Shape: `AppSettings`
  - Est.: <0.3KB
- `rc_entitlement_v1`
  - Shape: `Entitlement`
  - Est.: <0.3KB
- 총합 추정: **<10KB** (5MB 제한 대비 충분)

---

## History Pagination Contract (Forward-compatible, even for max-5 MVP)

> MVP는 localStorage에 최대 5개만 저장하지만, 리스트 읽기 계약을 고정하여 향후 확장 시에도 모호함이 없도록 한다.

```ts
export type HistoryListResponse = {
  items: HistoryEntry[];
  total: number;
  page: number; // 1부터 시작
};

export type ListHistoryParams = {
  page: number;     // >= 1
  pageSize: number; // MVP 고정: 5
};
```

- **동작 규칙**
  - `page`는 1부터 시작하며, `page < 1`이면 `ok:false, code:"INVALID_PARAMS"`를 반환한다.
  - `pageSize`는 MVP에서 **항상 5로 고정**이며, `pageSize !== 5`이면 `ok:false, code:"INVALID_PARAMS"`를 반환한다.
  - `total`은 localStorage에 저장된 전체 히스토리 개수(0~5)
  - `items`는 최신순 정렬(최근이 앞)
  - 페이지 범위:
    - `total === 0`이면 모든 `page >= 1` 요청에 대해 `{ ok:true, data:{ items:[], total:0, page:<요청값> } }`
    - `total > 0`이고 `page > ceil(total / pageSize)`이면 `{ ok:true, data:{ items:[], total, page:<요청값> } }`
  - MVP(max 5)에서는 결과적으로 `page=1`만 items가 존재할 수 있으며, `page > 1`이면 `items=[]`, `total`은 유지, `page`는 요청값 그대로 반환

---

## Feature List

### F1. 프리셋 시나리오 선택(홈) + 빠른 결과 진입
- Description: 홈에서 프리셋 4종을 카드 형태로 보여주고, 탭 한 번으로 해당 프리셋 입력값으로 결과 화면으로 이동한다. 사용자는 “직접 입력하기”로 입력 화면으로 갈 수도 있다.
- Data: `PresetScenario`(코드 상수), `HistoryEntry` 저장 트리거
- API: 없음
- Requirements:
- AC-1 [U]: Scenario: 홈에 프리셋 4개 노출
  - Given 앱이 `/` 라우트로 렌더링되었을 때
  - When 화면이 최초 표시될 때
  - Then `ListRow`가 정확히 4개 렌더링된다
  - And 각 `ListRow`에 프리셋 `name`이 `Typography`로 표시된다
- AC-2 [E]: Scenario: 프리셋 탭 시 결과 화면 이동
  - Given `PRESET_SCENARIOS`에 `{ id: "preset-1", name: "프리셋1", defaultInput: { presetId: "preset-1", jeonseDeposit: 300000000, jeonseLoanRatio: 80, jeonseInterestRate: 4, monthlyDeposit: 10000000, monthlyRent: 800000, monthlyRentIncreaseRate: 3, buyPrice: 500000000, buyEquity: 150000000, buyLoanRate: 4, buyLoanPeriodYears: 30, buyRepaymentType: "AMORTIZED", initialAsset: 50000000, residenceYears: 10, investmentReturnRate: 6, housePriceGrowthRate: 2 } }`가 존재할 때
  - When 사용자가 홈에서 “프리셋1” `ListRow`를 탭할 때
  - Then 라우트가 `/result`로 변경된다
  - And `/result`는 입력값 `presetId`가 `"preset-1"`인 상태로 계산을 시작한다
- AC-3 [E]: Scenario: 직접 입력하기로 입력 화면 이동
  - Given 사용자가 `/`에 있을 때
  - When “직접 입력하기” `Button`을 탭할 때
  - Then 라우트가 `/input`으로 변경된다
- AC-4 [S]: Scenario: 홈 로딩 상태 표시
  - Given 앱이 `rc_entitlement_v1`를 읽는 초기 상태일 때
  - While `Entitlement` hydrate가 완료되지 않았을 때
  - Then 홈 화면에 `Typography` 텍스트 “불러오는 중...”이 표시된다
- AC-5 [W]: Scenario: 프리셋 데이터 누락 방어
  - Given `PRESET_SCENARIOS` 길이가 `4`가 아닐 때
  - When 홈 화면이 렌더링될 때
  - Then `Dialog`가 표시되고 본문에 정확히 “프리셋을 불러오지 못했어요”가 포함된다
  - And 확인 `Button` 탭 시 `/input`으로 이동한다
- AC-6 [W]: Scenario: 라우팅 실패 방어
  - Given 사용자가 `/`에 있을 때
  - When 프리셋 탭 처리 중 예외가 발생할 때
  - Then `Toast`로 정확히 “이동에 실패했어요”가 표시된다
  - And 라우트는 `/`로 유지된다

---

### F2. 입력 폼(3탭 + 공통 설정) 및 검증
- Description: 전세/월세/매매 입력을 `TabBar`로 분리하고, 공통 가정(초기자산/거주기간/투자수익률/집값상승률)을 함께 입력한다. “결과 보기” 제출 시 입력값을 검증하고 결과 화면으로 이동한다.
- Data: `SimulationInput` (화면 상태), `Entitlement`(거주기간 상한)
- API: 없음
- Requirements:
- AC-1 [U]: Scenario: 숫자 입력 필드 키보드 타입
  - Given 사용자가 `/input`에 진입했을 때
  - When `jeonseDeposit` 입력 `TextField`가 렌더링될 때
  - Then 해당 입력은 `inputMode="numeric"` 속성을 가진다
  - And `monthlyRent` 입력 `TextField`도 `inputMode="numeric"` 속성을 가진다
- AC-2 [E]: Scenario: 입력 제출 성공(직접 입력)
  - Given 토스 로그인된 유저가 있을 때
  - When 입력 폼에서 `{ presetId: null, jeonseDeposit: 200000000, jeonseLoanRatio: 70, jeonseInterestRate: 4, monthlyDeposit: 10000000, monthlyRent: 700000, monthlyRentIncreaseRate: 2, buyPrice: 450000000, buyEquity: 150000000, buyLoanRate: 4, buyLoanPeriodYears: 30, buyRepaymentType: "AMORTIZED", initialAsset: 30000000, residenceYears: 10, investmentReturnRate: 6, housePriceGrowthRate: 2 }`로 “결과 보기”를 탭할 때
  - Then 라우트가 `/result`로 변경된다
  - And `/result`는 위 입력값으로 계산을 시작한다
- AC-3 [W]: Scenario: 거주기간 0년 거부
  - Given 토스 로그인된 유저가 있을 때
  - When 공통 설정에서 `residenceYears`를 `0`으로 입력하고 “결과 보기”를 탭할 때
  - Then `TextField` 하단 에러로 정확히 “거주기간은 1년 이상이어야 해요”가 표시된다
  - And 라우트는 `/input`으로 유지된다
- AC-4 [W]: Scenario: free 유저 거주기간 상한 초과 거부
  - Given `rc_entitlement_v1.isPremium`이 `false`일 때
  - When `residenceYears`를 `15`로 입력하고 “결과 보기”를 탭할 때
  - Then `Dialog` 제목이 정확히 “프리미엄이 필요해요”로 표시된다
  - And 본문에 정확히 “무료 버전은 최대 10년까지 계산할 수 있어요”가 포함된다
- AC-5 [E]: Scenario: 입력 포커스 시 스크롤로 가림 방지
  - Given 사용자가 `/input`에 있을 때
  - When 사용자가 화면 하단의 `housePriceGrowthRate` `TextField`를 탭해 포커스할 때
  - Then 해당 입력 요소에 대해 `scrollIntoView`가 1회 호출된다
- AC-6 [S]: Scenario: 입력 hydrate 로딩 상태
  - Given `/input?s=...`로 진입했고 공유 디코딩이 진행 중일 때
  - While 디코딩이 완료되지 않았을 때
  - Then `Typography`로 정확히 “불러오는 중...”이 표시된다
- AC-7 [W]: Scenario: 잘못된 숫자(음수) 거부
  - Given 토스 로그인된 유저가 있을 때
  - When `monthlyRent`를 `-1`로 입력하고 “결과 보기”를 탭할 때
  - Then `TextField` 하단 에러로 정확히 “음수는 입력할 수 없어요”가 표시된다
- AC-8 [W]: Scenario: 공유 파라미터 디코딩 실패 처리
  - Given 사용자가 `/input?s=NOT_BASE64`로 진입했을 때
  - When 화면이 최초 표시될 때
  - Then `Dialog` 본문에 정확히 “입력값을 불러올 수 없어요”가 표시된다
  - And 확인 `Button` 탭 시 `/input` 기본 폼 상태로 남는다

---

### F3. 결과 계산/표시 (계산 엔진 + 결과 화면)
- Description: 입력값을 받아 전세/월세/매매의 연도별 순자산 배열과 최종 순자산, 추천 옵션, 인사이트 문구, 비용 분석 데이터를 생성하고 결과 화면에 표시한다. 공통 설정 변경 시 결과 화면에서 즉시 재계산하여 UI에 반영한다. 상세 비용 분석표는 무료 사용자에게 보상형 광고 시청 후 언락되며, 프리미엄 사용자는 광고 없이 바로 볼 수 있다.
- Data: `SimulationInput` → `SimulationResult`, `Entitlement`
- API: 없음 (Toss SDK 훅/컴포넌트 사용은 “Integrations” 섹션 계약 준수)
- Requirements (계산 엔진):
- AC-1 [U]: Scenario: 결과 배열 길이 규칙
  - Given `SimulationInput.residenceYears`가 `10`일 때
  - When 시뮬레이션을 실행할 때
  - Then `result.netWorthByYear.jeonse.length`는 정확히 `11`이다
  - And `result.netWorthByYear.monthly.length`는 정확히 `11`이다
  - And `result.netWorthByYear.buy.length`는 정확히 `11`이다
- AC-2 [U]: Scenario: 추천 옵션 일관성
  - Given 시뮬레이션 결과가 계산되었을 때
  - When `finalNetWorth`가 `{ jeonse: 100, monthly: 200, buy: 150 }`로 평가될 때
  - Then `recommendedOption`은 정확히 `"monthly"`이다
  - And `diffFromBest.monthly`는 정확히 `0`이다
- AC-3 [E]: Scenario: 공통 설정 변경 시 즉시 재계산
  - Given 사용자가 `/result`에서 입력값 `{ investmentReturnRate: 6 }`로 결과를 보고 있을 때
  - When 조건 수정 `BottomSheet`에서 `investmentReturnRate`를 `7`로 변경하고 “적용”을 탭할 때
  - Then 화면에 표시된 인사이트 `Typography`가 변경된다
  - And 요약 카드의 최종 순자산 숫자(3개 중 최소 1개)가 변경된다
- AC-4 [S]: Scenario: 계산 중 로딩 표시
  - Given 사용자가 `/result`에서 조건을 수정하여 재계산이 시작되었을 때
  - While 계산 Promise(또는 debounce)가 완료되지 않았을 때
  - Then `Typography` 텍스트 “계산 중...”이 표시된다
  - And “공유하기” `Button`은 `disabled=true`이다
- AC-5 [W]: Scenario: 입력값 NaN 방어
  - Given `SimulationInput`에 `jeonseDeposit: NaN`이 포함될 때
  - When 시뮬레이션을 실행할 때
  - Then 함수는 예외를 throw 하지 않는다
  - And 호출자는 `Dialog`로 정확히 “입력값을 확인해주세요”를 표시한다
- AC-6 [W]: Scenario: residenceYears 과도 값 방어
  - Given `SimulationInput.residenceYears`가 `100`일 때
  - When 시뮬레이션을 실행할 때
  - Then 계산은 수행되지 않는다
  - And 오류 메시지 문자열로 정확히 “거주기간이 너무 커요”를 반환한다

- Requirements (결과 화면):
- AC-7 [U]: Scenario: 결과 요약 카드 3개 노출
  - Given `/result`에서 시뮬레이션 결과가 준비되었을 때
  - When 화면이 렌더링될 때
  - Then 전세/월세/매매 `ListRow`가 각각 1개씩 총 3개 표시된다
  - And 각 `ListRow`에는 “N년 후 순자산” 텍스트가 `Typography`로 포함된다
- AC-8 [E]: Scenario: 추천 옵션 Chip 표시
  - Given 시뮬레이션 결과의 `recommendedOption`이 `"jeonse"`일 때
  - When 결과 화면이 렌더링될 때
  - Then 전세 카드 영역에 `Chip` 텍스트가 정확히 “추천”으로 표시된다
- AC-9 [E]: Scenario: 차트 포인트 탭 시 연도별 값 표시
  - Given `residenceYears=10`이고 차트가 표시된 상태일 때
  - When 사용자가 5년 지점 포인트 영역(터치 영역 44px 이상)을 탭할 때
  - Then `BottomSheet`가 열리고 제목에 정확히 “5년차 순자산”이 포함된다
  - And 본문에 전세/월세/매매 값이 각각 숫자로 1개 이상 표시된다
- AC-10 [E]: Scenario: 상세 비용 분석표 — 무료 유저 보상형 광고 언락
  - Given `rc_entitlement_v1.isPremium=false`이고 결과 화면이 표시되었을 때
  - When 사용자가 “광고 보고 상세 보기” `Button`을 탭할 때
  - Then `TossRewardAd`가 시작된다
  - And 광고 시청 완료 후 상세 비용 분석 `ListRow`가 최소 3개 이상 표시된다
- AC-11 [E]: Scenario: 상세 비용 분석표 — 프리미엄은 즉시 열람
  - Given `rc_entitlement_v1.isPremium=true`이고 결과 화면이 표시되었을 때
  - When 사용자가 상세 비용 섹션을 볼 때
  - Then “광고 보고 상세 보기” 버튼이 렌더링되지 않는다
  - And 상세 비용 분석 `ListRow`가 최소 3개 이상 표시된다
- AC-12 [S]: Scenario: 결과 계산 전 빈 상태
  - Given `/result`에 진입했지만 입력값 hydrate가 완료되지 않았을 때
  - While 시뮬레이션 결과가 `null`일 때
  - Then `Typography`로 정확히 “계산 중...”이 표시된다
- AC-13 [W]: Scenario: 결과 공유 쿼리 누락 시 에러 처리
  - Given 사용자가 `/result`에 진입했지만 입력값이 navigation state에도 없고 URL 쿼리에도 없을 때
  - When 화면이 최초 표시될 때
  - Then `Dialog` 본문에 정확히 “결과를 불러올 수 없어요”가 표시된다
  - And 확인 `Button` 탭 시 `/`로 이동한다
- AC-14 [U]: Scenario: 배너 광고 슬롯 위치 고정
  - Given 결과 화면이 렌더링될 때
  - When 사용자가 스크롤할 때
  - Then `AdSlot`은 “상세 비용 분석 섹션 아래”에만 렌더링된다
  - And `AdSlot`은 콘텐츠 위에 overlay 되지 않는다
- **AC-15 [W]: Scenario: 보상형 광고 로드/표시 실패 시 언락 금지**
  - Given `rc_entitlement_v1.isPremium=false`이고 결과 화면이 표시되었을 때
  - When 사용자가 “광고 보고 상세 보기”를 탭했지만 보상형 광고가 `AD_LOAD_FAILED` 또는 `AD_SHOW_FAILED` 상태로 종료될 때
  - Then `Toast`로 정확히 “광고를 불러오지 못했어요”가 표시된다
  - And 상세 비용 분석 `ListRow`는 0개 표시된다(언락되지 않는다)

---

### F4. 히스토리(최근 5개) 저장/재진입
- Description: 사용자가 시뮬레이션을 실행할 때마다 입력 스냅샷이 히스토리에 저장되며 최근 5개까지만 유지한다. 사용자는 히스토리에서 항목을 탭해 동일 입력으로 결과를 재실행할 수 있다.
- Data: `HistoryEntry[]` (`rc_history_v1`)
- API: 없음
- Requirements:
- AC-1 [E]: Scenario: 결과 진입 시 히스토리 1건 저장
  - Given 토스 로그인된 유저가 있고 `rc_history_v1`이 빈 배열일 때
  - When 사용자가 `/input`에서 `{ presetId: null, jeonseDeposit: 200000000, jeonseLoanRatio: 70, jeonseInterestRate: 4, monthlyDeposit: 10000000, monthlyRent: 700000, monthlyRentIncreaseRate: 2, buyPrice: 450000000, buyEquity: 150000000, buyLoanRate: 4, buyLoanPeriodYears: 30, buyRepaymentType: "AMORTIZED", initialAsset: 30000000, residenceYears: 10, investmentReturnRate: 6, housePriceGrowthRate: 2 }`로 “결과 보기”를 탭해 `/result`로 이동할 때
  - Then localStorage `rc_history_v1` 길이는 정확히 `1`이 된다
  - And 첫 항목의 `label`에는 정확히 “직접 입력” 문자열이 포함된다
- AC-2 [E]: Scenario: 히스토리 최대 5개 유지
  - Given localStorage `rc_history_v1`에 `HistoryEntry`가 정확히 5개 있을 때
  - When 사용자가 새 시뮬레이션을 실행해 1개를 추가 저장할 때
  - Then localStorage `rc_history_v1` 길이는 정확히 `5`이다
  - And 가장 오래된 1개가 제거된다
- AC-3 [E]: Scenario: 히스토리 탭으로 결과 재실행
  - Given `/history`에 히스토리 항목이 1개 이상 표시될 때
  - When 사용자가 첫 번째 `ListRow`를 탭할 때
  - Then 라우트가 `/result`로 변경된다
  - And 결과 화면은 탭한 항목의 `input`과 동일한 값으로 계산한다
- AC-4 [S]: Scenario: 히스토리 Empty 상태
  - Given localStorage `rc_history_v1`가 `[]`일 때
  - While 사용자가 `/history`에 있을 때
  - Then `Typography`로 정확히 “아직 저장된 기록이 없어요”가 표시된다
  - And “시뮬레이션 하러 가기” `Button`이 표시된다
- AC-5 [W]: Scenario: localStorage 파싱 실패 처리
  - Given localStorage `rc_history_v1` 값이 문자열 `"NOT_JSON"`일 때
  - When 사용자가 `/history`에 진입할 때
  - Then `Dialog` 본문에 정확히 “기록을 불러오지 못했어요”가 표시된다
  - And 확인 탭 시 localStorage `rc_history_v1`는 `"[]"`로 초기화된다
- AC-6 [W]: Scenario: 저장 공간 부족(QuotaExceededError) 처리
  - Given localStorage setItem이 `QuotaExceededError`를 throw 하도록 모킹되었을 때
  - When 앱이 히스토리를 저장하려고 할 때
  - Then `Toast`로 정확히 “저장 공간이 부족해 기록을 저장하지 못했어요”가 표시된다
  - And 앱은 크래시하지 않는다

---

### F5. 결과 공유(URL 인코딩/복원, 복사/공유 시트)
- Description: 사용자는 결과 화면에서 입력값을 Base64로 인코딩한 URL을 생성해 공유할 수 있다. 공유 링크로 진입하면 입력값이 복원되어 동일 조건으로 결과가 재현된다.
- Data: `SharePayload`(URL query), `SimulationInput`
- API: 없음
- Requirements:
- AC-1 [E]: Scenario: 공유 URL 생성(복사)
  - Given 사용자가 `/result`에서 입력값 `{ presetId: null, jeonseDeposit: 200000000, jeonseLoanRatio: 70, jeonseInterestRate: 4, monthlyDeposit: 10000000, monthlyRent: 700000, monthlyRentIncreaseRate: 2, buyPrice: 450000000, buyEquity: 150000000, buyLoanRate: 4, buyLoanPeriodYears: 30, buyRepaymentType: "AMORTIZED", initialAsset: 30000000, residenceYears: 10, investmentReturnRate: 6, housePriceGrowthRate: 2 }`로 결과를 보고 있을 때
  - When 사용자가 “공유하기” 버튼을 탭하고 “URL 복사”를 선택할 때
  - Then 클립보드에 `"/result?s="`를 포함한 문자열이 복사된다
  - And `Toast`로 정확히 “링크를 복사했어요”가 표시된다
- AC-2 [E]: Scenario: 공유 링크로 결과 복원
  - Given 사용자가 `/result?s=BASE64_ENCODED_JSON`로 진입했을 때
  - When `BASE64_ENCODED_JSON`이 `{ version: 1, input: { presetId: null, jeonseDeposit: 200000000, jeonseLoanRatio: 70, jeonseInterestRate: 4, monthlyDeposit: 10000000, monthlyRent: 700000, monthlyRentIncreaseRate: 2, buyPrice: 450000000, buyEquity: 150000000, buyLoanRate: 4, buyLoanPeriodYears: 30, buyRepaymentType: "AMORTIZED", initialAsset: 30000000, residenceYears: 10, investmentReturnRate: 6, housePriceGrowthRate: 2 } }`의 base64일 때
  - Then 결과 화면은 위 `input`과 동일한 값으로 계산한다
- AC-3 [S]: Scenario: 공유 디코딩 로딩 상태
  - Given 사용자가 `/result?s=...`로 진입했고 디코딩이 진행 중일 때
  - While 디코딩이 완료되지 않았을 때
  - Then `Typography`로 정확히 “불러오는 중...”이 표시된다
- AC-4 [W]: Scenario: 공유 버전 불일치 처리
  - Given 사용자가 `/result?s=...`로 진입했을 때
  - When 디코딩된 JSON의 `version`이 `999`일 때
  - Then `Dialog` 본문에 정확히 “공유 링크 버전이 달라 열 수 없어요”가 표시된다
  - And 확인 탭 시 `/`로 이동한다
- AC-5 [W]: Scenario: 클립보드 API 미지원 fallback
  - Given `navigator.clipboard`가 `undefined`일 때
  - When 사용자가 “URL 복사”를 탭할 때
  - Then `Dialog`가 열리고 본문에 생성된 URL 문자열이 표시된다
  - And `Dialog` 확인 버튼 텍스트는 정확히 “닫기”이다
- AC-6 [W]: Scenario: 외부 URL 이동 금지 준수(공유 플로우)
  - Given 사용자가 결과 화면에서 공유 동작을 수행할 때
  - When 공유 처리 로직이 실행될 때
  - Then `window.open`은 호출되지 않는다
  - And `window.location.href`에 외부 도메인 문자열이 할당되지 않는다

---

### F6. 프리미엄 결제(토스페이먼츠)로 언락
- Description: 사용자는 프리미엄을 결제하여 상세 비용 분석표를 광고 없이 즉시 열람하고, 무료 버전의 거주기간 제한(최대 10년)을 20년으로 확장할 수 있다. 결제 상태는 localStorage에 저장되어 앱 재방문 시 유지된다.
- Data: `Entitlement` (`rc_entitlement_v1`)
- API: 없음(토스 결제 SDK 훅 사용)
- Requirements:
- AC-1 [E]: Scenario: 프리미엄 구매 성공 처리
  - Given `rc_entitlement_v1.isPremium=false`일 때
  - When 사용자가 `/result`에서 “프리미엄 구매” 버튼을 탭하고 결제 훅이 성공 콜백을 반환할 때
  - Then localStorage `rc_entitlement_v1`는 `{ isPremium: true, premiumSince: <number>, ownerUserId: <string>, maxResidenceYears: 20, createdAt: <number>, updatedAt: <number> }` 형태로 저장된다
  - And `Toast`로 정확히 “프리미엄이 활성화됐어요”가 표시된다
- AC-2 [E]: Scenario: 프리미엄 활성화 시 거주기간 20년 허용
  - Given localStorage `rc_entitlement_v1.isPremium=true`일 때
  - When 사용자가 `/input`에서 `residenceYears=20`을 입력하고 “결과 보기”를 탭할 때
  - Then 라우트가 `/result`로 변경된다
- AC-3 [W]: Scenario: 결제 취소 처리
  - Given `rc_entitlement_v1.isPremium=false`일 때
  - When 결제 훅이 “cancel” 결과를 반환할 때
  - Then localStorage `rc_entitlement_v1.isPremium`은 `false`로 유지
- **AC-4 [W]: Scenario: 결제 실패 처리(권한 미부여)**
  - Given `rc_entitlement_v1.isPremium=false`일 때
  - When 결제 훅이 `status:"fail"` 결과를 반환할 때
  - Then `Dialog` 제목이 정확히 “결제에 실패했어요”로 표시된다
  - And localStorage `rc_entitlement_v1.isPremium`은 `false`로 유지된다
- **AC-5 [W]: Scenario: 다른 계정 로그인 시 프리미엄 미적용**
  - Given localStorage `rc_entitlement_v1`가 `{ isPremium:true, ownerUserId:"USER_A", maxResidenceYears:20, ... }`이고 현재 로그인 유저의 `userId`가 `"USER_B"`일 때
  - When 사용자가 `/result`에서 상세 비용 분석 섹션을 볼 때
  - Then 앱은 `isPremium=false`로 간주하여 “광고 보고 상세 보기” 버튼이 렌더링된다
  - And “프리미엄 구매