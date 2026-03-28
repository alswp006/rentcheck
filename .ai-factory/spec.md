# SPEC (Fixed)

## Common Principles

- **플랫폼/기술**
  - 클라이언트: Vite + React + TypeScript
  - 라우팅: `react-router-dom` (client-side)
  - UI: `@toss/tds-mobile` 컴포넌트만 사용(간격은 `Spacing`만 사용)
  - 저장소: `localStorage` (총 사용량 5MB 이하 목표)
- **MVP 범위 준수**
  - 서버/DB/동기화 없음
  - 실거래가/매물 검색 없음
  - 세금/규제 정밀 계산 없음
  - 금융상품 판매/추천/중개 없음
- **HTTP API**
  - **No HTTP API — 외부/내부 어떤 HTTP 엔드포인트도 사용하지 않음**
  - 모든 영속 데이터는 **localStorage**로만 저장/조회함
- **광고/수익화**
  - 리워드 광고 게이트: **새로운 결과(계산/분석/추천 결과)** 노출 직전 `TossRewardAd`로 **1회 게이트**
    - 적용: `/simulate`에서 “결과 보기”로 **새 결과 생성** 시
    - **면제**: `/history`에서 저장된 항목을 다시 열어 **재열람**하는 경우(추가 리워드 광고 게이트 없음)
  - **리워드 광고 게이트 집행 위치(명확화)**
    - 리워드 광고 게이트는 **S2(`/simulate`)의 “결과 보기” 액션에서만** 집행한다.
    - `/result`는 어떤 진입 경로이든(**simulate에서 이동**, **history에서 이동**) **리워드 광고 게이트를 자체적으로 표시/요구하지 않는다.**
    - 즉, **history → /result 경로는 게이트를 건너뛴다**(S4 Navigation contract 및 S3 AC 참조).
  - 배너 광고: 결과 화면 최하단(분석표 이후) `AdSlot` 1개 고정 배치(콘텐츠와 겹치지 않음)
- **모바일 UX**
  - 모든 인터랙티브 요소의 터치 타겟은 **최소 44px**
  - 폼 입력은 모바일 키보드 대응:
    - 숫자 입력: `TextField`에 `inputMode="numeric"` 및 `pattern="[0-9]*"` 적용
    - 포커스 시 해당 입력이 화면 중앙에 오도록 `scrollIntoView({ block: "center" })` 호출
- **토스 미니앱 검수 준수(필수)**
  - 외부 도메인 이탈 금지: `window.location.href`, `window.open`로 외부 URL 이동을 구현하지 않음
  - 프로덕션 빌드에서 `console.error` 호출이 **0건**
  - 외부 API 호출이 없으므로 CORS 이슈가 발생하지 않도록 설계(외부 호출 N/A)
  - Android 7+, iOS 16+ 호환(최신 전용 API 사용 금지; `navigator.share`는 **있을 때만** 사용하고 fallback 제공)

---

## Storage Contracts (localStorage 전용)

> 본 MVP는 HTTP API가 없으므로, 모든 데이터 영속 동작을 **Storage Contract**로 정의한다.  
> 키는 **반드시** `tossUserId` 스코프를 포함한다(공유 기기/다중 계정 대비).  
> 에러는 **throw로 앱 크래시 금지**(모든 에러는 UI로 회복 처리).

### Error Codes (표준화)

- `STORAGE_UNAVAILABLE`
  - 정의: `window.localStorage` 접근 시 `SecurityError` 등으로 사용 불가
- `STORAGE_PARSE_ERROR`
  - 정의: `JSON.parse` 실패(손상/변조/부분 저장)
- `STORAGE_QUOTA_EXCEEDED`
  - 정의: `localStorage.setItem`이 `QuotaExceededError`를 throw
- `STORAGE_WRITE_FAILED`
  - 정의: 위 3개 외의 setItem 실패(예: 알 수 없는 DOMException)

### SC-1. Draft Input 저장/복원

- **Key**
  - `rc_draft_input_v1:${tossUserId}`
- **Value shape**
  - `SimulationInput` JSON string
- **READ**
  - 입력: `(tossUserId: string) => { ok: true; value: SimulationInput } | { ok: false; errorCode: 'STORAGE_UNAVAILABLE'|'STORAGE_PARSE_ERROR'; fallback: 'DEFAULT_INPUT' }`
  - 동작
    - key 미존재: `{ ok: false, errorCode: 'STORAGE_PARSE_ERROR', fallback: 'DEFAULT_INPUT' }`가 아니라 **정상적인 빈 케이스**로 간주하여 기본 입력을 사용(= 에러 UI 없음)
    - JSON.parse 실패: `{ ok: false, errorCode: 'STORAGE_PARSE_ERROR', fallback: 'DEFAULT_INPUT' }`
- **WRITE**
  - 입력: `(tossUserId: string, input: SimulationInput) => { ok: true } | { ok: false; errorCode: 'STORAGE_UNAVAILABLE'|'STORAGE_QUOTA_EXCEEDED'|'STORAGE_WRITE_FAILED' }`
  - 동작
    - 실패 시 **기존 저장값은 변경되지 않아야 함**(setItem throw는 저장 전 발생하므로 catch 후 종료)
- **UI behavior**
  - `STORAGE_PARSE_ERROR`(손상): `/simulate`에서 `Toast` 텍스트 **"임시 저장 데이터를 불러올 수 없어요. 기본값으로 시작할게요"** 노출 후 기본값 사용
  - `STORAGE_UNAVAILABLE`: `/simulate`에서 `Toast` 텍스트 **"저장소에 접근할 수 없어요. 이 기기에서는 임시 저장이 꺼져요"** 노출, 이후 draft 저장 시도 중단(세션 내 플래그로 비활성)
  - `STORAGE_QUOTA_EXCEEDED`: draft는 UX 핵심이 아니므로 `/simulate`에서 `Toast` 텍스트 **"저장공간이 부족해 임시 저장을 할 수 없어요"** 노출(다이얼로그 금지), 입력 진행은 허용

#### SC-1 Acceptance Criteria (EARS, pass/fail)

- **SC1-AC-1 [E] 키 미존재는 기본값 사용(에러 UI 없음)**
  - WHEN `rc_draft_input_v1:${tossUserId}` 키가 localStorage에 존재하지 않을 때 SC-1 READ를 호출하면, the system SHALL `{ ok: true }`를 반환하지 않고도(정상 빈 케이스로 간주) **기본 입력값을 사용하도록 호출부가 분기**해야 한다.
  - **Pass**: `/simulate` 최초 진입 시 localStorage에 draft 키가 없어도 `AlertDialog`/에러 토스트가 표시되지 않고, 입력 폼이 기본값으로 렌더링된다.
  - **Fail**: 키 미존재를 `STORAGE_PARSE_ERROR`로 취급하여 에러 UI가 노출되거나 화면 진입이 중단된다.

- **SC1-AC-2 [E] WRITE 성공 시 동일 JSON이 저장됨**
  - WHEN SC-1 WRITE를 `{ tossUserId: 'u_123', input }`로 호출하고 localStorage가 정상 동작할 때, the system SHALL `rc_draft_input_v1:u_123`에 `JSON.stringify(input)` 결과를 저장해야 한다.
  - **Pass**: 저장 직후 `localStorage.getItem('rc_draft_input_v1:u_123')`를 `JSON.parse` 했을 때 모든 필드가 `input`과 값 동등(primitive deep equal)하다.
  - **Fail**: 일부 필드 누락/타입 변환(문자열로 저장 등)/키 스코프 누락이 발생한다.

- **SC1-AC-3 [W] JSON.parse 실패 시 오류 코드와 UI 처리**
  - WHEN `rc_draft_input_v1:${tossUserId}`의 값이 `not-json` 등 파싱 불가능한 문자열일 때 SC-1 READ를 호출하면, the system SHALL `{ ok: false, errorCode: 'STORAGE_PARSE_ERROR', fallback: 'DEFAULT_INPUT' }`를 반환해야 한다.
  - **Pass**: `/simulate`에서 토스트 `"임시 저장 데이터를 불러올 수 없어요. 기본값으로 시작할게요"`가 1회 표시되고, 폼이 기본값으로 렌더링된다.
  - **Fail**: 예외 throw로 크래시하거나, 손상 데이터가 그대로 입력값에 반영된다.

- **SC1-AC-4 [W] STORAGE_UNAVAILABLE 시 세션 내 draft 저장 비활성**
  - WHEN localStorage 접근이 `SecurityError`로 실패하여 SC-1 READ 또는 WRITE가 `STORAGE_UNAVAILABLE`을 반환할 때, the system SHALL `/simulate`에서 토스트 `"저장소에 접근할 수 없어요. 이 기기에서는 임시 저장이 꺼져요"`를 표시하고 **동일 세션 동안 추가 WRITE 시도를 0회로 유지**해야 한다.
  - **Pass**: 이후 입력 변경을 여러 번 해도 `localStorage.setItem` 호출이 더 이상 발생하지 않는다(세션 내 플래그로 차단).
  - **Fail**: STORAGE_UNAVAILABLE 이후에도 계속 setItem을 시도하거나, AlertDialog로 흐름이 막힌다.

- **SC1-AC-5 [W] QUOTA_EXCEEDED 시 기존 값 불변**
  - WHEN `localStorage.setItem`이 `QuotaExceededError`를 throw하는 환경에서 SC-1 WRITE를 호출하면, the system SHALL `{ ok: false, errorCode: 'STORAGE_QUOTA_EXCEEDED' }`를 반환하고 **기존 저장 문자열을 변경하지 않아야 한다**.
  - **Pass**: setItem 호출 전 `getItem(key)` 값과, 실패 후 `getItem(key)` 값이 문자열 동일하다.
  - **Fail**: 부분 저장/빈 문자열 저장 등으로 기존 값이 변경된다.

---

### SC-2. History 저장/복원/삭제

- **Key**
  - `rc_history_v1:${tossUserId}`
- **Value shape**
  - `HistoryEntry[]` JSON string
  - 정렬: **최신이 앞(index 0)**
  - 최대 길이: **5**
- **Pagination contract (명시적 예외)**
  - 본 MVP의 히스토리 리스트는 **localStorage 기반 + 최대 5개 고정 캡**이므로 페이지 개념이 실질적으로 존재하지 않는다.
  - 따라서 SC-2 READ는 표준 `{ items, total, page }` 엔벨로프 대신 `HistoryEntry[]`를 직접 반환하는 것으로 **명시적으로 예외 처리**한다.
  - **근거**: 서버 엔드포인트가 없고, 최대 5개로 고정되어 스크롤/페이지네이션이 필요하지 않음.
- **READ**
  - 입력: `(tossUserId: string) => { ok: true; value: HistoryEntry[] } | { ok: false; errorCode: 'STORAGE_UNAVAILABLE'|'STORAGE_PARSE_ERROR'; fallback: 'EMPTY_ARRAY' }`
  - 동작
    - key 미존재: `{ ok: true, value: [] }`
    - JSON.parse 실패: `{ ok: false, errorCode: 'STORAGE_PARSE_ERROR', fallback: 'EMPTY_ARRAY' }`
- **UPSERT(=추가 저장)**
  - 입력: `(tossUserId: string, entry: HistoryEntry) => { ok: true; value: HistoryEntry[] } | { ok: false; errorCode: 'STORAGE_UNAVAILABLE'|'STORAGE_PARSE_ERROR'|'STORAGE_QUOTA_EXCEEDED'|'STORAGE_WRITE_FAILED' }`
  - 동작(원자 규칙)
    1. READ로 기존 배열을 확보(실패 시 `[]`로 간주하지 않고 **에러 반환**; 손상 상태에서 덮어쓰기 금지)
    2. 새 entry를 배열 앞에 추가
    3. 길이가 6 이상이면 **쓰기 전에** 마지막 항목(가장 오래된 항목, index 5 이후)을 제거하여 길이 5로 맞춤
    4. setItem 수행
- **DELETE ALL**
  - 입력: `(tossUserId: string) => { ok: true } | { ok: false; errorCode: 'STORAGE_UNAVAILABLE'|'STORAGE_WRITE_FAILED' }`
  - 동작: `removeItem` 또는 `setItem('[]')` 중 하나로 구현하되, 성공 조건은 **이후 READ 시 빈 배열**이어야 함
- **UI behavior**
  - `STORAGE_PARSE_ERROR`: `/history`에서 `Paragraph.Text` **"히스토리를 불러올 수 없어요"** 표시 + 목록 0개(크래시 금지)
  - `STORAGE_QUOTA_EXCEEDED`: `/result`에서 저장 시 `AlertDialog` 메시지 **"저장공간이 부족해 히스토리를 저장할 수 없어요"** + 저장 동작 중단
  - `STORAGE_UNAVAILABLE`: `/result`에서 저장 시 `AlertDialog` 메시지 **"저장소에 접근할 수 없어요. 이 기기에서는 히스토리를 저장할 수 없어요"**
- **Cascade(내장 결과 포함)**
  - `HistoryEntry.result`는 `HistoryEntry`에 **임베드**되어 저장됨
  - **HistoryEntry가 삭제되면(전체 삭제 포함) 임베드된 result도 함께 제거된 것으로 간주**(별도 키/레코드 없음)

#### SC-2 Acceptance Criteria (EARS, pass/fail)

- **SC2-AC-1 [E] READ: 키 미존재 시 빈 배열**
  - WHEN `rc_history_v1:${tossUserId}` 키가 localStorage에 존재하지 않을 때 SC-2 READ를 호출하면, the system SHALL `{ ok: true, value: [] }`를 반환해야 한다.
  - **Pass**: `/history` 진입 시 빈 상태 문구가 표시되고 ListRow가 0개이며, 에러 문구는 표시되지 않는다.
  - **Fail**: 키 미존재를 parse error로 처리하거나 크래시한다.

- **SC2-AC-2 [E] UPSERT: 최신이 앞 + 길이 5 캡**
  - WHEN 기존 히스토리가 5개이고 SC-2 UPSERT를 1회 호출할 때, the system SHALL 결과 배열 길이를 `5`로 유지하고, 새 entry를 `index 0`에 배치해야 하며, 기존의 가장 오래된 항목(이전 배열의 마지막)을 제거해야 한다.
  - **Pass**: UPSERT 반환 `value.length===5` 이고 `value[0].id===newEntry.id` 이며, 이전 마지막 항목의 `id`가 결과 배열에 존재하지 않는다.
  - **Fail**: 길이가 6이 되거나, 정렬이 뒤집히거나, 임의 항목이 제거된다.

- **SC2-AC-3 [W] READ parse error 시 덮어쓰기 금지 + 빈 목록 표시**
  - WHEN `rc_history_v1:${tossUserId}` 값이 파싱 불가능한 문자열일 때 SC-2 READ를 호출하면, the system SHALL `{ ok: false, errorCode: 'STORAGE_PARSE_ERROR', fallback: 'EMPTY_ARRAY' }`를 반환해야 한다.
  - AND WHEN 위 상태에서 SC-2 UPSERT를 호출하면, the system SHALL `{ ok: false, errorCode: 'STORAGE_PARSE_ERROR' }`(또는 READ 에러를 그대로 반영하는 실패)로 실패 처리하고 **setItem을 0회 호출**해야 한다.
  - **Pass**: `/history`에는 `"히스토리를 불러올 수 없어요"`가 표시되고 목록은 0개이며, `/result` 저장 시도 시 손상 상태를 덮어쓰지 않는다.
  - **Fail**: 손상된 문자열 위에 `[]` 또는 새 배열로 덮어써 데이터 복구 불가능 상태를 만든다.

- **SC2-AC-4 [W] QUOTA_EXCEEDED 시 기존 히스토리 불변**
  - WHEN `localStorage.setItem`이 `QuotaExceededError`를 throw하는 환경에서 SC-2 UPSERT를 호출하면, the system SHALL `{ ok: false, errorCode: 'STORAGE_QUOTA_EXCEEDED' }`를 반환하고 **기존 `rc_history_v1:${tossUserId}` 문자열을 변경하지 않아야 한다**.
  - **Pass**: 실패 전후 `getItem(key)` 값이 문자열 동일하고, UI에서 `"저장공간이 부족해 히스토리를 저장할 수 없어요"` AlertDialog가 표시된다.
  - **Fail**: 일부 저장이 반영되거나 빈 배열로 초기화된다.

- **SC2-AC-5 [E] DELETE ALL 성공 조건은 이후 READ 빈 배열**
  - WHEN SC-2 DELETE ALL이 `{ ok: true }`를 반환했을 때, the system SHALL 직후 SC-2 READ에서 `{ ok: true, value: [] }`를 반환해야 한다.
  - **Pass**: `/history`에서 전체 삭제 확인 후 목록이 즉시 0개로 리렌더링되고, 재진입해도 0개다.
  - **Fail**: 삭제 성공을 반환했지만 재진입 시 항목이 남아 있다.

---

## Screen Definitions

> 타입 표기 규칙: navigation state는 React Router의 `navigate(path, { state })`를 기준으로 명시한다.

#### S1. 홈(프리셋 선택) — `/`
- **목적**: 프리셋 4종을 선택하거나 직접 입력으로 시뮬레이션 진입
- **TDS 컴포넌트**
  - `Top` (타이틀: "RentCheck")
  - `Paragraph.Text` (설명 문구)
  - `ListRow` x 4 (프리셋 카드 역할)
  - `Chip` (옵션 태그: "전세", "월세", "매매" 등 표시)
  - `Button` (직접 입력)
  - `Spacing`
- **리스트 스크롤**
  - 프리셋은 최대 4개로 고정 → 가상 스크롤 미적용, 화면 높이 초과 시 native scroll
- **상태**
  - Loading: 없음(정적 프리셋)
  - Empty: 없음(프리셋 4개는 번들에 포함)
  - Error: 없음
- **터치**
  - `ListRow` 전체 영역 탭 가능(>=44px)
  - CTA 버튼 높이 기본값 사용(>=44px)
- **Navigation state contract**
  - Outgoing
    - 프리셋 ListRow 탭 → `navigate('/simulate', { state: { presetId: string, source: 'home' } })`
    - "직접 입력" 버튼 → `navigate('/simulate', { state: { source: 'home' } })`
  - Incoming
    - 없음

#### S2. 입력(시뮬레이션 조건) — `/simulate`
- **목적**: 전세/월세/매매 입력 + 공통 가정 입력 후 “결과 보기”
- **TDS 컴포넌트**
  - `Top` (뒤로가기)
  - `TabBar` (탭 3개: "전세", "월세", "매매")
  - `TextField` (금액/비율/기간 입력)
  - `Paragraph.Text` (섹션 라벨/가이드)
  - `Button` (결과 보기)
  - `Toast` (저장/오류 안내)
  - `AlertDialog` (치명 오류)
  - `Spacing`
- **키보드**
  - 모든 숫자 필드는 `inputMode="numeric"`
  - 포커스 시 해당 필드 `scrollIntoView({ block: 'center' })`
- **상태**
  - Loading: 최초 진입 시 draft/preset hydrate 중 `Button` 비활성 + 문구 "불러오는 중..."
  - Empty: 없음
  - Error: URL 공유 입력 디코딩 실패/라우팅 state 누락 시 `AlertDialog` 노출 후 홈으로 이동
- **터치**
  - 탭 전환, 제출 버튼 모두 >=44px
- **Navigation state contract**
  - Incoming
    - `location.state = { presetId: string; source: 'home' | 'history' | 'share' } | { input: SimulationInput; source: 'home' | 'history' | 'share' } | { source: 'home' | 'history' | 'share' } | null`
  - Outgoing
    - "결과 보기" 버튼(리워드 광고 완료 후) →  
      `navigate('/result', { state: { input: SimulationInput, label: string, source: 'simulate' } })`

#### S3. 결과 — `/result`
- **목적**: 최종 순자산 비교, 추천 옵션, 인사이트, 차트/비용분석표 노출 + 배너 광고 + 조건 수정/공유/히스토리 저장
- **TDS 컴포넌트**
  - `Top`
  - `Paragraph.Text` (인사이트 1줄, 라벨)
  - `ListRow` (옵션별 결과 카드 3개)
  - `Chip` ("추천" 배지)
  - `Button` (조건 수정하기, 공유하기, 히스토리 저장, 히스토리 보기)
  - `BottomSheet` (조건 수정)
  - `Toast` (저장/복사 성공)
  - `AlertDialog` (오류)
  - `Spacing`
  - `AdSlot` (분석표 이후 1개)
- **차트**
  - TDS에 차트 컴포넌트가 없으므로 커스텀 SVG/Canvas 컴포넌트 사용(레이아웃 목적의 최소 CSS만)
  - 차트 터치 시 툴팁은 `Toast`로 표시(44px 이상 터치 가능한 포인트 영역 제공)
- **상태**
  - Loading: `location.state` hydrate 전에는 "결과 불러오는 중..." 표시
  - Empty: state 누락 시 빈 화면 대신 `AlertDialog` → 확인 시 `/simulate`로 이동
  - Error: localStorage 저장 실패 시 `AlertDialog`
- **Navigation state contract**
  - Incoming
    - `location.state = { input: SimulationInput; label: string; source?: 'simulate' | 'history' } | null`
  - Outgoing
    - "히스토리 보기" → `navigate('/history', { state: { source: 'result' } })`
    - (공유 플로우는 외부 이동 없이 링크 생성/복사 또는 `navigator.share` 사용)

#### S4. 히스토리 — `/history`
- **목적**: 최근 5개 결과 재접속
- **TDS 컴포넌트**
  - `Top`
  - `ListRow` (히스토리 항목)
  - `Button` (전체 삭제)
  - `AlertDialog` (삭제 확인)
  - `Paragraph.Text` (빈 상태 안내)
  - `Spacing`
- **리스트 스크롤**
  - 최대 5개 고정 → 가상 스크롤 미적용, native scroll
- **상태**
  - Loading: localStorage 로드 중 "불러오는 중..."
  - Empty: 항목 0개면 안내문 "저장된 히스토리가 없어요"
  - Error: 로드 실패 시 "히스토리를 불러올 수 없어요"
- **리스트 표시 계약(ListRow display contract)**
  - 정렬: **SC-2 저장 순서 그대로 표시(최신이 위)**
  - 각 히스토리 `ListRow`는 아래 정보를 표시해야 한다.
    - `title`: `HistoryEntry.label` (그대로 표시)
    - `right` 또는 `subText`(구현 가능한 영역 사용): `createdAt`을 로컬 시간 기준 `YYYY.MM.DD`로 포맷한 날짜 문자열
  - 금지: 결과 재계산(=새 결과 생성) 또는 리워드 광고 게이트 표시를 `/history` 목록 렌더/탭에서 트리거하지 않음(재열람 플로우 유지).
- **Navigation state contract**
  - Incoming
    - `location.state = { source: 'result' | 'home' } | null`
  - Outgoing
    - 히스토리 ListRow 탭 → `navigate('/result', { state: { input: SimulationInput, label: string, source: 'history' } })`
      - 주의: **히스토리 재열람은 리워드 광고 게이트를 다시 요구하지 않음**(Common Principles 참조)
      - **명시**: 이 outgoing navigation은 **S2(`/simulate`)를 거치지 않으며**, `TossRewardAd`를 호출하지 않는다(게이트 집행은 S2에서만).

#### S5. 공유 링크 진입(디코딩) — `/share?v=1&input=...`
- **목적**: Base64로 인코딩된 입력을 복원하여 `/simulate`로 전달
- **TDS 컴포넌트**
  - `Top`
  - `Paragraph.Text`
  - `Button` ("이 조건으로 열기")
  - `AlertDialog` (디코딩 실패)
  - `Spacing`
- **상태**
  - Loading: 쿼리 파싱/디코딩 중 "불러오는 중..."
  - Empty: `input` 쿼리 없으면 에러
  - Error: 디코딩/검증 실패 시 에러 다이얼로그 후 홈 이동
- **Navigation state contract**
  - Incoming
    - `location.search`로만 입력을 받음(state 없음)
  - Outgoing
    - "이 조건으로 열기" → `navigate('/simulate', { state: { input: SimulationInput, source: 'share' } })`

---

## Screen Acceptance Criteria (S1–S4 전용, EARS, pass/fail)

> 표기: [U]ubiquitous / [S]tate-driven / [E]vent-driven / [W]Unwanted(실패/예외)

### S1 ACs — 홈(`/`)

- **S1-AC-1 [S] 프리셋 4개 렌더링**
  - WHEN 라우트가 `/`로 렌더링될 때, the system SHALL `ListRow`를 정확히 4개 렌더링해야 한다.
  - **Pass**: 화면 트리에서 프리셋 역할의 `ListRow`가 4개다.
  - **Fail**: 3개 이하 또는 5개 이상 표시된다.

- **S1-AC-2 [E] 프리셋 탭 시 /simulate로 이동**
  - WHEN 사용자가 프리셋 `ListRow`(예: id=`preset_young_jeonse`)를 탭하면, the system SHALL `navigate('/simulate', { state: { presetId: 'preset_young_jeonse', source: 'home' } })`를 1회 호출해야 한다.
  - **Pass**: navigate가 정확히 1회, 정확한 path/state로 호출된다.
  - **Fail**: presetId 누락/오타/2회 이상 호출.

- **S1-AC-3 [E] 직접 입력 버튼 탭 시 /simulate로 이동**
  - WHEN 사용자가 `Button` "직접 입력"을 탭하면, the system SHALL `navigate('/simulate', { state: { source: 'home' } })`를 1회 호출해야 한다.
  - **Pass**: presetId 없이 source만 포함하여 이동한다.
  - **Fail**: presetId가 잘못 포함되거나 navigate 미호출.

- **S1-AC-4 [W] 프리셋 렌더 오류(4개 미만) 시 차단**
  - WHEN `/`에서 프리셋이 4개 미만으로 렌더링되는 상태가 감지되면, the system SHALL `AlertDialog`를 표시하고 메시지 텍스트를 `"프리셋을 표시할 수 없어요"`로 표시해야 한다.
  - AND WHEN 사용자가 확인을 탭하면, the system SHALL `navigate('/', { replace: true })`를 1회 호출해야 한다.
  - **Pass**: 다이얼로그 텍스트 일치 + 확인 시 replace 리로드.
  - **Fail**: 빈 화면/크래시/다른 문구.

- **S1-AC-5 [W] 외부 도메인 이탈 금지**
  - WHEN 사용자가 `/`에서 어떤 CTA를 탭하더라도, the system SHALL `window.open`을 0회 호출하고 `window.location.href`에 외부 URL을 대입하지 않아야 한다.
  - **Pass**: 외부 이동 코드 호출이 없다.
  - **Fail**: 외부 도메인 이동 발생.

### S2 ACs — 입력(`/simulate`)

- **S2-AC-1 [S] Hydrate 중 제출 버튼 비활성**
  - WHEN `/simulate`가 draft/preset hydrate 중(`isHydrating=true`)일 때, the system SHALL `"불러오는 중..."` 텍스트를 표시하고 `"결과 보기"` 버튼을 `disabled=true`로 유지해야 한다.
  - **Pass**: 로딩 텍스트 표시 + 버튼 disabled.
  - **Fail**: 로딩 중 버튼 활성/텍스트 미표시.

- **S2-AC-2 [E] presetId 진입 시 프리필 반영**
  - WHEN `/simulate`가 `location.state = { presetId: 'preset_young_jeonse', source: 'home' }`로 진입했을 때, the system SHALL 해당 프리셋의 `defaultInput`을 폼 상태에 적용해야 한다.
  - **Pass**: hydrate 완료 후 `SimulationInput.presetId==='preset_young_jeonse'`이며, 프리셋이 정의한 대표 필드(예: 거주기간)가 기대값으로 표시된다.
  - **Fail**: presetId만 설정되고 나머지 값이 기본값으로 남는다.

- **S2-AC-3 [W] location.state 누락/손상 시 복구 흐름**
  - WHEN 사용자가 `/simulate`에 직접 접근하여 `location.state===null` 이거나, `location.state.presetId`가 4종 프리셋 id에 포함되지 않을 때, the system SHALL `AlertDialog`를 표시하고 메시지를 `"프리셋을 불러올 수 없어요"`로 표시해야 한다.
  - AND WHEN 사용자가 확인을 탭하면, the system SHALL `navigate('/', { replace: true })`를 1회 호출해야 한다.
  - **Pass**: 다이얼로그 표시 + 확인 시 홈 replace 이동.
  - **Fail**: 빈 화면/무한 로딩/크래시.

- **S2-AC-4 [W] Draft 복원 parse error 처리**
  - WHEN SC-1 READ가 `STORAGE_PARSE_ERROR`를 반환할 때, the system SHALL 토스트 `"임시 저장 데이터를 불러올 수 없어요. 기본값으로 시작할게요"`를 1회 표시하고 기본 입력값으로 폼을 렌더링해야 한다.
  - **Pass**: 토스트 1회 + 기본값 렌더.
  - **Fail**: 손상 값 사용/크래시/토스트 문구 불일치.

- **S2-AC-5 [E] 결과 보기 버튼은 광고 완료 후에만 /result로 이동**
  - WHEN 사용자가 유효한 입력으로 `"결과 보기"`를 탭했을 때, the system SHALL `TossRewardAd` 완료 이벤트 이후에만 `navigate('/result', { state: { input, label, source: 'simulate' } })`를 1회 호출해야 한다.
  - **Pass**: 광고 완료 전 navigate 0회, 완료 후 1회.
  - **Fail**: 광고 없이 이동하거나, 완료 전 이동한다.

### S3 ACs — 결과(`/result`)

- **S3-AC-1 [S] state 기반 렌더링(3개 카드 + 배너 1개)**
  - WHEN `/result`가 `location.state`에 `{ input, label }`을 포함해 진입했을 때, the system SHALL 결과 카드 `ListRow`를 정확히 3개(전세/월세/매매) 렌더링하고 `AdSlot`을 정확히 1개 렌더링해야 한다.
  - **Pass**: 결과 카드 3개 + AdSlot 1개.
  - **Fail**: 카드 수 불일치 또는 AdSlot 2개 이상.

- **S3-AC-2 [E] 히스토리 재열람 진입은 리워드 광고 미표시**
  - WHEN `/result`가 `location.state.source === 'history'`로 진입했을 때, the system SHALL `TossRewardAd` UI를 표시하지 않아야 한다.
  - **Pass**: 결과 화면 렌더 동안 TossRewardAd가 0회 마운트/표시된다.
  - **Fail**: 광고 게이트가 표시되거나 결과가 광고 완료를 요구한다.

- **S3-AC-3 [W] state 누락 직접 접근 시 차단**
  - WHEN `/result`가 `location.state === null`로 렌더링될 때, the system SHALL `AlertDialog`를 표시하고 메시지 `"결과를 표시할 수 없어요. 다시 계산해주세요"`를 표시해야 한다.
  - AND WHEN 확인을 탭하면, the system SHALL `navigate('/simulate', { replace: true })`를 1회 호출해야 한다.
  - **Pass**: 문구/이동 계약 일치.
  - **Fail**: 빈 화면/크래시/다른 경로 이동.

- **S3-AC-4 [W] 히스토리 저장 실패(Quota/Unavailable) 시 저장 금지**
  - WHEN 사용자가 `"히스토리 저장"`을 탭했고 SC-2 UPSERT가 `STORAGE_QUOTA_EXCEEDED` 또는 `STORAGE_UNAVAILABLE`로 실패할 때, the system SHALL 각각의 지정 문구로 `AlertDialog`를 표시하고 `rc_history_v1:${tossUserId}` 값을 변경하지 않아야 한다.
  - **Pass**: 다이얼로그 표시 + localStorage 값 불변.
  - **Fail**: 일부 저장 반영/토스트만 표시/크래시.

### S4 ACs — 히스토리(`/history`)

- **S4-AC-1 [S] 최신순 표시**
  - WHEN SC-2 READ가 `{ ok:true, value:[e0,e1,...] }`를 반환할 때, the system SHALL `/history`에서 `ListRow`를 `value`의 순서 그대로 렌더링해야 한다(최신이 위).
  - **Pass**: 첫 번째 ListRow가 `value[0].label`을 표시.
  - **Fail**: 정렬이 뒤집히거나 임의 정렬된다.

- **S4-AC-2 [E] 항목 탭 시 /result로 이동(게이트 없음)**
  - WHEN 사용자가 `/history`의 임의 항목 `ListRow`를 탭하면, the system SHALL `navigate('/result', { state: { input: <해당 entry.input>, label: <해당 entry.label>, source: 'history' } })`를 1회 호출해야 한다.
  - **Pass**: source가 정확히 `'history'`이며 input/label이 해당 entry와 동일.
  - **Fail**: /simulate로 이동하거나, source 누락/오타.

- **S4-AC-3 [W] 히스토리 parse error 시 오류 문구 + 목록 0개**
  - WHEN SC-2 READ가 `STORAGE_PARSE_ERROR`를 반환할 때, the system SHALL `Paragraph.Text`로 `"히스토리를 불러올 수 없어요"`를 표시하고 히스토리 `ListRow`를 0개 렌더링해야 한다.
  - **Pass**: 오류 문구 표시 + 0개.
  - **Fail**: 크래시 또는 손상 데이터 표시.

- **S4-AC-4 [W] 전체 삭제 실패 시 목록 유지**
  - WHEN 사용자가 `"전체 삭제"`를 확인했고 SC-2 DELETE ALL이 `STORAGE_UNAVAILABLE` 또는 `STORAGE_WRITE_FAILED`로 실패할 때, the system SHALL 실패를 알리는 `AlertDialog`를 표시하고 UI 목록(기존 로드된 항목)을 제거하지 않아야 한다.
  - **Pass**: 실패 다이얼로그 + ListRow 개수 유지.
  - **Fail**: UI에서 먼저 삭제되거나 빈 목록으로 바뀐다.

---

## Data Models

### PresetScenario — fields, types, constraints

```ts
export interface PresetScenario {
  id: 'preset_young_jeonse' | 'preset_newlyweds_compare' | 'preset_monthly_invest' | 'preset_buy_focus';
  name: string; // 1~20자
  defaultInput: SimulationInput;
}
```

- Constraints
  - `id`는 고정 4종 중 1개
  - `name`은 1~20자
- localStorage
  - 저장하지 않음(번들 상수로 제공)
- Size estimation
  - 번들 상수(로컬 저장소 사용량 0)

### SimulationInput — fields, types, constraints

```ts
export type BuyRepaymentType = 'equal_payment' | 'equal_principal';

export interface SimulationInput {
  presetId: PresetScenario['id'] | null;

  // Jeonse
  jeonseDeposit: number;          // 0 ~ 2_000_000_000 (원)
  jeonseLoanRatio: number;        // 0.0 ~ 0.9
  jeonseInterestRate: number;     // 0.0 ~ 0.2 (연)

  // Monthly rent
  monthlyDeposit: number;         // 0 ~ 200_000_000
  monthlyRent: number;            // 0 ~ 10_000_000 (월)
  monthlyRentIncreaseRate: number;// 0.0 ~ 0.2 (연)

  // Buy
  buyPrice: number;               // 0 ~ 3_000_000_000
  buyEquity: number;              // 0 ~ buyPrice
  buyLoanInterestRate: number;    // 0.0 ~ 0.2 (연)
  buyLoanPeriodYears: number;     // 1 ~ 40
  buyRepaymentType: BuyRepaymentType;

  // Common
  initialAsset: number;           // 0 ~ 2_000_000_000
  residencePeriodYears: number;   // 1 ~ 30
  investmentReturnRate: number;   // 0.0 ~ 0.2 (연)
  housePriceGrowthRate: number;   // -0.1 ~ 0.2 (연)
}
```

- localStorage
  - key: `rc_draft_input_v1:${tossUserId}`
  - shape: `SimulationInput` (JSON)
- Size estimation
  - 입력 1개 JSON: ~0.5KB
  - 유저 1명 기준 1KB 미만

### SimulationResult — fields, types, constraints

```ts
export type RecommendedOption = 'jeonse' | 'monthly' | 'buy';

export interface NetWorthPoint {
  year: number;    // 0 ~ residencePeriodYears
  jeonse: number;  // 원, 정수
  monthly: number; // 원, 정수
  buy: number;     // 원, 정수
}

export interface SimulationResult {
  netWorthSeries: NetWorthPoint[]; // length = residencePeriodYears + 1
  finalNetWorth: { jeonse: number; monthly: number; buy: number };
  recommendedOption: RecommendedOption;
  insightCopy: string; // 고정 템플릿 기반 생성
  costBreakdown: {
    jeonse: Record<string, number>;
    monthly: Record<string, number>;
    buy: Record<string, number>;
  };
}
```

- localStorage
  - 단독 저장 없음(HistoryEntry에 포함)
- Size estimation
  - N=30년일 때 `netWorthSeries` 31개 → 수 KB 내
  - 히스토리 5개 누적해도 수십 KB 수준(5MB 한도 대비 충분)

### HistoryEntry — fields, types, constraints

```ts
export interface HistoryEntry {
  id: string;        // nanoid/uuid, 길이 8~36
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  label: string;     // 예: "직접 입력 · 집값 3% · 10년"
  input: SimulationInput;
  result: SimulationResult;
}
```

- Constraints
  - `updatedAt >= createdAt`
  - MVP에서 히스토리 엔트리는 “저장” 시점에 1회 생성되며, 기본적으로 수정 UI가 없으므로 **신규 생성 시 `updatedAt === createdAt`**로 저장한다.
- localStorage
  - key: `rc_history_v1:${tossUserId}`
  - shape: `HistoryEntry[]` (최대 length=5, 최신이 앞)
- Size estimation
  - 항목 1개 대략 5~20KB(시리즈 포함)
  - 5개 저장 시 25~100KB 예상(5MB 이하)

### SharePayload — fields, types, constraints

```ts
export interface SharePayloadV1 {
  v: 1;
  input: SimulationInput;
}
```

- localStorage
  - 저장하지 않음(URL 쿼리로만 전달)
- Size estimation
  - Base64 쿼리 길이 수백~수천자(브라우저 URL 제한 내에서만 동작)

---

## Type Definitions (명시적 필드 타입/필수여부/제약 조건)

> 이 섹션은 **참조만 있는 타입**이 없도록, MVP에서 사용되는 주요 타입의 **모든 필드**에 대해 TypeScript 타입, 필수/옵션, 허용 범위를 명시한다. (기존 인터페이스 정의는 유지)

### T1. `SimulationInput` Field Matrix

| Field | TS Type | Required | Valid range / constraint |
|---|---:|:---:|---|
| `presetId` | `PresetScenario['id'] \| null` | Y | `null` 또는 4종 preset id |
| `jeonseDeposit` | `number` | Y | 정수 권장, `0..2_000_000_000` |
| `jeonseLoanRatio` | `number` | Y | `0.0..0.9` |
| `jeonseInterestRate` | `number` | Y | `0.0..0.2` (연) |
| `monthlyDeposit` | `number` | Y | `0..200_000_000` |
| `monthlyRent` | `number` | Y | `0..10_000_000` (월) |
| `monthlyRentIncreaseRate` | `number` | Y | `0.0..0.2` (연) |
| `buyPrice` | `number` | Y | `0..3_000_000_000` |
| `buyEquity` | `number` | Y | `0..buyPrice` (**교차 검증**) |
| `buyLoanInterestRate` | `number` | Y | `0.0..0.2` (연) |
| `buyLoanPeriodYears` | `number` | Y | 정수, `1..40` |
| `buyRepaymentType` | `BuyRepaymentType` | Y | `'equal_payment' \| 'equal_principal'` |
| `initialAsset` | `number` | Y | `0..2_000_000_000` |
| `residencePeriodYears` | `number` | Y | 정수, `1..30` |
| `investmentReturnRate` | `number` | Y | `0.0..0.2` (연) |
| `housePriceGrowthRate` | `number` | Y | `-0.1..0.2` (연) |

### T2. `SimulationResult` & Nested Types Field Matrix

#### `RecommendedOption`
| Type | Allowed values |
|---|---|
| `RecommendedOption` | `'jeonse' \| 'monthly' \| 'buy'` |

#### `NetWorthPoint`
| Field | TS Type | Required | Constraint |
|---|---:|:---:|---|
| `year` | `number` | Y | 정수, `0..residencePeriodYears` |
| `jeonse` | `number` | Y | `Number.isFinite===true`, 원 단위(정수 권장) |
| `monthly` | `number` | Y | `Number.isFinite===true`, 원 단위(정수 권장) |
| `buy` | `number` | Y | `Number.isFinite===true`, 원 단위(정수 권장) |

#### `SimulationResult`
| Field | TS Type | Required | Constraint |
|---|---:|:---:|---|
| `netWorthSeries` | `NetWorthPoint[]` | Y | 길이 = `residencePeriodYears + 1` |
| `finalNetWorth` | `{ jeonse:number; monthly:number; buy:number }` | Y | 각 값 `Number.isFinite===true` |
| `recommendedOption` | `RecommendedOption` | Y | finalNetWorth 최대값 규칙(F3 AC 참조) |
| `insightCopy` | `string` | Y | 템플릿 정규식(F3 AC 참조) |
| `costBreakdown.jeonse` | `Record<string, number>` | Y | 값 `Number.isFinite===true` |
| `costBreakdown.monthly` | `Record<string, number>` | Y | 값 `Number.isFinite===true` |
| `costBreakdown.buy` | `Record<string, number>` | Y | 값 `Number.isFinite===true` |

### T3. `HistoryEntry` Field Matrix (id/createdAt/updatedAt/result shape 포함)

| Field | TS Type | Required | Constraint |
|---|---:|:---:|---|
| `id` | `string` | Y | 길이 `8..36`(nanoid/uuid), 공백 금지 권장 |
| `createdAt` | `number` | Y | epoch ms, 정수, `>0` |
| `updatedAt` | `number` | Y | epoch ms, 정수, `>= createdAt` (MVP: `=== createdAt`) |
| `label` | `string` | Y | `1..60`자 권장(화면 한 줄 표시 고려) |
| `input` | `SimulationInput` | Y | **임베드 저장**(R-관계 규칙 참조) |
| `result` | `SimulationResult` | Y | **임베드 저장**(R-관계 규칙 참조) |

### T4. `SharePayloadV1` Field Matrix

| Field | TS Type | Required | Constraint |
|---|---:|:---:|---|
| `v` | `1` | Y | 정확히 `1` |
| `input` | `SimulationInput` | Y | 입력 검증 규칙 적용 |

---

## Cascade / Relationship / Validation Rules

- **R1. HistoryEntry 삭제의 cascade**
  - `HistoryEntry`는 `SimulationResult`를 임베드하여 저장하므로, HistoryEntry가 삭제되면 result도 함께 삭제된 것으로 간주한다(별도 보관 없음).
- **R2. HistoryEntry 최대 5개 유지**
  - 새 히스토리 저장으로 길이가 6이 되려는 경우, **저장(write) 전에** 가장 오래된 항목(배열의 마지막)을 제거하여 길이를 5로 만든 뒤 저장한다.
- **R3. 교차 필드 검증(매매 자기자본)**
  - `SimulationInput.buyEquity`는 `SimulationInput.buyPrice`를 초과할 수 없다.
  - 이 규칙은 다음 시점에 반드시 적용된다:
    - `/simulate`에서 “결과 보기” 제출 시
    - `/result`에서 “히스토리 저장” 실행 시(공유/손상/변조 입력 방어)

### Relationship & Field Provenance (명시적 정의)

- **RR-1. `HistoryEntry` ↔ `SimulationInput` 관계**
  - `HistoryEntry.input`은 **참조(reference)가 아니라 임베드(embedded) 저장**이다.
  - 근거: 별도 키로 Input을 저장/참조하지 않으며, HistoryEntry 단일 레코드로 재열람을 완료해야 한다.

- **RR-2. `HistoryEntry` 필드별 성격(임베드/파생/사용자입력)**
  - `id`: 저장 시 생성(파생)
  - `createdAt`: 저장 시 생성(파생)
  - `updatedAt`: 저장 시 생성(파생, MVP에서는 `createdAt`과 동일)
  - `label`: 저장 시 규칙 기반 생성(파생) 후 **저장**(재열람 시 재계산 불필요)
  - `input`: 당시 입력의 스냅샷을 **임베드 저장**
  - `result`: 당시 결과의 스냅샷을 **임베드 저장**

- **RR-3. SC-1(draft)와 SC-2(history) 간 cascade/라이프사이클**
  - SC-2에서 **전체 삭제**를 수행해도 SC-1의 draft는 **삭제/변경되지 않는다**.
  - SC-2에서 **5개 캡으로 인한 오래된 항목 eviction**이 발생해도 SC-1의 draft는 **삭제/변경되지 않는다**.
  - SC-1 draft는 `/simulate`에서 입력 변경에 의해 덮어쓰기되며, SC-2 작업(저장/삭제/evict)은 SC-1에 영향을 주지 않는다.

---

## Feature List

### F1. 프리셋 4종 및 홈 진입 플로우
- Description: 홈에서 프리셋 4종을 ListRow 카드 형태로 제공하고, 탭 시 해당 프리셋의 기본 입력값으로 `/simulate`에 진입한다. 사용자는 “직접 입력”으로도 진입할 수 있으며, 이 경우 기본값(0 또는 합리적 초기값)으로 시작한다.
- Data: `PresetScenario`, `SimulationInput`(초기 생성)
- API: N/A
- Requirements:
- AC-1 [U]: Scenario: 홈에 프리셋 4개 노출
  - Given 앱 라우트가 `/`일 때
  - When 화면이 렌더링되면
  - Then `ListRow`가 정확히 4개 표시됨
  - And 각 `ListRow`는 `id`가 다음 중 1개와 매핑됨: `"preset_young_jeonse"`, `"preset_newlyweds_compare"`, `"preset_monthly_invest"`, `"preset_buy_focus"`
- AC-2 [E]: Scenario: 프리셋 탭으로 시뮬레이션 진입
  - Given 앱 라우트가 `/`이고 프리셋 `"preset_young_jeonse"`가 표시될 때
  - When 사용자가 해당 프리셋 `ListRow`를 탭하면
  - Then `navigate('/simulate', { state: { presetId: 'preset_young_jeonse', source: 'home' } })`가 호출됨
- AC-3 [E]: Scenario: 직접 입력으로 시뮬레이션 진입
  - Given 앱 라우트가 `/`일 때
  - When 사용자가 `Button` "직접 입력"을 탭하면
  - Then `navigate('/simulate', { state: { source: 'home' } })`가 호출됨
- AC-4 [W]: Scenario: 외부 도메인 이탈 금지
  - Given 앱 라우트가 `/`일 때
  - When 사용자가 홈에서 어떤 CTA를 탭하더라도
  - Then `window.open`이 호출되지 않음
  - And `window.location.href`에 외부 URL이 대입되지 않음
- AC-5 [W]: Scenario: 잘못된 프리셋 id 방어
  - Given `navigate('/simulate', { state: { presetId: 'preset_unknown', source: 'home' } })`로 진입했을 때
  - When `/simulate` 화면이 hydrate 되면
  - Then `AlertDialog`가 표시되고 메시지 텍스트가 `"프리셋을 불러올 수 없어요"`와 일치함
  - And 사용자가 확인 버튼을 탭하면 `navigate('/', { replace: true })`가 호출됨
- AC-6 [U]: Scenario: 터치 타겟 크기 준수
  - Given 홈 화면이 렌더링되었을 때
  - When 테스트가 프리셋 `ListRow`의 클릭 가능한 DOM 높이를 측정하면
  - Then 각 프리셋 항목의 클릭 타겟 높이가 44px 이상임
- **AC-7 [W]: Scenario: 프리셋 목록 렌더 실패(방어)**
  - Given 앱 라우트가 `/`일 때
  - When 프리셋 상수 로딩/매핑 오류로 `ListRow`가 4개 미만으로 렌더링되면
  - Then `AlertDialog`가 표시되고 메시지 텍스트가 `"프리셋을 표시할 수 없어요"`와 일치함
  - And 사용자가 확인 버튼을 탭하면 앱은 `navigate('/', { replace: true })`를 호출하여 홈을 리로드함

---

### F2. 입력 폼(전세/월세/매매 탭 + 공통 가정) 및 검증 + Draft 저장
- Description: `/simulate`에서 전세/월세/매매 탭을 전환하며 각 옵션별 입력을 받고, 공통 가정(초기자산/거주기간/수익률/집값상승률)을 함께 편집한다. 사용자가 입력을 변경하면 500ms 디바운스로 draft를 localStorage에 저장하여 재진입 시 복원한다.
- Data: `SimulationInput`(draft), `PresetScenario`(프리필)
- API: N/A
- Requirements:
- AC-1 [S]: Scenario: Hydrate 중 로딩 상태
  - Given `/simulate`에 진입해 `isHydrating = true`인 동안
  - When 화면이 렌더링되면
  - Then `Button` "결과 보기"는 `disabled=true`임
  - And `Paragraph.Text`로 `"불러오는 중..."`이 표시됨
- AC-2 [E]: Scenario: 프리셋 기반 프리필 적용
  - Given `/simulate`에 `location.state = { presetId: 'preset_young_jeonse', source: 'home' }`로 진입했을 때
  - When hydrate가 완료되면
  - Then 입력 상태의 `presetId`는 `'preset_young_jeonse'`임
  - And `TextField` "거주기간(년)" 값은 `10`으로 표시됨
- AC-3 [E]: Scenario: 입력 변경 시 Draft 저장(디바운스 500ms)
  - Given `/simulate`에서 토스 로그인된 유저 `tossUserId = 'u_123'`가 있을 때
  - When 사용자가 `TextField` "초기자산(원)"에 `50000000`을 입력하고 500ms가 경과하면
  - Then localStorage key `rc_draft_input_v1:u_123`가 존재함
  - And 저장된 JSON의 `initialAsset` 값이 `50000000`과 일치함
- AC-4 [W]: Scenario: 거주기간 최소값 검증
  - Given `/simulate`에서 토스 로그인된 유저가 있을 때
  - When 사용자가 "거주기간(년)"에 `0`을 입력하고 "결과 보기"를 탭하면
  - Then 해당 필드 하단에 에러 메시지 `"거주기간은 1~30년만 입력할 수 있어요"`가 표시됨
  - And `navigate('/result', ...)`가 호출되지 않음
- AC-5 [W]: Scenario: 매매 자기자본이 매매가 초과 시 거부
  - Given `/simulate`에서 토스 로그인된 유저가 있을 때
  - When 사용자가 { buyPrice: 500000000, buyEquity: 600000000 }로 입력하고 "결과 보기"를 탭하면
  - Then 에러 메시지 `"자기자본은 매매가를 넘을 수 없어요"`가 표시됨
  - And `navigate('/result', ...)`가 호출되지 않음
- AC-6 [E]: Scenario: 모바일 키보드 숫자 모드
  - Given `/simulate` 화면에 "월세(원)" 입력 `TextField`가 있을 때
  - When 테스트가 해당 input 엘리먼트의 속성을 조회하면
  - Then `inputMode` 값이 `"numeric"`임
  - And `pattern` 값이 `"[0-9]*"`임
- AC-7 [E]: Scenario: 포커스 시 입력 필드 스크롤 인뷰
  - Given `/simulate`에서 스크롤이 가능한 컨테이너가 렌더링되어 있을 때
  - When 사용자가 화면 하단의 `TextField` "집값상승률(연, %)"에 포커스하면
  - Then 해당 필드에 대해 `scrollIntoView({ block: 'center' })`가 1회 호출됨

---

### F3. 시뮬레이션 계산 엔진(순자산 시리즈/추천/인사이트/비용 요약)
- Description: 입력값을 바탕으로 0년~N년(`residencePeriodYears`)까지 전세/월세/매매의 순자산 시계열과 최종 순자산을 계산한다. 계산 결과로 추천 옵션을 결정하고, “집값상승률 +1%p” 민감도 시나리오를 추가 계산하여 인사이트 1줄을 생성한다.
- Data: `SimulationInput` → `SimulationResult`
- API: N/A
- Requirements:
- AC-1 [U]: Scenario: 결과 시리즈 길이 규칙
  - Given `residencePeriodYears = 10`인 `SimulationInput`이 있을 때
  - When 시뮬레이션을 실행하면
  - Then `result.netWorthSeries.length`는 `11`임
  - And `result.netWorthSeries[0].year`는 `0`임
  - And `result.netWorthSeries[10].year`는 `10`임
- AC-2 [U]: Scenario: 추천 옵션은 최종 순자산 최대값
  - Given `result.finalNetWorth = { jeonse: 100, monthly: 200, buy: 150 }`로 계산되었을 때
  - When `recommendedOption`을 결정하면
  - Then `recommendedOption`은 `"monthly"`임
- AC-3 [U]: Scenario: 동률일 때 추천 옵션 우선순위
  - Given `result.finalNetWorth = { jeonse: 100, monthly: 100, buy: 100 }`로 계산되었을 때
  - When `recommendedOption`을 결정하면
  - Then `recommendedOption`은 `"jeonse"`임
- AC-4 [E]: Scenario: 0% 가정에서의 산술 검증(간단 케이스)
  - Given 다음 입력이 있을 때  
    `{ presetId: null, jeonseDeposit: 0, jeonseLoanRatio: 0, jeonseInterestRate: 0, monthlyDeposit: 0, monthlyRent: 0, monthlyRentIncreaseRate: 0, buyPrice: 0, buyEquity: 0, buyLoanInterestRate: 0, buyLoanPeriodYears: 30, buyRepaymentType: 'equal_payment', initialAsset: 10000000, residencePeriodYears: 1, investmentReturnRate: 0, housePriceGrowthRate: 0 }`
  - When 시뮬레이션을 실행하면
  - Then `finalNetWorth.jeonse`는 `10000000`임
  - And `finalNetWorth.monthly`는 `10000000`임
  - And `finalNetWorth.buy`는 `10000000`임
- AC-5 [U]: Scenario: 인사이트 문구 템플릿 고정
  - Given 시뮬레이션 결과가 생성되었을 때
  - When `insightCopy`를 생성하면
  - Then `insightCopy`는 다음 정규식과 매칭됨:  
    `/^\+1%p 집값상승 시: (전세|월세|매매) 1위, 2위와 차이 [0-9]+원$/`
- AC-6 [W]: Scenario: 계산 결과에 NaN/Infinity 금지
  - Given `SimulationInput`의 모든 숫자 필드가 유효 범위 내일 때
  - When 시뮬레이션을 실행하면
  - Then `netWorthSeries`의 모든 값(jeonse/monthly/buy)은 `Number.isFinite(value) === true`임
- AC-7 [W]: Scenario: 지원하지 않는 상환방식 거부
  - Given `buyRepaymentType = 'balloon' as any`인 입력이 있을 때
  - When 시뮬레이션을 실행하면
  - Then 함수는 `Error`를 throw하고 에러 메시지는 `"지원하지 않는 상환방식입니다"`와 일치함

---

### F4. “결과 보기” 리워드 광고 게이트 및 결과 라우팅
- Description: `/simulate`에서 사용자가 “결과 보기”를 누르면 `TossRewardAd`를 통해 리워드 광고를 1회 시청한 뒤 `/result`로 이동한다. 광고 실패/취소 시 결과 화면으로 이동하지 않고, 사용자가 재시도할 수 있도록 오류를 안내한다.
- Data: `SimulationInput`(state 전달), `SimulationResult`(계산 후 전달)
- API: N/A
- Requirements:
- AC-1 [E]: Scenario: 결과 보기 전 보상형 광고 게이트
  - Given `/simulate`에 유효한 `SimulationInput`이 있고 토스 로그인된 유저가 있을 때
  - When 사용자가 `Button` "결과 보기"를 탭하면
  - Then `TossRewardAd` 게이트 UI가 표시됨
- AC-2 [E]: Scenario: 광고 시청 완료 후 결과 화면 이동
  - Given 사용자가 "결과 보기"를 탭해 `TossRewardAd`가 표시된 상태일 때
  - When 광고 시청이 완료되면
  - Then `navigate('/result', { state: { input: <동일 입력>, label: <자동 생성 라벨>, source: 'simulate' } })`가 1회 호출됨
- AC-3 [W]: Scenario: 광고 실패 시 결과 이동 금지
  - Given 사용자가 "결과 보기"를 탭해 광고를 로드하는 중일 때
  - When 광고 로드가 실패하면
  - Then `AlertDialog`가 표시되고