# RentCheck (rentcheck).

# PRD
## Background / Problem
- 한국에는 **전세라는 고유한 주거 제도**가 있어 사용자는 **전세·월세·매매 3가지 옵션을 동시에** 비교해야 합니다.  
- 실제 의사결정은 **수억 원 규모**로 이어질 수 있지만, 현재 시장의 계산기는 주로 전월세 전환율 수준에 머물러 **N년 뒤 순자산 관점의 비교**를 제공하지 못합니다.

이로 인해 집을 구하는 사용자는 본인 상황(대출, 투자수익률, 집값상승률, 거주기간 등)을 반영해 장기적으로 무엇이 유리한지 알고 싶어도, 엑셀 없이 빠르게 검증하기 어렵습니다. 결과적으로 많은 사용자가 “감”이나 주변 조언에 의존해 큰 결정을 내리게 됩니다.

## Goal (1-sentence product definition)
앱 출시 3개월 내(토스 앱인토스 기준) **월간 활성 시뮬레이션 실행 횟수 10,000회**를 달성한다.

## Non-goals
- 실거래가/매물 자동 조회 및 지역·단지 검색(외부 API 연동 포함)
- 대출 상품 비교/추천, 금융상품 중개/광고
- 세금 정밀 계산(양도소득세·종부세 등), 법률/세무 자문 제공
- 자체 회원가입/로그인(토스 로그인 외 별도 인증)
- 다중 시나리오 저장/비교(동시에 여러 케이스를 겹쳐 비교하는 고급 기능)

## Target Users (personas + use cases)
- **지민 (27세, 사회초년생 직장인)** — “전세대출 받아 전세살기 vs 월세 살면서 투자”를 고민. 엑셀은 어렵고, 부동산 앱은 매물 중심이라 **10년 뒤 순자산 비교**가 필요.
- **수진 & 준혁 (32세, 신혼부부)** — 전세 3억 vs 매매 5억 사이에서 논쟁. 같은 조건으로 **숫자 기반 비교 결과를 공유**하며 의사결정하고 싶음.

## Target Market
- **South Korea (KR)**, 토스 사용자 중심(20~40대, 모바일 네이티브, 금융/자산 관심도 높음)
- 전세 제도 특성상 “전세 vs 월세 vs 매매”의 **3옵션 동시 비교 니즈가 구조적으로 존재**하는 국내 시장에 최적화

## Data Entities (nouns with key fields)
- **PresetScenario**
  - `id`(string), `name`(string)
  - `defaultInput`(SimulationInput)
- **SimulationInput**
  - `presetId`(string \| null)
  - 전세: `jeonseDeposit`(number), `jeonseLoanRatio`(number), `jeonseInterestRate`(number)
  - 월세: `monthlyDeposit`(number), `monthlyRent`(number), `monthlyRentIncreaseRate`(number)
  - 매매: `buyPrice`(number), `buyEquity`(number), `buyLoanRate`(number), `buyLoanPeriodYears`(number), `buyRepaymentType`(string)
  - 공통: `initialAsset`(number), `residenceYears`(number), `investmentReturnRate`(number), `housePriceGrowthRate`(number)
- **SimulationResult**
  - `netWorthByYear`:
    - `jeonse`(number[]), `monthly`(number[]), `buy`(number[])
  - `finalNetWorth`:
    - `jeonse`(number), `monthly`(number), `buy`(number)
  - `recommendedOption`('jeonse' \| 'monthly' \| 'buy')
  - `diffFromBest`(record: option→number)
  - `insightCopy`(string) — “집값상승률 +1%” 시나리오 재계산 기반
  - `costBreakdown`(object) — 옵션별 주요 비용/자산 항목 합산 결과
- **HistoryEntry**
  - `id`(string), `createdAt`(number)
  - `label`(string) — `"{프리셋명 또는 '직접 입력'} · 집값 {housePriceGrowthRate}% · {residenceYears}년"`
  - `input`(SimulationInput)
- **SharePayload**
  - `encoded`(string) — Base64 인코딩 입력값
  - `version`(number) — 추후 호환성용

## Core Flow (numbered steps)
1. 토스 앱에서 미니앱 진입 → 메인(`/`)에서 **프리셋 카드 4종** 확인
2. 프리셋 선택 → 입력값이 채워진 상태로 결과(`/result`) 이동 (또는 “직접 입력하기”로 `/input` 진입)
3. 결과 화면에서 **옵션별 N년 후 순자산 카드 3장**과 **추천 옵션 표시** 확인
4. **인사이트 1줄 카피**(집값상승률 +1% 시 차이) 확인
5. **라인 차트**로 연도별 순자산 추이 확인(툴팁 인터랙션)
6. “조건 수정하기” → 바텀시트에서 값 변경 → **즉시 리렌더링**된 결과 확인 → 필요 시 “공유하기” 또는 `/history`에서 이전 기록 재진입

## Success Metrics (measurable)
- **월간 시뮬레이션 실행 횟수 10,000회** (출시 3개월 내)
- **프리셋 → 결과 전환율 80% 이상**
- **결과 화면 평균 체류 시간 90초 이상**
- **공유 URL 생성 수 월 500건 이상**
- **히스토리 재접속률 20% 이상** (최근 5개 기록에서 재진입 발생 비율)

## MVP Scope (exhaustive feature list)
- **프리셋 시나리오 4종**: 메인 카드 선택만으로 즉시 시뮬레이션 실행
- **3탭 입력 폼 + 공통 설정**: 전세/월세/매매 입력 및 초기자산·거주기간·투자수익률·집값상승률 설정
- **결과 화면(비교 카드 + 인사이트 + 라인 차트 + 비용 분석표)**: 옵션별 N년 후 순자산 및 차이 표시, 인사이트 자동 생성
- **실시간 슬라이더 업데이트**: 공통 설정 변경 시 결과/인사이트/차트 즉시 반영(클라이언트 순수 함수 계산)
- **히스토리(최근 5개)**: localStorage 저장 및 자동 레이블 생성, 탭하여 재실행
- **결과 공유**: 입력값 Base64 쿼리 파라미터 URL 생성 + 카카오톡 공유(동일 조건 재현)

## Target Audience & Marketing
- **핵심 타겟**: 집 구하기 전 “전세 vs 매매”로 고민하는 20~30대 토스 사용자(신혼/첫 독립/재계약)
- **핵심 메시지**: “전세·월세·매매, 10년 뒤 내 순자산을 숫자로 비교”
- **채널**: 카카오톡 공유(부부/친구 논의), 네이버 블로그(사례 콘텐츠), 유튜브(시나리오별 비교 영상)

## Monetization Strategy
- **유료 기능 (Freemium, Toss Payment SDK)** 권장  
  - 무료: 프리셋/기본 결과 요약 제공  
  - 유료: 상세 비용 분석표, 더 긴 기간(예: 15~20년) 확장, 고급 상환방식/추가 변수(향후) 해제 등
- 보조로 **인앱 광고**는 결과 화면 하단 배너 1슬롯 정도로 제한 가능(콘텐츠 방해 최소화).  
- 결과가 “분석/추천” 성격이므로, 무료 사용자에게는 **상세 결과 진입 시 1회 보상형 광고(TossRewardAd)로 언락**하는 구조를 고려(모든 화면 게이팅은 금지, ‘페이오프’ 구간에만 적용).

## Assumptions
- 사용자는 정확한 부동산/세금 ‘정답’보다, **가정(수익률/상승률) 기반의 상대 비교**를 원한다.
- 모든 계산은 **클라이언트 사이드**에서 충분히 처리 가능하다.
- 히스토리 5개 저장은 localStorage **~5MB 제한** 내에서 안전하다.
- 공유는 서버 없이도 **URL 쿼리(Base64)** 로 동일 조건 재현이 가능하다.
- 프리셋은 “진입 장벽 제거”에 유의미한 기여를 한다.
- 토스 미니앱 사용자는 모바일 환경에서 **짧은 시간 내 결과 확인**을 선호한다.
- 네트워크는 항상 가능하다고 가정한다(오프라인 퍼스트 미지원).
- 세부 입력값은 사용자마다 달라 “정확성 논쟁”이 발생할 수 있어, 결과는 **시뮬레이션(가정 기반)** 임을 명확히 고지한다.

## Open Questions
1. “보유세 추정”을 MVP에 포함할지, 완전히 제외할지(브리프에는 ‘단순 보유세 추정’ 언급이 있으나 MVP 핵심에는 미포함).
2. 매매 상환방식(`buyRepaymentType`)의 MVP 지원 범위(원리금균등만 vs 원금균등 포함).
3. 결과 공유에서 카카오톡 공유 구현 방식(웹 공유 SDK 적용 범위)과 “URL 복사” 우선순위.
4. 보상형 광고(TossRewardAd)를 적용할 **정확한 지점**(예: 인사이트/비용분석표/차트 중 무엇을 언락으로 볼지).
5. 프리셋 4종의 구체 입력값(금리/비율/기간 등) 확정 및 업데이트 정책(앱 내 고정값 유지 vs 버전 관리).