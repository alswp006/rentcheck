# RentCheck (rentcheck).

# PRD
## Background / Problem
- 한국에는 **전세라는 고유 제도**가 있어, 집을 구할 때 **전세·월세·매매 3가지 옵션을 동시에** 비교해야 한다.
- 하지만 기존 계산기는 주로 **전월세 전환율** 수준만 제공해, 사용자가 원하는 **N년(예: 10년) 뒤 순자산 비교**를 제공하지 못한다.  
결과적으로 사용자들은 **수억 원 규모의 주거 의사결정**을 감이나 주변 말에 의존하게 되며, 장기적으로 어떤 선택이 유리한지 숫자로 납득하기 어렵다.

## Goal (1-sentence product definition)
출시 3개월 내, 토스 앱인토스 기준 **월간 활성 시뮬레이션 실행 횟수 10,000회**를 달성한다.

## Non-goals
- 자체 회원가입/로그인 구현(토스 로그인 SDK 외 인증 체계)
- 실거래가/매물 자동 조회(외부 API 연동 없이 직접 입력만)
- 세금 정밀 계산(양도소득세/종부세 등; MVP는 정밀 세무 계산 제외)
- 대출 상품 비교/추천 및 금융상품 광고/중개
- 특정 아파트·지역 검색 기능

## Target Users (personas + use cases)
- **지민 (27세, 사회초년생 직장인)** — 엑셀은 어렵고 매물 앱은 답을 못 줌. “전세대출 전세 vs 월세+투자” 중 **10년 뒤 순자산이 큰 선택**을 빠르게 확인하고 싶다.
- **수진 & 준혁 (32세, 신혼부부)** — “전세 3억 vs 매매 5억”으로 의견 충돌. 동일 조건에서 **숫자로 비교한 결과**를 보고 합의하고, 링크로 공유해 함께 검토하고 싶다.

## Target Market
- **South Korea (KR)**, 토스 이용자 중심(20~40대, 모바일 네이티브, 금융/자산 의사결정 관심 높음)
- 전세 제도가 존재하는 국내 주거 의사결정 시장 특성상, “3옵션 동시 비교” 니즈가 명확한 사용자군에 최적화

## Data Entities (nouns with key fields)
- **PresetScenario**
  - `id`(string), `name`(string)
  - `defaultInput`(SimulationInput)
- **SimulationInput**
  - `presetId`(string | null)
  - 전세: `jeonseDeposit`(number), `jeonseLoanRatio`(number, 0~1), `jeonseInterestRate`(number, %)
  - 월세: `monthlyDeposit`(number), `monthlyRent`(number), `monthlyRentIncreaseRate`(number, %)
  - 매매: `buyPrice`(number), `buyEquity`(number), `buyLoanInterestRate`(number, %), `buyLoanPeriodYears`(number), `buyRepaymentType`(enum: 원리금균등 | 원금균등 등)
  - 공통: `initialAsset`(number), `residencePeriodYears`(number), `investmentReturnRate`(number, %), `housePriceGrowthRate`(number, %)
- **SimulationResult**
  - `netWorthByYear`:
    - `jeonse`(number[]), `monthly`(number[]), `buy`(number[])
  - `finalNetWorth`:
    - `jeonse`(number), `monthly`(number), `buy`(number)
  - `recommendedOption`(enum: JEONSE | MONTHLY | BUY)
  - `deltaVsSecondBest`(number)
  - `insightCopy`(string) — “집값상승률 +1%” 시나리오 재계산 기반 문구
  - `costBreakdownTable`(rows: { `label`(string), `jeonse`(number), `monthly`(number), `buy`(number) }[])
- **HistoryEntry**
  - `id`(string)
  - `createdAt`(number, epoch ms)
  - `label`(string) — 규칙: `"{프리셋명 또는 '직접 입력'} · 집값 {housePriceGrowthRate}% · {residencePeriodYears}년"`
  - `input`(SimulationInput)

## Core Flow (numbered steps)
1. 토스 앱에서 미니앱 진입 → 메인에서 **프리셋 4종**과 “직접 입력” 선택지를 본다.
2. 사용자가 프리셋을 탭하거나 직접 입력을 선택한다 → 입력값이 채워진 상태로 진행한다.
3. 사용자가 **전세/월세/매매 3탭 입력** 및 **공통 설정**(거주기간/투자수익률/집값상승률 등)을 조정한다.
4. 사용자가 “결과 보기” 액션을 수행한다 → **TossRewardAd 시청 후** 결과가 공개된다(결과/추천이 생성되는 페이오프 순간만 게이트).
5. 결과 화면에서 옵션별 **N년 후 순자산 카드 3장**, **인사이트 1줄**, **라인 차트(연도별 추이)**, **비용 분석표**를 확인하고 슬라이더로 즉시 재계산한다.
6. 사용자가 **공유 URL 생성/카카오톡 공유** 또는 **히스토리(최근 5개)**에서 과거 시뮬레이션을 재진입한다.

## Success Metrics (measurable)
- **월간 시뮬레이션 실행 횟수 10,000회** (출시 3개월 내)
- **프리셋 → 결과 도달 전환율 80% 이상**
- **결과 화면 평균 체류 시간 90초 이상**
- **공유 URL 생성 수 월 500건 이상**
- **히스토리 재접속률 20% 이상** (히스토리 항목 탭으로 재진입한 세션 비중)

## MVP Scope (exhaustive feature list)
- **프리셋 시나리오 4종**: 메인 카드에서 즉시 선택, 선택 시 입력값 자동 세팅
- **3탭 입력 폼 + 공통 설정**: 전세/월세/매매 개별 입력 + 초기자산/거주기간/투자수익률/집값상승률 등 공통 설정
- **순자산 비교 결과 화면**: 옵션별 카드 3장(추천 표시 포함) + 차이 금액 표시 + 인사이트 1줄 자동 생성 + 라인 차트(툴팁) + 비용 분석표
- **실시간 슬라이더 업데이트**: 공통 설정 변경 시 결과/인사이트/차트가 즉시 재계산 및 리렌더링(클라이언트 순수 함수 계산)
- **히스토리(최근 5개)**: localStorage 저장/로드, 자동 레이블 생성 규칙 적용, 항목 탭 시 해당 입력으로 재실행
- **결과 공유**: 입력값을 Base64로 인코딩한 쿼리 파라미터 URL 생성 + 카카오톡 공유/URL 복사

## Target Audience & Marketing
- **핵심 타겟**: 집 구하기 직전/재계약 직전의 20~30대 토스 사용자(전세 vs 매매 vs 월세 비교 니즈)
- **핵심 가치 제안**: “전세·월세·매매, **10년 뒤 내 순자산을 숫자로 비교**”
- **메시지 포인트(랜딩 히어로)**  
  1) 프리셋으로 3초 만에 결과 확인  
  2) 슬라이더로 집값/수익률 시나리오 즉시 반영  
  3) “집값 1% 더 오르면 X만원 차이” 인사이트 자동 생성
- **채널**: 카카오톡 공유(부부/커플), 네이버 블로그, 유튜브(국내)

## Monetization Strategy
- **인앱 광고(추천)**: 무료 유틸리티 성격에 적합  
  - 결과(추천/분석) 공개 시점에 **TossRewardAd로 1회 게이트**(가장 높은 전환 기대 지점)  
  - 결과 화면 하단에 **배너 AdSlot 1개**(분석표 이후, 스크롤 하단에 배치)
- **유료 기능(Freemium, 후순위)**: MVP 반응 확인 후, Toss Payment로 “광고 제거” 또는 “히스토리 확장(5→N)” 같은 옵션을 검토

## Assumptions
1. 사용자는 매물/실거래가 자동 연동 없이도, 대략적인 입력값으로 방향성을 판단하는 니즈가 크다.
2. 결과 신뢰를 위해 계산은 네트워크 의존 없이 **클라이언트 순수 함수**로 재현 가능해야 한다.
3. localStorage는 약 5MB 내외 제약이 있으므로 히스토리는 **최근 5개**만 저장한다.
4. 공유는 서버 저장 없이도 **쿼리 파라미터(Base64)** 로 동일 조건 재현이 가능하다.
5. 결과 화면이 페이오프이며, 리워드 광고는 **해당 순간에만** 적용할 때 이탈을 최소화한다.
6. 사용자 입력 오류(예: 음수/기간 0년 등)는 폼 단계에서 차단해야 한다.
7. 토스 미니앱은 네트워크 연결이 전제이며, 오프라인 퍼스트는 고려하지 않는다.
8. “추천”은 금융상품 추천이 아니라 **입력 조건 하 순자산 비교의 최댓값** 표시로 정의한다.

## Open Questions
1. 매매 대출의 `상환방식`은 MVP에서 어떤 enum 집합(원리금균등/원금균등/만기일시 등)까지 포함할 것인가?
2. “단순 보유세 추정”을 MVP에 포함한다면, 어떤 수준의 입력/가정(정액/비율/0 처리)을 적용할 것인가?
3. 결과 추천 뱃지(⭐) 노출 기준은 “최종 순자산 1위” 단일 기준으로 고정할 것인가, 동률/근소차 처리 규칙이 필요한가?
4. 공유 시 카카오톡 메시지 템플릿(요약 문구/주의 문구)은 어떤 포맷이 가장 클릭률이 높은가?
5. 프리셋 4종의 구체 입력값(금리/상승률 등)은 어떤 기준으로 설정/고정할 것인가(초기 가정 출처 표기 여부 포함)?