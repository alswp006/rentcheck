# SPEC

## Common Principles

### 1) Tech/Architecture (MVP)
- Frontend only: **Vite + React + TypeScript**
- UI: **@toss/tds-mobile(TDS)** 컴포넌트로 구성(여백은 TDS 내장 padding/Spacing만 사용)
- Routing: **react-router-dom**
- Persistence: **localStorage** (총 데이터 5MB 이하)
- 계산 로직: 클라이언트 사이드 **순수 함수(simulate(input) → result)**

### 2) Toss Mini App 검수/정책 준수 (전역 원칙)
- 외부 도메인 이탈 금지: `window.location.href`, `window.open`로 외부 URL 이동을 **구현하지 않는다**
- 프로덕션 빌드에서 **console.error 0개** (오류는 UI 에러 상태로 표시)
- **Android 7+, iOS 16+** 호환(최신 전용 API/비표준 API 사용 금지)
- “앱 설치 유도” 문구/배너/링크 금지(예: “다운로드”, “설치하세요”)
- 외부 링크는 서비스 본질과 무관한 이동 금지(법률 고지 등만 허용). MVP에서는 **외부 링크 기능 자체를 제공하지 않는다.**

### 3) Ads & Payments (템플릿 훅/컴포넌트 사용)
- 리워드 광고 게이트: 결과(분석/추천/결과물) 노출 직전에 **TossRewardAd**로 1회 게이트
  - 단, 사용자가 “광고 없이 결과 보기”를 구매한 경우 게이트 스킵
- 배너 광고: 결과 화면에서 **AdSlot 1개**를 “콘텐츠 섹션 사이”에 배치(겹침 금지)

### 4) Form & Mobile Keyboard (전 폼 공통)
- 숫자 입력 TextField는 `inputMode="numeric"`(또는 decimal 필요 시 `"decimal"`)을 사용한다.
- 키보드로 인해 하단 CTA가 가려지지 않도록:
  - 입력 화면은 스크롤 가능 컨테이너를 사용하고
  - 포커스된 입력이 화면 안에 들어오도록 `scrollIntoView()`를 트리거한다(커스텀 CSS는 레이아웃 목적만)

### 5) Standard Loading / Empty / Error 규칙 (전 화면 공통)
- Loading: TDS `Typography`로 “로딩 중…” 텍스트 + 비활성화된 `Button` 상태 제공
- Empty: 데이터가 없을 때(예: 히스토리 0개) 빈 상태 문구를 `Typography`로 표시
- Error: 복구 가능한 에러는 TDS `Toast` 또는 화면 내 `Typography`로 **고정된 에러 메시지**를 표시

---

## Screen Definitions (React Router)

#### S1. 홈(프리셋 선택) — `/`
- **Purpose**: 프리셋 4종 및 “직접 입력하기” 진입점
- **TDS Components**
  - `AppBar`, `Typography`, `ListRow`(프리셋 카드형), `Button`, `Spacing`, `Toast`
- **States**
  - Loading: 없음(프리셋은 로컬 상수)
  - Empty: 없음(프리셋 4종 고정)
  - Error: 없음
- **Touch interactions**
  - 프리셋 ListRow 전체 탭 영역 ≥ 44px
  - “직접 입력하기” Button 높이 ≥ 44px(TDS 기본)
- **Navigation state contract**
  - navigate to `/result` → `{ input: SimulationInput; source: 'preset' }`
  - navigate to `/input` → `undefined`

- **Acceptance Criteria (EARS, S1 최소 4개)**
  - AC-S1-1 [U]: WHEN 사용자가 `/`로 진입했을 때, THE SYSTEM SHALL `ListRow` 프리셋 항목을 **정확히 4개** 렌더링한다. (Pass: 화면에 4개가 보임 / Fail: 3개 이하 또는 5개 이상)
  - AC-S1-2 [E]: WHEN 사용자가 유효한 프리셋(`id`가 정규식 `^preset-(1|2|3|4)$` 일치, `defaults`가 SimulationInput 제약 통과)을 탭했을 때, THE SYSTEM SHALL `/result`로 navigate하고 route state에 `{ source: 'preset', input: (해당 defaults 포함) }`를 포함한다. (Pass: `/result` 진입 + state에 source/input 존재 / Fail: 이동 없음 또는 state 누락)
  - AC-S1-3 [W]: WHEN 사용자가 `id` 형식이 잘못된 프리셋(정규식 불일치)을 탭했을 때, THE SYSTEM SHALL `Toast`로 `"프리셋 데이터를 불러올 수 없어요"`를 표시하고 `/result`로 navigate하지 않는다. (Pass: 토스트 표시 + 이동 없음 / Fail: 결과 화면으로 이동)
  - AC-S1-4 [E]: WHEN 사용자가 “직접 입력하기” 버튼을 탭했을 때, THE SYSTEM SHALL `/input`으로 navigate하며 navigation state는 `undefined`여야 한다. (Pass: `/input` 진입 + state undefined / Fail: 다른 경로 이동 또는 state 존재)
  - AC-S1-5 [W]: WHEN 홈 화면에서 프리셋/버튼을 통해 화면 이동이 발생할 때, THE SYSTEM SHALL `window.open` 또는 `window.location.href`를 호출하지 않는다. (Pass: 호출 경로 없음 / Fail: 호출 발생)

---

#### S2. 입력(3탭 + 공통 설정) — `/input`
- **Purpose**: 전세/월세/매매 입력 + 공통(초기자산/기간/수익률/집값상승률) 입력 후 결과로 이동
- **TDS Components**
  - `AppBar`, `TabBar`(전세/월세/매매), `TextField`, `ListRow`, `Button`, `Typography`, `Spacing`, `Dialog`, `Toast`
- **States**
  - Loading: 없음(로컬 폼)
  - Empty: `prefill`이 없으면 기본값으로 초기화
  - Error:
    - 유효성 실패 시 필드 하단 에러 텍스트(정확한 메시지) 표시
    - 유효성 실패 상태에서는 제출 버튼 disabled 유지
    - **권위 있는 검증 지점(Authoritative Validation)**: S2는 결과 생성에 필요한 모든 제약(범위/상호관계/**옵션별 초기자산 충족 여부 표시 포함**)을 제출 전에 검증하고, 실패 시 제출을 차단한다.
- **Mobile keyboard**
  - 숫자 필드는 `inputMode="numeric"`/`"decimal"` 지정
  - 포커스 시 해당 ListRow가 `scrollIntoView({ block: 'center' })`
- **Touch interactions**
  - 탭(TabBar) 및 버튼은 TDS 기본 터치 타겟(≥44px)
- **Navigation state contract**
  - navigate to `/input` → `{ prefill?: Partial<SimulationInput> } | undefined`
  - navigate to `/result` → `{ input: SimulationInput; source: 'manual' }`

- **Acceptance Criteria (EARS, S2 최소 4개)**
  - AC-S2-1 [E]: WHEN 사용자가 모든 필수 필드가 SimulationInput 제약(범위/타입/상호관계)을 만족하고 **3옵션 중 1개 이상이 초기자산 요건을 만족**하는 상태에서 “결과 보기”를 탭했을 때, THE SYSTEM SHALL `/result`로 navigate하며 route state에 `{ source: 'manual', input: (현재 입력값) }`를 포함한다. (Pass: `/result` 진입 + state 포함 / Fail: 이동 없음)
  - AC-S2-2 [W]: WHEN 사용자가 `buyEquity > buyPrice`가 되도록 값을 입력했을 때, THE SYSTEM SHALL 매매 섹션에 `"자기자본은 매매가를 넘을 수 없어요"` 에러 텍스트를 표시하고 “결과 보기” 버튼을 disabled로 유지한다. (Pass: 에러 표시 + 버튼 disabled / Fail: 버튼 enabled 또는 에러 미표시)
  - AC-S2-3 [W]: WHEN 사용자가 `residenceYears`에 0 또는 31 이상을 입력했을 때, THE SYSTEM SHALL `"거주기간은 1~30년만 입력할 수 있어요"`를 화면에 표시하고 `/result`로 navigate하지 않는다. (Pass: 이동 없음 / Fail: 이동 발생)
  - AC-S2-4 [W]: WHEN 사용자가 **전세/월세/매매 3옵션 모두**에 대해 `initialAsset < 각 옵션 초기투입금`인 상태가 되었을 때, THE SYSTEM SHALL “결과 보기” 버튼을 disabled로 유지한다. (Pass: disabled / Fail: enabled)
  - AC-S2-5 [S]: WHILE 사용자가 `monthlyRent` 입력 필드를 포커스한 동안, THE SYSTEM SHALL 해당 `TextField`가 `inputMode="numeric"` 속성을 가진다. (Pass: DOM 속성 확인 가능 / Fail: 속성 누락)
  - AC-S2-6 [E]: WHEN `/input`으로 진입할 때 navigation state에 `{ prefill: { residenceYears: 5, initialAsset: 30000000 } }`가 포함되어 있으면, THE SYSTEM SHALL 초기 렌더 시 해당 필드들에 각각 `5`, `30000000` 값이 표시되도록 초기화한다. (Pass: 초기 값 표시 / Fail: 기본값 유지)

---

#### S3. 결과(리워드 광고 게이트 포함) — `/result`
- **Purpose**: N년 후 순자산 3옵션 비교 + 추천 + 인사이트 + 차트 + 비용표, 조건 수정 진입
- **TDS Components**
  - `AppBar`, `Typography`, `Button`, `Chip`(추천 뱃지/라벨), `ListRow`(비용표), `BottomSheet`(조건 수정), `Toast`, `Spacing`
  - 광고: `TossRewardAd`(게이트), `AdSlot`(배너)
- **Non-TDS**
  - 차트는 SVG/Canvas 커스텀(레이아웃만 커스텀 CSS 허용), 텍스트/버튼은 TDS 사용
- **States**
  - Loading:
    - 리워드 광고 대기: `Typography`로 “광고 로딩 중…” 표시
    - 재계산 중: `Typography`로 “계산 중…” 표시(최대 200ms)
  - Empty: 필수 입력 누락으로 결과 생성 불가 시 “입력값을 확인해주세요” 표시 + “입력으로 돌아가기” 버튼
  - Error:
    - 라우트 state에 `input`이 없으면 “잘못된 접근입니다” 표시
    - **유효성 실패(초기자산 부족 포함)** 입력이 S2를 거치지 않고 유입될 수 있으므로(프리셋/히스토리/공유), S3에서도 동일한 검증 함수를 실행한다.
      - 단, **3옵션 모두 초기자산 부족인 경우에만** 결과 생성을 차단하고 에러 상태로 표시한다.
      - **1옵션 이상 가능하면** 결과 화면을 렌더링하되, 초기자산이 부족한 옵션은 옵션 카드/표에서 `"초기자산 부족"` 고정 문구를 표시하고 해당 옵션 값은 `null`로 취급한다(타입 정의 참조).
    - 실패 시 화면 내 고정 에러 UI를 표시한다(크래시/무한 로딩 금지).
- **Ad placements**
  - `AdSlot`은 “차트 섹션”과 “비용 분석표” 사이에 1개 고정 배치(겹침/고정 오버레이 금지)
- **Touch interactions**
  - “조건 수정하기”, “저장/히스토리”, “공유하기”, “광고 없이 결과 보기” 버튼 ≥ 44px
  - 차트 터치 툴팁 터치 영역: 포인트 기준 반경 22px 이상(지름 44px)
- **Navigation state contract**
  - navigate to `/result` → `{ input: SimulationInput; source: 'preset' | 'manual' | 'history' | 'share' }`
  - navigate to `/purchase` → `{ from?: 'result' | 'home' } | undefined` (구매 트리거용)
- **Share mechanism (명시)**
  - 기본 공유: `navigator.share({ title, text, url })` (Web Share API)
  - 폴백(share 미지원): `url`을 클립보드에 복사(`navigator.clipboard.writeText(url)`) 후 `Toast` 표시
  - 공유 URL은 앱 내부 라우트인 `/share?p=...` 형태(외부 도메인 이동 없음)

- **Acceptance Criteria (EARS, S3 최소 4개)**
  - AC-S3-1 [W]: WHEN 사용자가 `/result`로 진입했는데 route state에 `input`이 없을 때, THE SYSTEM SHALL `Typography`로 `"잘못된 접근입니다"`를 표시하고 결과 콘텐츠(카드/차트/표)를 표시하지 않는다. (Pass: 에러 문구 보임 + 결과 미노출 / Fail: 결과 일부라도 노출)
  - AC-S3-2 [E]: WHEN 사용자가 미구매 상태(`rentcheck:purchase:v1.adSkipPurchased=false`)로 유효한 `input`을 가지고 `/result`에 진입했을 때, THE SYSTEM SHALL `TossRewardAd`가 완료되기 전까지 결과 콘텐츠(카드/차트/비용표)를 표시하지 않는다. (Pass: 게이트만 노출 / Fail: 결과가 광고 전 노출)
  - AC-S3-3 [O]: WHEN 사용자가 구매 상태(`rentcheck:purchase:v1.adSkipPurchased=true`)로 `/result`에 진입했을 때, THE SYSTEM SHALL `TossRewardAd`를 표시하지 않고 1초 이내에 결과 콘텐츠를 표시한다. (Pass: 게이트 미노출 + 결과 노출 / Fail: 게이트 노출 또는 결과 지연)
  - AC-S3-4 [E]: WHEN 입력 검증 결과 **1개 이상 옵션이 초기자산 요건을 만족**할 때, THE SYSTEM SHALL 결과 화면을 렌더링하고 초기자산이 부족한 옵션에는 `"초기자산 부족"` 문구를 표시한다. (Pass: 화면 렌더 + 부족 옵션 표기 / Fail: 전체 에러 화면으로만 처리)
  - AC-S3-5 [W]: WHEN 입력 검증 결과 **전세/월세/매매 3옵션 모두** `initialAsset < 초기투입금`일 때, THE SYSTEM SHALL `"초기자산이 부족해요"`(또는 스펙에서 정의된 동일 의미의 고정 문구) 에러 상태를 표시하고 차트/비용표를 표시하지 않는다. (Pass: 에러 화면 / Fail: 결과 콘텐츠 노출)
  - **(추가: 구매 트리거 정의)** AC-S3-6 [E]: WHEN 사용자가 `/result`에서 미구매 상태(`rentcheck:purchase:v1.adSkipPurchased=false`)이고 결과 콘텐츠가 표시된 상태에서 “광고 없이 결과 보기” `Button`을 탭했을 때, THE SYSTEM SHALL `/purchase`로 navigate하고 navigation state에 `{ from: 'result' }`를 포함한다. (Pass: `/purchase` 진입 + state.from='result' / Fail: 이동 없음 또는 state 누락)
  - **(추가: 공유 성공/피드백)** AC-S3-7 [E]: WHEN 사용자가 `/result`에서 “공유하기” `Button`을 탭했고 `createShareUrl({ v:1, input })`가 `{ ok:true, url }`를 반환하며 `navigator.share`가 존재할 때, THE SYSTEM SHALL `navigator.share`를 `url`이 포함된 인자로 **1회 호출**한다. (Pass: share 1회 호출 + share 인자에 `url` 포함 / Fail: 호출 0회 또는 url 누락)
  - **(추가: 공유 실패/취소 처리)** AC-S3-8 [W]: WHEN 사용자가 “공유하기”를 탭했을 때 (a) `navigator.share`가 없거나 (b) `navigator.share` 호출이 reject되거나 (c) `createShareUrl`이 `{ ok:false, error }`를 반환할 때, THE SYSTEM SHALL 아래 중 **정확히 1개**의 `Toast`를 표시하고 외부 URL 이동을 수행하지 않는다. (Pass: 토스트 문구 일치 + `window.open/location.href` 미호출 / Fail: 토스트 없음 또는 외부 이동)
    - (a) share 미지원 & 클립보드 복사 성공: `"링크를 복사했어요"`
    - (a) share 미지원 & 클립보드 복사 실패: `"공유를 사용할 수 없어요"`
    - (b) 사용자 취소/실패(원인 불문): `"공유를 완료하지 못했어요"`
    - (c) `error='TOO_LONG'`: `"공유 링크가 너무 길어요"`
    - (c) `error='ENCODE_FAILED'`: `"공유 링크를 만들 수 없어요"`

---

#### S4. 히스토리 — `/history`
- **Purpose**: 최근 5개 자동 저장 시뮬레이션 재진입
- **TDS Components**
  - `AppBar`, `Typography`, `ListRow`, `Button`, `Dialog`, `Spacing`, `Toast`
- **States**
  - Loading: localStorage read 동안 1프레임 “로딩 중…” 표시
  - Empty: 히스토리 0개면 “최근 실행 내역이 없어요” 표시 + “시뮬레이션 하러가기” 버튼
  - Error: localStorage parse 실패 시 “저장된 데이터를 불러올 수 없어요” + “초기화” 버튼
- **List scroll**
  - 최대 5개 고정이므로 가상 스크롤 미사용, 화면 스크롤 사용
- **Touch interactions**
  - 각 항목 ListRow 전체 탭 ≥ 44px
  - “전체 삭제”, “초기화” 버튼 ≥ 44px
- **Navigation state contract**
  - navigate to `/result` → `{ input: SimulationInput; source: 'history' }`

- **Acceptance Criteria (EARS, S4 최소 4개)**
  - **(완성/수정: 로딩 문구 명시 및 문장 완결)** AC-S4-1 [S]: WHILE 사용자가 `/history`로 진입한 직후 **첫 렌더 프레임에서** localStorage의 `rentcheck:history:v1`를 읽고 파싱하는 동안, THE SYSTEM SHALL `Typography`로 `"로딩 중..."`을 **최소 1프레임** 표시한다. (Pass: 텍스트가 1프레임 이상 표시 / Fail: 로딩 표시 없이 즉시 빈/에러/리스트만 표시)
  - AC-S4-2 [U]: WHEN 히스토리 저장소에 `entries=[]`이거나 키 자체가 없을 때, THE SYSTEM SHALL `"최근 실행 내역이 없어요"`와 `"시뮬레이션 하러가기"` 버튼을 표시한다. (Pass: 문구+버튼 표시 / Fail: 리스트가 표시되거나 문구 누락)
  - AC-S4-3 [W]: WHEN localStorage의 `rentcheck:history:v1`가 JSON 파싱 불가 문자열일 때, THE SYSTEM SHALL `"저장된 데이터를 불러올 수 없어요"`와 `"초기화"` 버튼을 표시한다. (Pass: 에러 문구+초기화 버튼 / Fail: 크래시 또는 빈 화면)
  - AC-S4-4 [E]: WHEN 사용자가 히스토리 항목 `ListRow`를 탭했을 때, THE SYSTEM SHALL `/result`로 navigate하고 route state에 `{ source: 'history', input: (해당 entry.input) }`를 포함한다. (Pass: `/result` 이동 + input 일치 / Fail: 이동 없음 또는 input 불일치)
  - **(개별 삭제 확인: Dialog 강제)** AC-S4-5 [E]: WHEN 사용자가 특정 항목 삭제 액션을 선택했을 때, THE SYSTEM SHALL `Dialog`를 표시하고, 사용자가 `Dialog`에서 “삭제”를 탭했을 때에만 localStorage의 `entries`에서 해당 `id`를 제거하며 목록에서도 즉시 사라지게 한다. (Pass: “삭제” 탭 전에는 유지 + “삭제” 탭 후 localStorage/UI 모두 제거 / Fail: 확인 없이 삭제되거나 저장소/화면 불일치)
  - **(추가: 전체 삭제 확인)** AC-S4-6 [E]: WHEN `/history`에서 `entries.length>=1`인 상태에서 사용자가 “전체 삭제” `Button`을 탭했을 때, THE SYSTEM SHALL `Dialog`를 표시하고, 사용자가 `Dialog`에서 “삭제”를 탭하면 localStorage의 `rentcheck:history:v1`를 `{ v:1, entries:[] }`로 저장(또는 키 제거 후 동일 효과)하며 화면은 Empty 상태(AC-S4-2)로 전환한다. (Pass: 삭제 후 `entries.length===0` + 빈 상태 문구/버튼 표시 / Fail: 1개라도 남음 또는 UI 미전환)
  - **(추가: 파싱 실패 상태에서 초기화 확인)** AC-S4-7 [W]: WHEN AC-S4-3의 파싱 실패 에러 상태에서 사용자가 “초기화” `Button`을 탭했을 때, THE SYSTEM SHALL `Dialog`를 표시하고, 사용자가 `Dialog`에서 “초기화”를 탭하면 localStorage의 `rentcheck:history:v1` 키를 제거하고 Empty 상태(AC-S4-2)를 표시한다. (Pass: 키 제거 확인 + 빈 상태 표시 / Fail: 키 유지 또는 에러 화면 유지)

---

#### S5. 공유로 열기(가져오기) — `/share?p=...`
- **Purpose**: Base64 쿼리 payload를 디코딩해 입력 복원 후 결과/입력으로 이동
- **TDS Components**
  - `AppBar`, `Typography`, `Button`, `Dialog`, `Toast`, `Spacing`
- **States**
  - Loading: 디코딩 중 “불러오는 중…” 표시
  - Empty: `p`가 없으면 “공유 정보가 없어요” + 홈으로
  - Error:
    - **Base64url 디코딩 실패 OR JSON 파싱 실패 OR 스키마 검증 실패** 시 “공유 링크가 올바르지 않아요” + 홈으로
- **Touch interactions**
  - “결과 보기”, “입력 수정하기” 버튼 ≥ 44px
- **Navigation state contract**
  - navigate to `/share` → `undefined`
  - navigate to `/result` → `{ input: SimulationInput; source: 'share' }`
  - navigate to `/input` → `{ prefill: Partial<SimulationInput> }`

- **Acceptance Criteria (EARS, S5 최소 4개)**
  - AC-S5-1 [W]: WHEN 사용자가 `/share`로 진입했는데 쿼리 파라미터 `p`가 없을 때, THE SYSTEM SHALL `"공유 정보가 없어요"`를 표시하고 “홈으로” 버튼을 표시한다. (Pass: 문구+버튼 / Fail: 로딩 지속 또는 결과로 이동)
  - AC-S5-2 [S]: WHILE `p` 디코딩/파싱/검증이 완료되기 전까지, THE SYSTEM SHALL `Typography`로 `"불러오는 중..."`을 표시한다. (Pass: 로딩 문구 노출 / Fail: 빈 화면)
  - AC-S5-3 [W]: WHEN `p` 디코딩은 성공했지만 결과 객체가 `SharePayload` 또는 `SimulationInput` 스키마 검증에 실패했을 때, THE SYSTEM SHALL `Toast` 또는 화면 내 문구로 `"공유 링크가 올바르지 않아요"`를 표시하고 `/result` 또는 `/input`으로 자동 이동하지 않는다. (Pass: 에러 표시 + 이동 없음 / Fail: 잘못된 값으로 이동)
  - AC-S5-4 [E]: WHEN 디코딩/파싱/검증이 성공한 상태에서 사용자가 “결과 보기”를 탭했을 때, THE SYSTEM SHALL `/result`로 navigate하고 route state에 `{ source: 'share', input: (복원된 input) }`를 포함한다. (Pass: `/result` 이동 + input 일치 / Fail: 이동 없음 또는 input 불일치)
  - AC-S5-5 [E]: WHEN 디코딩/파싱/검증이 성공한 상태에서 사용자가 “입력 수정하기”를 탭했을 때, THE SYSTEM SHALL `/input`으로 navigate하고 route state에 `{ prefill: (복원된 input) }`를 포함한다. (Pass: `/input` 이동 + prefill 일치 / Fail: 이동 없음)

---

#### S6. 광고 제거 구매 — `/purchase`
- **Purpose**: “광고 없이 결과 보기(리워드 광고 스킵)” 1회 구매
- **TDS Components**
  - `AppBar`, `Typography`, `Button`, `ListRow`, `Dialog`, `Toast`, `Spacing`, `Toggle`(약관 확인용 체크 대체 가능)
- **States**
  - Loading: 결제 진행 중 “결제 처리 중…” + 구매 버튼 disabled
  - Empty: 이미 구매 완료면 “구매 완료됨” + 결과로 돌아가기 버튼
  - Error: 결제 실패 시 “결제에 실패했어요” 토스트
- **Touch interactions**
  - 구매 버튼 ≥ 44px
- **Navigation state contract**
  - navigate to `/purchase` → `{ from?: 'result' | 'home' } | undefined`

- **Acceptance Criteria (EARS, S6 최소 4개)**
  - AC-S6-1 [U]: WHEN `rentcheck:purchase:v1.adSkipPurchased=false`인 상태에서 사용자가 `/purchase`로 진입했을 때, THE SYSTEM SHALL `"광고 없이 결과 보기 구매"` 텍스트의 구매 버튼을 표시한다. (Pass: 버튼 표시 / Fail: 버튼 미표시)
  - AC-S6-2 [E]: WHEN 결제 성공 콜백으로 `transactionId`를 수신했을 때, THE SYSTEM SHALL localStorage `rentcheck:purchase:v1`를 `{ v:1, adSkipPurchased:true, purchasedAt:(현재 ms), transactionId:(수신값 또는 null) }`로 저장하고 `Toast`로 `"구매가 완료됐어요"`를 표시한다. (Pass: 저장소 값 확인 가능 + 토스트 / Fail: 저장 안 됨 또는 adSkipPurchased=false 유지)
  - AC-S6-3 [S]: WHILE 결제 진행 중(요청 후 콜백 전)인 동안, THE SYSTEM SHALL `Typography`로 `"결제 처리 중..."`을 표시하고 구매 버튼을 disabled로 유지한다. (Pass: 로딩+disabled / Fail: 중복 탭 가능)
  - AC-S6-4 [W]: WHEN 결제 실패 콜백을 수신했을 때, THE SYSTEM SHALL `Toast`로 `"결제에 실패했어요"`를 표시하고 `rentcheck:purchase:v1.adSkipPurchased`를 `false`로 유지한다. (Pass: 토스트 + false 유지 / Fail: true로 변경)
  - AC-S6-5 [U]: WHEN `rentcheck:purchase:v1.adSkipPurchased=true`인 상태에서 사용자가 `/purchase`로 진입했을 때, THE SYSTEM SHALL `"구매 완료됨"`을 표시하고 구매 버튼을 표시하지 않는다. (Pass: 완료 문구 + 버튼 없음 / Fail: 구매 버튼 표시)

---

## Data Schema (Authoritative: localStorage)

> 목적: 스펙에서 참조하는 **모든 localStorage 키 문자열**, **값 구조(명시적 TS 타입)**, **기본값/제약**, **파싱 실패 처리**를 권위 있게 정의한다.  
> 구현은 템플릿의 localStorage helper를 사용하되, 아래 스키마를 만족해야 한다.

### Key strings (고정)
- 히스토리: `rentcheck:history:v1`
- 구매 상태: `rentcheck:purchase:v1`
- 마지막 공유 URL(옵션): `rentcheck:lastShare:v1`

### TypeScript types (값 구조 고정)

```ts
// 1) 히스토리
export interface HistoryStorageV1 {
  v: 1;
  entries: HistoryEntry[]; // max 5
}

// 2) 구매 상태
export interface PurchaseStorageV1 {
  v: 1;
  adSkipPurchased: boolean; // default false
  purchasedAt: number | null; // epoch ms
  transactionId: string | null;
}

// 3) 마지막 공유 URL (옵션)
export interface LastShareStorageV1 {
  v: 1;
  lastUrl: string;
  createdAt: number; // epoch ms
}
```

### Defaults (키가 없을 때의 기본값)
- `rentcheck:history:v1` 미존재 → `{ v:1, entries:[] }`로 간주
- `rentcheck:purchase:v1` 미존재 → `{ v:1, adSkipPurchased:false, purchasedAt:null, transactionId:null }`로 간주
- `rentcheck:lastShare:v1` 미존재 → 기능상 “없음”으로 간주(표시/사용 강제 없음)

### Size / count constraints
- `HistoryStorageV1.entries.length <= 5` (FIFO eviction, 아래 HistoryEntry 제약 참조)
- Share URL query `p` 길이 제한: `p.length <= 2048` (SharePayload 섹션 참조)
- localStorage 총합 5MB 이하(공통 원칙)

### Parse failure policy (공통)
- JSON parse 실패 또는 `v` 불일치 등 스키마 검증 실패:
  - 해당 화면은 **크래시하지 않고** Error 상태로 전환해야 한다.
  - `/history`는 S4 Error 규칙(“저장된 데이터를 불러올 수 없어요” + “초기화”)을 따른다.
  - 구매 상태 파싱 실패 시에는 **미구매 기본값으로 간주**하고(`adSkipPurchased=false`) 결과 화면은 광고 게이트를 적용한다. (단, console.error 출력 금지)

---

## Data Models

### PresetScenario — fields, types, constraints
```ts
export interface PresetScenario {
  id: string;        // e.g. "preset-1"
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  name: string;      // UI 표시명
  defaults: SimulationInput;
}
```
- Constraints
  - 앱 내 프리셋은 **4개 고정**(코드 상수)
  - `id` 형식 제약: 정규식 `^preset-(1|2|3|4)$` 와 일치해야 한다.
    - 불일치 시 해당 프리셋은 “선택 불가”로 처리(탭 시 토스트 노출 후 이동 금지)
  - `createdAt`, `updatedAt`은 코드 상수로 주입하며(동일 값 허용), `updatedAt >= createdAt`을 만족해야 한다.
  - defaults는 `SimulationInput` 제약을 준수

### SimulationInput — fields, types, constraints
```ts
export type BuyRepaymentType = '원리금균등' | '원금균등' | '만기일시';

export interface SimulationInput {
  presetId: string | null;

  // 전세
  jeonseDeposit: number;        // KRW, integer, >= 0
  jeonseLoanRatio: number;      // percent, 0~100
  jeonseInterestRate: number;   // percent, 0~30

  // 월세
  monthlyDeposit: number;             // KRW, integer, >= 0
  monthlyRent: number;                // KRW/month, integer, >= 0
  monthlyRentIncreaseRate: number;    // percent, 0~30

  // 매매
  buyPrice: number;             // KRW, integer, >= 0
  buyEquity: number;            // KRW, integer, >= 0 and <= buyPrice
  buyLoanInterestRate: number;  // percent, 0~30
  buyLoanPeriodYears: number;   // integer, 1~40
  buyRepaymentType: BuyRepaymentType;

  // 공통
  initialAsset: number;          // KRW, integer, >= 0
  residenceYears: number;        // integer, 1~30
  investmentReturnRate: number;  // percent, -10~30 (음수 허용)
  housePriceGrowthRate: number;  // percent, -10~30 (음수 허용)
}
```

- Field-level constraints (명시)
  - 모든 `number` 필드는 `Number.isFinite(value) === true`를 만족해야 한다. (NaN/Infinity 금지)
  - `jeonseDeposit`, `monthlyDeposit`, `monthlyRent`, `buyPrice`, `buyEquity`, `initialAsset`는 **정수**여야 한다.
  - 퍼센트 필드(`*Rate`, `*Ratio`)는 소수 허용(입력 UX는 구현 선택)하되 **범위 제약**을 반드시 만족해야 한다.
  - `buyRepaymentType`은 유니온 타입 3개 중 1개여야 한다.

- Additional constraints (결과 생성 전 검증 — **S2 제출 전 + S3 진입 시 공통 적용**)
  - `buyEquity <= buyPrice` (위반 시 에러: `"자기자본은 매매가를 넘을 수 없어요"`)
  - `residenceYears`는 1~30 (위반 시 에러: `"거주기간은 1~30년만 입력할 수 있어요"`)
  - `jeonseLoanRatio`는 0~100
  - `jeonseInterestRate`, `monthlyRentIncreaseRate`, `buyLoanInterestRate`는 0~30
  - `buyLoanPeriodYears`는 1~40
  - `investmentReturnRate`, `housePriceGrowthRate`는 -10~30
  - `initialAsset`는 각 옵션의 **초기투입금**과 비교해 **옵션별 가능/불가를 판정**한다.
    - 전세 초기투입금 = `jeonseDeposit * (1 - jeonseLoanRatio/100)`
    - 월세 초기투입금 = `monthlyDeposit`
    - 매매 초기투입금 = `buyEquity`
  - 옵션별 판정:
    - 특정 옵션에 대해 `initialAsset < 초기투입금`이면 해당 옵션은 **불가(infeasible)** 로 처리한다.
      - S2: 해당 옵션(전세/월세/매매) 섹션에 “초기자산 부족” 고정 에러 문구 표시
      - S3: 결과 렌더링 시 해당 옵션 카드/표에 “초기자산 부족” 고정 문구 표시(해당 옵션 값은 `null`로 취급)
  - 제출/결과 생성 차단 규칙(모순 해결 — 단일 정책으로 고정):
    - **전세/월세/매매 3옵션이 모두 불가인 경우에만** 유효성 실패로 처리하여 결과 생성을 차단한다.
      - S2: 제출 버튼 disabled
      - S3: 에러 상태로 처리(옵션별 문구가 아니라 전체 에러 화면)

---

### SimulationResult — fields, types, constraints
```ts
export interface NetWorthPoint {
  year: number;          // 0..residenceYears
  jeonse: number | null; // KRW (불가 옵션은 null)
  monthly: number | null; // KRW (불가 옵션은 null)
  buy: number | null;    // KRW (불가 옵션은 null)
}

export type RecommendedOption = 'jeonse' | 'monthly' | 'buy';

export interface CostBreakdownRow {
  item: string;             // 고정 라벨(예: "총 거주비용")
  jeonse: number | null;    // KRW (불가 옵션은 null)
  monthly: number | null;   // KRW (불가 옵션은 null)
  buy: number | null;       // KRW (불가 옵션은 null)
}

/**
 * 순수 계산 함수는 시간/저장 개념이 없는 결과를 반환한다.
 */
export interface SimulationResultCore {
  netWorthByYear: NetWorthPoint[]; // length = residenceYears + 1
  finalNetWorth: { jeonse: number | null; monthly: number | null; buy: number | null };
  recommendedOption: RecommendedOption; // 불가 옵션은 추천 대상으로 선택될 수 없음
  insightCopy: string; // 1줄 고정 문장
  costBreakdown: CostBreakdownRow[];
}

/**
 * 저장(히스토리) 시점의 메타(createdAt/updatedAt)를 포함하는 결과 모델.
 * - simulate()는 SimulationResultCore만 생성한다.
 * - HistoryEntry 저장 시 SimulationResult로 래핑하여 저장한다.
 */
export interface SimulationResult extends SimulationResultCore {
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}
```
- Constraints
  - `netWorthByYear.length === residenceYears + 1`
  - `netWorthByYear[0].year === 0`, `netWorthByYear[residenceYears].year === residenceYears`
  - 옵션이 불가인 경우:
    - 해당 옵션의 `finalNetWorth`는 `null`
    - `netWorthByYear[*].<option>`은 `null`
    - `costBreakdown[*].<option>`은 `null`
  - `recommendedOption` 선택 규칙:
    - `finalNetWorth`가 `null`이 아닌 옵션 중 최댓값을 선택
    - 동률 우선순위: `jeonse > monthly > buy`
  - `SimulationResult.createdAt`, `SimulationResult.updatedAt`은 저장 시점에 주입하며, `updatedAt >= createdAt`을 만족해야 한다.

---

### HistoryEntry — fields, types, constraints
```ts
export interface HistoryEntry {
  id: string;         // uuid
  createdAt: number;  // epoch ms
  updatedAt: number;  // epoch ms
  input: SimulationInput;
  result: SimulationResult; // input에 대한 계산 결과(저장 시점 기준, 메타 포함)
  label?: string;     // "{프리셋명 또는 '직접 입력'} · 집값 {housePriceGrowthRate}% · {residenceYears}년"
}
```
- Constraints
  - 최대 5개 유지(초과 시 오래된 항목 제거)
  - `updatedAt >= createdAt`
  - Eviction rule (명시적):
    - 저장 직후 `entries.length >= 5`가 되면,
    - `createdAt`이 가장 작은(가장 오래된) entry부터 제거하여
    - 최종적으로 `entries.length === 5`를 만족시킨다.
  - **호환성(기존 저장 데이터)**: 과거 버전에서 저장된 entry에 `updatedAt` 또는 `result`(또는 `result.updatedAt/createdAt`)이 없을 수 있다.
    - `updatedAt` 누락 시 `createdAt`으로 보정한다.
    - `result` 누락 시 `/history` → `/result` 재진입 시점에 `simulate(input)`로 `SimulationResultCore`를 재생성한 뒤,
      - `result`를 `{ ...core, createdAt: now, updatedAt: now }` 형태로 채워 **즉시 덮어써 저장**하며
      - 해당 entry의 `updatedAt`도 `now`로 갱신한다.
    - `result.createdAt/updatedAt` 누락 시:
      - `result.createdAt`은 entry의 `createdAt`으로,
      - `result.updatedAt`은 entry의 `updatedAt`으로 보정한다.

---

### SharePayload — fields, types, constraints
```ts
export interface SharePayload {
  v: number; // 1
  input: SimulationInput;
}
```
- Constraints
  - URL query param key는 `p`
  - 인코딩 대상(고정): `SharePayload` 전체를 인코딩한다.
  - 인코딩 포맷(고정):
    1) `JSON.stringify(payload)`로 문자열 생성 (JS string)
    2) 문자열을 **UTF-8 바이트열**로 변환
    3) 바이트열을 **Base64url**(URL-safe, `+`→`-`, `/`→`_`, padding `=` 제거)로 인코딩한 값을 `p`에 사용
  - 디코딩 포맷(고정): 위 과정을 역순으로 수행하며,
    - **Base64url 디코딩 실패**
    - **UTF-8 변환 실패**
    - **JSON parse 실패**
    - **스키마 검증 실패(SharePayload.v !== 1, input 누락/타입 불일치 등)**
    - 중 하나라도 발생하면 `/share`는 동일한 에러 상태(“공유 링크가 올바르지 않아요”)로 처리한다.
  - 길이 제한:
    - `p` 문자열 길이는 **2048자 이하**여야 한다.
    - 2048자를 초과하면 공유 URL 생성은 **실패 처리**한다(Toast/Dialog로 고정 문구 노출, 크래시 금지).
  - URL 길이 한계 초과 시 동작:
    - 생성 단계에서 길이 제한을 먼저 검사하여 초과하면 `rentcheck:lastShare:v1` 저장을 수행하지 않는다.
  - 공유 URL 생성 함수 시그니처(문서화, 구현은 동일 동작을 만족해야 함):
```ts
export type CreateShareUrlError = 'TOO_LONG' | 'ENCODE_FAILED';

export function createShareUrl(
  payload: SharePayload
): { ok: true; url: string } | { ok: false; error: CreateShareUrlError };
```

---

## Data Storage (localStorage) — key name, shape, size estimation

#### 1) 히스토리
- Key: `rentcheck:history:v1`
- Shape:
```ts
export interface HistoryStorageV1 {
  v: 1;
  entries: HistoryEntry[]; // max 5
}
```
- Size estimate (result 포함 반영)
  - entry 1개 ≈ 2.0~4.5KB(JSON, result 포함/차트 포인트 수에 따라 변동)
  - max 5개 ≈ 10~23KB

- Eviction / Deletion behavior (**명시적 규칙**)
  - 최대 5개 규칙으로 인해 entry가 제거(evict)될 경우:
    - 해당 entry는 localStorage에서 **하드 삭제(hard-delete)** 된다.
    - 복구/휴지통/되돌리기 기능은 MVP에서 제공하지 않는다.
  - Eviction 트리거 시점(명시):
    - `/result`에서 히스토리 저장(자동 저장) 직후 `entries.length > 5`가 되는 경우,
    - `createdAt`이 가장 작은 항목부터 제거하여 `entries.length === 5`가 되도록 한다.
  - Eviction 이후 참조 처리:
    - `/result` 라우트 state는 `HistoryEntry.id`를 참조하지 않고 `input`(및 화면 내 계산 결과)만으로 렌더링한다.
    - 따라서 어떤 history entry가 eviction되더라도, 이미 열려 있는 `/result (source: 'history')` 화면은 **계속 정상 표시**되어야 한다.
    - 사용자가 `/history`로 돌아갔을 때 해당 항목은 목록에서 사라져 있어야 한다.

#### 2) 광고 제거 구매 상태
- Key: `rentcheck:purchase:v1`
- Shape:
```ts
export interface PurchaseStorageV1 {
  v: 1;
  adSkipPurchased: boolean; // default false
  purchasedAt: number | null; // epoch ms
  transactionId: string | null; // SDK가 제공하는 경우 저장, 없으면 null
}
```
- Size estimate: < 1KB

#### 3) 공유 링크 최근 생성(옵션: UX 편의)
- Key: `rentcheck:lastShare:v1`
- Shape:
```ts
export interface LastShareStorageV1 {
  v: 1;
  lastUrl: string;     // length typically < 2000
  createdAt: number;   // epoch ms
}
```
- Size estimate: < 3KB

> 총합 예상: **30KB 이하** (5MB 제한 대비 충분)

---

### API Contract (external only)
- 외부 API 호출 없음 (SDK 훅 사용: `useTossLogin`, `useTossAd`, `useTossPayment`)
- 따라서 별도 REST API 계약 없음

---

## Feature List

### F1. 프리셋 4종 홈 진입 & 즉시 결과 이동
- Description: 홈 화면에서 프리셋 4종과 “직접 입력하기”를 제공한다. 사용자가 프리셋을 탭하면 해당 기본 입력값으로 바로 결과 화면으로 이동한다. 프리셋 데이터는 코드 상수로 관리하며 네트워크 의존이 없다.
- Data: `PresetScenario`(in-memory), 라우트 state로 `SimulationInput` 전달
- API: N/A
- Requirements:
  - AC-1 [U]: Scenario: 홈 화면 프리셋 4개 노출
    - Given 사용자가 `/`로 진입했을 때
    - When 화면이 렌더링되면
    - Then `ListRow`로 프리셋 항목이 정확히 4개 표시됨
    - And “직접 입력하기” `Button`이 표시됨
  - AC-2 [E]: Scenario: 프리셋 탭 시 결과로 이동
    - Given 사용자가 `/`에 있고 프리셋 id가 `"preset-1"`인 항목이 있을 때
    - When 사용자가 해당 프리셋 `ListRow`를 탭하면
    - Then `/result`로 navigate됨
    - And navigation state로 `{ input: { presetId: "preset-1", residenceYears: 10, initialAsset: 50000000, housePriceGrowthRate: 2, investmentReturnRate: 4, jeonseDeposit: 300000000, jeonseLoanRatio: 70, jeonseInterestRate: 4, monthlyDeposit: 10000000, monthlyRent: 1200000, monthlyRentIncreaseRate: 3, buyPrice: 500000000, buyEquity: 200000000, buyLoanInterestRate: 4, buyLoanPeriodYears: 30, buyRepaymentType: "원리금균등" }, source: "preset" }`가 전달됨
  - AC-3 [E]: Scenario: 직접 입력하기 진입
    - Given 사용자가 `/`에 있을 때
    - When “직접 입력하기” `Button`을 탭하면
    - Then `/input`으로 navigate됨
    - And navigation state는 `undefined`임
  - AC-4 [W]: Scenario: 외부 도메인 이탈 차단(기능 미제공)
    - Given 사용자가 홈 화면에 있을 때
    - When 사용자가 프리셋/버튼을 통해 이동을 시도하면
    - Then `window.open` 또는 `window.location.href`를 호출하는 코드 경로가 실행되지 않음
  - AC-5 [S]: Scenario: 프리셋 리스트 터치 타겟
    - Given 사용자가 `/`에 있을 때
    - While 프리셋 `ListRow`가 표시되는 동안
    - Then 각 `ListRow`의 탭 가능한 높이가 44px 이상임(TDS 기본)
  - AC-6 [W]: Scenario: 잘못된 프리셋 데이터 방어
    - Given 프리셋 `"preset-1"`의 defaults에 `buyEquity: 600000000`와 `buyPrice: 500000000`가 들어있을 때
    - When 사용자가 해당 프리셋을 탭하면
    - Then `Toast`로 `"프리셋 데이터를 불러올 수 없어요"`가 표시됨
    - And `/result`로 navigate되지 않음
  - AC-7 [W]: Scenario: 프리셋 ID 형식 위반 방어
    - Given 프리셋 목록에 `id: "foo"`(정규식 `^preset-(1|2|3|4)$` 불일치)인 항목이 있을 때
    - When 사용자가 해당 항목 `ListRow`를 탭하면
    - Then `Toast`로 `"프리셋 데이터를 불러올 수 없어요"`가 표시됨
    - And `/result`로 navigate되지 않음

---

### F2. 3탭 입력 폼 + 공통 설정 입력 및 유효성 검증
- Description: 입력 화면에서 전세/월세/매매 탭을 전환하며 값을 입력하고, 공통 설정(초기자산/거주기간/수익률/집값상승률)을 함께 입력한다. 제출 시 유효성 검증을 통과하면 결과 화면으로 이동한다.
- Data: `SimulationInput`(in-memory), 라우트 state 전달
- API: N/A
- Requirements:
  - AC-1 [E]: Scenario: 입력 제출 성공
    - Given 사용자가 `/input`에 있고 토스 로그인된 유저가 있을 때
    - When 사용자가 공통 설정에 `{ initialAsset: 50000000, residenceYears: 10, investmentReturnRate: 4, housePriceGrowthRate: 2 }`를 입력하고
    - And 전세 탭에 `{ jeonseDeposit: 300000000, jeonseLoanRatio: 70, jeonseInterestRate: 4 }`를 입력하고
    - And 월세 탭에 `{ monthlyDeposit: 10000000, monthlyRent: 1200000, monthlyRentIncreaseRate: 3 }`를 입력하고
    - And 매매 탭에 `{ buyPrice: 500000000, buyEquity: 200000000, buyLoanInterestRate: 4, buyLoanPeriodYears: 30, buyRepaymentType: "원리금균등" }`를 입력한 뒤
    - And “결과 보기” `Button`을 탭하면
    - Then `/result`로 navigate됨
    - And navigation state로 `{ source: "manual", input: { presetId: null, ... } }`가 전달됨
  - AC-2 [W]: Scenario: 거주기간 최소값 위반
    - Given 사용자가 `/input`에 있을 때
    - When 사용자가 `{ residenceYears: 0 }`을 입력하고 “결과 보기”를 탭하면
    - Then `Typography`로 `"거주기간은 1~30년만 입력할 수 있어요"`가 표시됨
    - And `/result`로 navigate되지 않음
  - AC-3 [W]: Scenario: 매매 자기자본이 매매가 초과
    - Given 사용자가 `/input`에 있을 때
    - When 사용자가 매매 탭에서 `{ buyPrice: 500000000, buyEquity: 600000000 }`를 입력하면
    - Then 해당 필드 영역에 `"자기자본은 매매가를 넘을 수 없어요"`가 표시됨
    - And “결과 보기” 버튼이 disabled 상태임
  - AC-4 [W]: Scenario: 금리 범위 위반
    - Given 사용자가 `/input`에 있을 때
    - When 사용자가 전세 금리에 `{ jeonseInterestRate: 35 }`를 입력하면
    - Then `"금리는 0~30%만 입력할 수 있어요"`가 표시됨
  - AC-5 [S]: Scenario: 모바일 키보드 입력 모드
    - Given 사용자가 `/input`에 있을 때
    - While 사용자가 `monthlyRent` 입력 필드를 탭했을 때
    - Then 해당 `TextField`는 `inputMode="numeric"` 속성을 가짐
  - AC-6 [E]: Scenario: prefill로 진입 시 초기값 채움
    - Given 사용자가 `/input`으로 navigate할 때 state가 `{ prefill: { residenceYears: 5, initialAsset: 30000000 } }`일 때
    - When 화면이 렌더링되면
    - Then 공통 설정 `TextField`에 `residenceYears=5`, `initialAsset=30000000`이 초기값으로 표시됨
  - AC-7 [E]: Scenario: 포커스 시 스크롤 보정(키보드)
    - Given 사용자가 `/input`에서 화면 하단에 있는 `buyLoanPeriodYears` 필드가 보이지 않는 상태일 때
    - When 사용자가 해당 필드를 탭해 포커스하면
    - Then 300ms 이내에 해당 필드가 화면 중앙 근처에 보이도록 스크롤 이동이 수행됨
  - AC-8 [W]: Scenario: 숫자 파싱 실패 방어
    - Given 사용자가 `/input`에 있을 때
    - When 사용자가 `initialAsset`에 `"12,000,000원"` 문자열을 붙여넣고 제출을 탭하면
    - Then `"숫자만 입력해주세요"`가 표시됨
    - And `/result`로 navigate되지 않음

---

### F3. 시뮬레이션 계산 엔진(순수 함수) + 추천/인사이트 생성
- Description: 입력값을 받아 연도별 순자산(`netWorthByYear`)과 최종 순자산(`finalNetWorth`)을 계산한다. 최종 순자산이 가장 큰 옵션을 `recommendedOption`으로 선택하고, 집값상승률을 +1% 했을 때의 1위 옵션 순자산 차이로 `insightCopy`를 생성한다.
- Data: `SimulationInput` → `SimulationResultCore` (메모리)
- API: N/A
- Requirements:
  - AC-1 [U]: Scenario: 계산 함수의 결정성
    - Given 동일한 입력 `inputA`가 있을 때
    - When `simulate(inputA)`를 2번 호출하면
    - Then 두 결과의 `finalNetWorth.jeonse`, `finalNetWorth.monthly`, `finalNetWorth.buy` 값이 완전히 동일함
  - AC-2 [E]: Scenario: 연도별 배열 길이
    - Given `residenceYears: 10`인 입력이 있을 때
    - When `simulate(input)`를 호출하면
    - Then `netWorthByYear.length`는 `11`임
    - And `netWorthByYear[0].year`는 `0`임
    - And `netWorthByYear[10].year`는 `10`임
  - AC-3 [E]: Scenario: 추천 옵션 선택 규칙(동률 처리)
    - Given `finalNetWorth`가 `{ jeonse: 100, monthly: 100, buy: 90 }`로 계산되는 입력이 있을 때
    - When 결과가 생성되면
    - Then `recommendedOption`은 `"jeonse"`임 (동률 우선순위: jeonse > monthly > buy)
  - AC-4 [E]: Scenario: 인사이트 문장 생성 포맷
    - Given 입력의 `housePriceGrowthRate: 2`이고 결과 추천이 `"buy"`일 때
    - When 인사이트가 생성되면
    - Then `insightCopy`는 `"집값상승률이 3%라면 매매가 1위와의 격차가 바뀔 수 있어요"` 형식으로 시작하지 않고
    - And 정확히 `"집값상승률을 3%로 올리면 1위 옵션의 순자산이 "`로 시작함
  - AC-5 [W]: Scenario: NaN/Infinity 방지
    - Given 입력에 `{ buyLoanPeriodYears: 0 }`이 포함될 때
    - When `simulate(input)`가 호출되면
    - Then 함수는 예외를 throw하지 않고
    - And 호출 결과는 `{ error: "대출기간은 1~40년만 입력할 수 있어요" }` 형태의 에러를 반환하는 경로로 처리됨(구현: Result 화면에서 에러 상태로 표시)
  - AC-6 [W]: Scenario: 초기자산 부족 시 옵션별 에러 처리
    - Given 입력이 `{ initialAsset: 1000000, jeonseDeposit: 300000000, jeonseLoanRatio: 0, monthlyDeposit: 10000000, buyEquity: 200000000 }`일 때
    - When 결과 생성을 시도하면
    - Then 결과 화면 에러 상태에서 `"초기자산이 부족해요"`가 표시됨
  - AC-7 [S]: Scenario: 계산 중 로딩 상태
    - Given 사용자가 결과 화면에서 공통 설정을 변경해 재계산이 트리거될 때
    - While 재계산이 진행되는 200ms 이내의 구간 동안
    - Then `Typography`로 `"계산 중..."`이 표시됨

> Note(구현 가이드): F3는 UI가 아니라 순수 계산 모듈이며, 에러 처리는 `Result` 렌더링 레이어에서 고정 문구로 노출한다.

---

### F4. 결과 화면 렌더링 + 리워드 광고 게이트 + 배너 광고(AdSlot)
- Description: 결과 화면에서 3옵션 최종 순자산 카드, 추천 뱃지, 인사이트 1줄, 연도별 라인 차트, 비용 분석표를 보여준다. 결과 노출 직전에 TossRewardAd로 게이트하며, 배너 AdSlot 1개를 콘텐츠 사이에 배치한다.
- Data: `SimulationInput`(route state), `PurchaseStorageV1`(ad skip 여부)
- API: N/A
- Requirements:
  - AC-1 [E]: Scenario: 결과 보기 전 보상형 광고 게이트(미구매)
    - Given localStorage `rentcheck:purchase:v1`가 `{ v: 1, adSkipPurchased: false, purchasedAt: null, transactionId: null }`일 때
    - And 사용자가 `/result`로 `{ source: "manual", input: (유효한 입력) }` state를 가지고 진입했을 때
    - When 화면이 처음 렌더링되면
    - Then `TossRewardAd` 게이트 UI가 표시됨
    - And 결과 카드/차트/비용표는 표시되지 않음
  - AC-2 [E]: Scenario: 광고 시청 완료 후 결과 노출
    - Given AC-1과 동일한 조건일 때
    - When 사용자가 `TossRewardAd` 시청을 완료하면
    - Then 1초 이내에 결과 카드 3개가 표시됨
    - And 추천 옵션에 해당하는 `Chip`(예: `"추천"`)이 표시됨
  - AC-3 [O]: Scenario: 광고 제거 구매 시 게이트 스킵
    - Given localStorage `rentcheck:purchase:v1`가 `{ v: 1, adSkipPurchased: true, purchasedAt: 1710000000000, transactionId: "tx_123" }`일 때
    - When 사용자가 `/result`로 진입하면
    - Then `TossRewardAd` 게이트가 표시되지 않음
    - And 결과 카드/차트/비용표가 즉시 표시됨
  - AC-4 [U]: Scenario: 배너 광고 위치 고정(겹침 금지)
    - Given 사용자가 결과 화면에서 결과 콘텐츠를 보고 있을 때
    - When 화면이 렌더링되면
    - Then `AdSlot` 1개가 “차트 섹션” 다음, “비용 분석표” 이전에 배치됨
    - And `AdSlot`은 fixed/absolute 오버레이로 콘텐츠를 가리지 않음
  - AC-5 [W]: Scenario: 라우트 state 누락 시 에러 화면
    - Given 사용자가 브라우저 리프레시로 `/result`에 state 없이 진입했을 때
    - When 화면이 렌더링되면
    - Then `Typography`로 `"잘못된 접근입니다"`가 표시됨
    - And “홈으로” `Button`이 표시됨
  - AC-6 [E]: Scenario: 차트 터치 툴팁
    - Given 결과 화면에 `netWorthByYear`가 11개(0~10년) 표시될 때
    - When 사용자가 5년 포인트 영역(반경 22px) 을 탭하면
    - Then `Typography`로 `"5년"`과 `"전세"`, `"월세"`, `"매매"` 값이 포함된 툴팁이 표시됨
  - AC-7 [S]: Scenario: 결과 화면 로딩 상태(광고 로딩)
    - Given 사용자가 미구매 상태로 `/result`에 진입했을 때
    - While `TossRewardAd`가 준비되지 않은 동안
    - Then `Typography`로 `"광고 로딩 중..."`이 표시됨
  - AC-8 [W]: Scenario: 프로덕션