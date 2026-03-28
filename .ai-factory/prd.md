# RentCheck (rentcheck).

# PRD
## Background / Problem
- 집 선택은 **전세·월세·매매** 3가지 옵션을 동시에 비교해야 하는데(한국의 전세 제도 특성), 현재 시장의 계산기는 주로 **전월세 전환율** 수준만 제공하여 **N년 뒤 순자산** 관점의 의사결정을 돕지 못한다.
- 그 결과 사용자는 **10년 단위의 거주/투자 가정**이 얽힌 결정을 **감이나 주변 말**에 의존해 내리며, 이는 **수억 원 규모**의 결과 차이로 이어질 수 있다.

## Goal (1-sentence product definition)
출시 3개월 내 토스 미니앱 기준 **월간 활성 시뮬레이션 실행 10,000회**를 달성한다.

## Non-goals
- 자체 회원가입/로그인 구현 (토스 로그인 SDK 사용 범위 외)
- 실거래가/매물 데이터 자동 조회 및 지역·단지 검색
- 세금 정밀 계산(양도소득세, 종합부동산세 등) 및 법/규제 해석 제공
- 대출 상품 비교/추천/중개 등 금융상품 판매·광고 기능
- 백엔드 DB 구축(서버 저장/동기화) 및 멀티 디바이스 데이터 연동

## Target Users (personas + use cases)
- **지민 (27, 사회초년생 직장인)** — 엑셀은 어렵고 빠르게 결론이 필요함.  
  - 사용 케이스: “전세대출로 전세 vs 월세 살며 투자”를 **10년 후 순자산**으로 비교
- **수진 & 준혁 (32, 신혼부부)** — 의견 충돌을 숫자로 정리하고 싶음.  
  - 사용 케이스: 전세 3억 vs 매매 5억을 **동일 가정(집값/수익률/기간)**으로 비교 후 URL로 공유

## Target Market
- **대한민국(한국)**, 토스 사용자가 많은 **20–40대 모바일 네이티브** 중심
- “전세·월세·매매” 의사결정이 반복되는 **독립/결혼/재계약** 라이프 이벤트 구간 사용자

## Data Entities (nouns with key fields)
- **PresetScenario**
  - `id`(string), `name`(string)
  - `defaultInput`(SimulationInput)
- **SimulationInput**
  - `presetId`(string \| null)
  - 전세: `jeonseDeposit`(number), `jeonseLoanRatio`(number), `jeonseInterestRate`(number)
  - 월세: `monthlyDeposit`(number), `monthlyRent`(number), `monthlyRentIncreaseRate`(number)
  - 매매: `buyPrice`(number), `buyEquity`(number), `buyLoanInterestRate`(number), `buyLoanPeriodYears`(number), `buyRepaymentType`(string)
  - 공통: `initialAsset`(number), `residencePeriodYears`(number), `investmentReturnRate`(number), `housePriceGrowthRate`(number)
- **SimulationResult**
  - `netWorthSeries`( { `year`(number), `jeonse`(number), `monthly`(number), `buy`(number) }[] )
  - `finalNetWorth`( { `jeonse`(number), `monthly`(number), `buy`(number) } )
  - `recommendedOption`("jeonse" \| "monthly" \| "buy")
  - `insightCopy`(string) — “집값상승률 +1%” 시나리오로 1위/비교 옵션 차이 금액 포함
  - `costBreakdown`(object) — 옵션별 비용/자산 구성 요약(표 렌더링용)
- **HistoryEntry**
  - `id`(string), `createdAt`(number)
  - `label`(string) — `"{프리셋명 또는 '직접 입력'} · 집값 {housePriceGrowthRate}% · {residencePeriodYears}년"`
  - `input`(SimulationInput)
  - `result`(SimulationResult)
- **SharePayload**
  - `encodedInput`(string) — Base64 인코딩된 입력값(쿼리 파라미터용)

## Core Flow (numbered steps)
1. 토스 앱에서 미니앱 진입 → 메인에서 **프리셋 4종 카드** 확인
2. 프리셋 탭(또는 “직접 입력”) → 입력값이 채워진 상태로 결과 화면 진입
3. (Payoff) **결과 보기**를 탭하면 **리워드 광고 1회 시청(TossRewardAd)** 후 결과 상세 노출
4. 결과 화면에서 **순자산 카드 3장 + 추천 뱃지 + 인사이트 1줄** 확인
5. **라인 차트(연도별 추이) + 비용 분석표**로 가정 변화 영향 파악
6. “조건 수정하기”로 바텀시트에서 슬라이더/입력값 변경 → **즉시 리렌더링**, 필요 시 “공유하기/히스토리”로 저장·재진입

## Success Metrics (measurable)
- **월간 활성 시뮬레이션 실행 횟수 10,000회** (출시 3개월 내)
- **프리셋 → 결과 도달 전환율 ≥ 80%**
- **결과 화면 평균 체류 시간 ≥ 90초**
- **공유 URL 생성 월 500건 이상**
- **히스토리 재접속률 ≥ 20%** (히스토리 항목 클릭 기준)

## MVP Scope (exhaustive feature list)
- 프리셋 시나리오 4종(메인 카드) 및 프리셋 기반 즉시 결과 진입
- 전세/월세/매매 **3탭 입력 폼** + 공통 설정(초기자산/거주기간/투자수익률/집값상승률)
- **순자산 비교 결과**: 옵션별 카드 3장(최종 순자산/차이/추천 뱃지) + 인사이트 1줄 자동 생성(+1% 집값상승률 시나리오 기반)
- **라인 차트(전세/월세/매매 3개 라인, 터치 툴팁)** + 비용 분석표
- 공통 설정 **슬라이더 실시간 업데이트**(클라이언트 사이드 순수 함수 계산, 즉시 리렌더)
- **히스토리(최근 5개)** localStorage 저장/조회 + 자동 레이블 생성 + **결과 공유(Base64 쿼리 URL + 카카오톡 공유)**

## Target Audience & Marketing
- 타겟: “전세 vs 월세 vs 매매”를 고민하는 **20–30대 토스 사용자**(독립/신혼/재계약)
- 핵심 메시지: **“전세·월세·매매, 10년 뒤 내 순자산을 숫자로 비교”**
- 채널(브리프 기반): 카카오톡 공유 확산, 네이버 블로그(계산 예시 콘텐츠), 유튜브(시나리오 비교 숏폼)

## Monetization Strategy
- **인앱 광고**: 결과 화면의 “상세 결과(차트/분석표)” 진입 시 **리워드 광고(TossRewardAd) 1회**로 게이트(사용자 동기가 가장 높은 payoff 순간에만 적용)
- 보조: 결과 화면 하단(분석표 이후)에 **배너 광고 1 슬롯(AdSlot)** 배치(콘텐츠 흐름 방해 없는 위치)

## Assumptions
1. 시뮬레이션 계산은 클라이언트에서 수행 가능하며, 입력 범위 내에서 성능 문제 없이 즉시 리렌더링된다.
2. 사용자 데이터는 **localStorage(약 5MB 한도)** 내에서 최근 5개 히스토리 저장이면 충분하다.
3. 공유는 서버 저장 없이 **Base64 쿼리 파라미터**로 동일 조건 재현이 가능하다.
4. 토스 미니앱은 네트워크 연결을 전제로 하며, 오프라인 사용성은 MVP에서 고려하지 않는다.
5. 결과 화면이 사용자 가치의 핵심 payoff이므로 리워드 광고 게이트가 전환에 치명적 이탈을 만들지 않는다.
6. 프리셋 4종은 대부분의 사용자가 “내 상황과 비슷함”을 느낄 만큼 대표성이 있다.
7. 세금/정책/대출 규정은 변동성이 커 정밀 계산 없이도 MVP 가치는 유지된다.
8. 구현은 Vite + React + TypeScript, 라우팅은 react-router-dom, UI는 @toss/tds-mobile 컴포넌트로 구성한다.

## Open Questions
1. “보유세 추정만 제공” 범위에서 **어떤 항목을 비용 분석표에 포함**할지(예: 단순 연 보유세율 가정 유무)
2. 리워드 광고 게이트를 **결과 화면 진입 전**으로 할지, **차트/분석표 펼침 시점**으로 할지(전환율 vs 수익 최대화)
3. 공유 URL의 입력값 스키마가 변경될 때 **버전 호환**을 어떻게 처리할지(`v` 파라미터 도입 여부)
4. 프리셋 4종의 구체 입력값(금리/기간/자산 등) 기준을 어디까지 고정하고, 무엇을 사용자가 즉시 수정하도록 둘지
5. “상환방식”의 MVP 지원 범위(예: 원리금균등/원금균등 중 무엇을 포함) 및 입력 검증 규칙(최대/최소 값)