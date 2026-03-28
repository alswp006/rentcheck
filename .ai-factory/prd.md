# RentCheck (rentcheck)

# PRD
## Background / Problem
- 한국의 주거 선택은 **전세·월세·매매 3가지 옵션**을 동시에 비교해야 하는데(전세는 한국 고유 제도), 현재 시장의 계산기는 주로 **전월세 전환율** 수준만 제공해 **N년 뒤 순자산**을 한 번에 비교하기 어렵다.
- 많은 사용자가 **“10년 뒤”** 관점에서 결과를 보고 싶어하지만, 결국 감(주변 말)에 의존해 **수억 원 단위**의 의사결정을 내린다.  
→ 모바일에서 입력 장벽 없이 빠르게 “N년 뒤 내 순자산이 가장 큰 선택”을 숫자로 확인할 도구가 필요하다.

## Goal (1-sentence product definition)
출시 3개월 내(앱인토스 기준) **월간 활성 시뮬레이션 실행 횟수 10,000회**를 달성하는, 전세·월세·매매 **3옵션의 N년 후 순자산 비교 시뮬레이터**를 제공한다.

## Non-goals
- 자체 회원가입/로그인 구현(토스 로그인 SDK 이외)
- 실거래가/매물 자동 조회(외부 API 연동 없이 직접 입력만)
- 세금 정밀 계산(양도소득세/종부세 등) 및 복잡한 절세 시뮬레이션
- 대출 상품 비교/추천(금융상품 중개/광고)
- 특정 아파트/지역 검색 및 부동산 콘텐츠(리뷰/시세 등)

## Target Users (personas + use cases)
- **지민 (27, 사회초년생 직장인)** — 엑셀 없이 모바일에서 “전세대출 전세 vs 월세 + 투자”를 **10년 순자산**으로 빠르게 비교하고 싶음
- **수진 & 준혁 (32, 신혼부부)** — “전세 3억 vs 내집 5억” 논쟁을 **같은 조건**으로 입력해 **숫자 결과**로 합의하고 싶음
- (확장 페르소나) **병철 (38, 전세 재계약 직장인)** — 2년마다 반복되는 “이번엔 사야 하나”를 **집값 시나리오(상승률)**에 따라 즉시 바꿔보며 판단하고 싶음

## Target Market
- 지역: **대한민국(South Korea)**
- 사용자 특성: 토스 중심의 **20–40대 모바일 네이티브**, 금융/대출/자산 의사결정 관심이 높고, 짧은 시간에 결론(추천/차이금액)을 보고 싶어함
- 사용 맥락: 집 계약/재계약, 결혼/이사 시즌, 대출 금리 변동 시점에 수요 증가

## Data Entities (nouns with key fields)
- **PresetScenario**
  - `id: string`
  - `name: string` (예: “서울 신혼부부”)
  - `defaultInput: SimulationInput`
- **SimulationInput**
  - `presetId: string | null` (프리셋 사용 시)
  - 전세: `jeonseDepositKRW: number`, `jeonseLoanRatio: number(0~1)`, `jeonseLoanRateAPR: number(%)`
  - 월세: `monthlyDepositKRW: number`, `monthlyRentKRW: number`, `monthlyRentIncreaseRateAnnual: number(%)`
  - 매매: `buyPriceKRW: number`, `buyEquityKRW: number`, `buyLoanRateAPR: number(%)`, `buyLoanPeriodYears: number`, `buyRepaymentType: '원리금균등' | '원금균등' | '만기일시'`
  - 공통: `initialAssetKRW: number`, `stayPeriodYears: number`, `investmentReturnRateAnnual: number(%)`, `housePriceGrowthRateAnnual: number(%)`
- **OptionResult**
  - `option: 'JEONSE' | 'MONTHLY' | 'BUY'`
  - `netWorthByYearKRW: number[]` (0..N년)
  - `finalNetWorthKRW: number`
  - `totalCostKRW: number` (요약용)
- **SimulationResult**
  - `stayPeriodYears: number`
  - `results: OptionResult[]` (3개 옵션)
  - `recommendedOption: 'JEONSE' | 'MONTHLY' | 'BUY'`
  - `deltaToSecondBestKRW: number`
  - `insightCopy: string` (집값상승률 +1% 적용 후 1위/비교 차이 반영)
  - `costBreakdownRows: { label: string; valueKRW: number }[]` (비용 분석표 표시용)
- **HistoryEntry**
  - `id: string`
  - `createdAt: number` (epoch ms)
  - `label: string` (`"{프리셋명 또는 '직접 입력'} · 집값 {housePriceGrowthRate}% · {stayPeriod}년"`)
  - `input: SimulationInput`
- **SharePayload**
  - `encoded: string` (Base64 인코딩된 입력값)
  - `version: number` (향후 호환성)

## Core Flow (numbered steps)
1. 토스 앱에서 미니앱 진입 → 메인에서 **프리셋 카드 4종**과 “직접 입력하기”를 본다
2. 프리셋 선택(또는 직접 입력) → 입력값이 채워진 상태로 **결과 화면**으로 이동한다
3. 결과 화면에서 **전세/월세/매매 3장 요약 카드**와 **추천 옵션 배지**를 확인한다
4. **인사이트 1줄**(집값상승률 +1% 가정 시 차이 금액)을 확인하고, 라인 차트로 연도별 순자산 추이를 본다
5. “조건 수정하기” → 바텀시트에서 슬라이더/필드 변경 → 카드/인사이트/차트가 **즉시 리렌더링**된다
6. “공유하기”로 **쿼리 파라미터(Base64) URL 생성** 후 카카오톡 공유/복사, 필요 시 **히스토리**에서 최근 시뮬레이션을 재진입한다

## Success Metrics (measurable)
- **월간 활성 시뮬레이션 실행 횟수 10,000회** (출시 3개월 내)
- **프리셋 → 결과 전환율 ≥ 80%**
- **결과 화면 평균 체류 시간 ≥ 90초**
- **공유 URL 생성 수 월 ≥ 500건**
- **히스토리 재접속률 ≥ 20%** (히스토리에서 항목 탭하여 결과 재진입)

## MVP Scope (exhaustive feature list)
- **프리셋 시나리오 4종**: 메인 카드에서 즉시 선택, 선택 즉시 결과 진입
- **3탭 입력 폼 + 공통 설정**: 전세/월세/매매 입력 + 초기자산/거주기간/투자수익률/집값상승률 설정
- **결과 화면(핵심 페이오프)**: 옵션별 N년 후 순자산 카드 3장, 추천 배지, 차이 금액 표시 + 라인 차트(터치 툴팁) + 비용 분석표
- **인사이트 카피 자동 생성**: 집값상승률을 현재값 대비 **+1%**로 재계산해 1위 옵션의 유리함(차이 금액)을 문장으로 표시
- **실시간 슬라이더 업데이트**: 공통 설정 슬라이더 변경 시 결과(카드/인사이트/차트/표) 즉시 반영(클라이언트 순수 함수 계산)
- **히스토리(최근 5개) + 공유**: localStorage에 최근 5개 저장(자동 레이블) + 입력값 Base64 쿼리 URL 생성 및 카카오톡 공유

## Target Audience & Marketing
- 핵심 타겟: 집 구하기/재계약/결혼 준비 중인 **20–30대 토스 사용자**
- 가치 제안(메시지): “전세·월세·매매, **10년 뒤 내 순자산**을 한 번에 비교”
- 채널(브리프 기반): **카카오톡**, **네이버 블로그**, **유튜브(국내)**
- 크리에이티브 훅(랜딩 히어로):  
  1) 프리셋으로 3초 결과 2) 슬라이더로 시나리오 즉시 반영 3) “집값 1% 더 오르면 X만원 차이” 인사이트

## Monetization Strategy
- 권장: **인앱 광고**(Toss Ads SDK) 중심
  - 배너: 결과 화면 내 “비용 분석표” 이후 섹션 사이에 1슬롯(결과 이해 흐름을 방해하지 않는 위치)
  - 리워드: 결과 화면(최종 페이오프) 진입 시 **TossRewardAd로 결과 상세(차트/표 영역) 노출을 게이팅**하는 방식 고려(“광고 시청 후 상세 결과 보기”).  
  - 결제(Freemium)는 브리프에 구체 범위가 없어 **MVP에서는 필수로 두지 않음**(추후 광고 제거/히스토리 확장 등으로 검토 가능)

## Assumptions
1. 사용자는 실거래가 자동 연동 없이도 “대략적 입력”만으로 비교 가치를 느낀다.
2. 모든 계산은 클라이언트에서 처리 가능하며, 네트워크 API 없이도 성능/정확성에 문제가 없다.
3. localStorage 5MB 제한 내에서 최근 5개 히스토리 저장은 안정적으로 동작한다.
4. 공유는 “동일 조건 재현”이 목적이며, 서버 저장 없이 쿼리 파라미터(Base64)로 충분하다.
5. 결과 화면에서 추천 옵션을 제시해도 금융상품 판매/중개가 아니라 “비교 시뮬레이션”으로 인식된다.
6. 사용자는 평균 90초 이상 결과 화면에 머무르며 슬라이더를 1회 이상 조작할 동기가 있다.
7. 프리셋 4종이 초기 진입 장벽을 유의미하게 낮춘다.
8. 카카오톡 공유는 커플/가족 의사결정 상황에서 핵심 확산 채널로 작동한다.

## Open Questions
1. “투자수익률”의 기본값/설명 문구를 어떻게 제공해야 오해(확정 수익) 없이 이해되는가?
2. 매매 옵션의 상환방식(원리금균등/원금균등/만기일시)별 계산 정의를 MVP에서 어디까지 단순화할 것인가?
3. 보유세 “단순 추정”을 MVP에 포함할지(브리프에는 ‘단순 보유세 추정만 제공’ 언급 있으나, 구체 포함 범위 확정 필요)
4. 리워드 광고 게이팅 범위: 결과 전체를 막을지, “상세(차트/표)”만 막을지 어떤 방식이 전환/이탈 균형이 좋은가?
5. 공유 URL의 버전 관리/호환성(필드 추가 시 구버전 링크 처리)을 어떤 규칙으로 할 것인가?