# RentCheck (rentcheck)

# PRD
## Background / Problem
- 현재 시장의 계산기는 **전·월세 전환율** 중심으로, **전세·월세·매매 3가지 선택지의 “N년 후 순자산”을 동시에 비교**해주지 못한다.
- 사용자는 통상 **10년 단위의 장기 의사결정**(거주기간)과 **수억 원 규모의 주거 의사결정**을 감(주변 말)으로 내리게 된다.

전세라는 한국 특유 제도 때문에 “전세 vs 월세 vs 매매”를 같은 기준으로 비교해야 하지만, 이를 한 화면에서 입력·시뮬레이션·인사이트까지 제공하는 도구가 없다. 그 결과, 엑셀 사용이 익숙하지 않은 대다수 사용자는 핵심 변수(집값상승률/투자수익률/금리) 변화에 따른 순자산 차이를 빠르게 확인하지 못한다.

## Goal (1-sentence product definition)
앱 출시 3개월 내 **월간 활성 시뮬레이션 횟수 10,000회**를 달성하는, 전세·월세·매매의 **N년 후 순자산을 숫자로 비교**하는 토스 미니앱 시뮬레이터.

## Non-goals
- 실거래가/매물 자동 조회 및 지역·단지 검색 기능(외부 API 연동 없이 직접 입력만)
- 세금 정밀 계산(양도소득세/종부세 등) 및 법/세무 자문 제공
- 대출 상품 비교/추천/중개(금융상품 판매·광고로 오인될 수 있는 기능 포함)
- 자체 회원가입/로그인(토스 로그인 SDK 외 별도 인증 시스템)
- 다중 시나리오(3개 이상) 동시 저장/비교, 협업, 서버 기반 동기화

## Target Users (personas + use cases)
- **지민 (27세, 사회초년생 직장인)** — 첫 독립을 앞두고 *“전세대출 받아 전세 vs 월세 살며 투자”*를 비교하고 싶지만 엑셀이 어렵다.  
  - 사용 케이스: 프리셋으로 빠르게 결과 확인 → 공통 슬라이더(집값/수익률) 조정으로 시나리오 감 잡기
- **수진 & 준혁 (32세, 신혼부부)** — *전세 3억 vs 매매 5억*을 두고 의견이 갈려 **10년 뒤 순자산**으로 결론을 보고 싶다.  
  - 사용 케이스: 입력값을 정확히 넣고 → 결과 화면(카드/차트/비용표)로 근거 확보 → 카카오톡 공유로 합의

## Target Market
- **South Korea (KR)**, 토스 미니앱 사용자(모바일 네이티브, 20~40대 중심, 금융·자산 의사결정 관심층)
- 한국 고유의 **전세 제도**가 존재해 3옵션 동시 비교 니즈가 명확한 시장

## Data Entities (nouns with key fields)
- **PresetScenario**
  - `id: string`
  - `name: string` (예: "서울 신혼부부")
  - `defaults: SimulationInput`
- **SimulationInput**
  - `presetId: string | null`
  - 전세: `jeonseDeposit: number`, `jeonseLoanRatio: number`, `jeonseInterestRate: number`
  - 월세: `monthlyDeposit: number`, `monthlyRent: number`, `monthlyRentIncreaseRate: number`
  - 매매: `buyPrice: number`, `buyEquity: number`, `buyLoanInterestRate: number`, `buyLoanPeriodYears: number`, `buyRepaymentType: '원리금균등' | '원금균등' | '만기일시'`
  - 공통: `initialAsset: number`, `residenceYears: number`, `investmentReturnRate: number`, `housePriceGrowthRate: number`
- **SimulationResult**
  - `netWorthByYear: { year: number; jeonse: number; monthly: number; buy: number }[]`
  - `finalNetWorth: { jeonse: number; monthly: number; buy: number }`
  - `recommendedOption: 'jeonse' | 'monthly' | 'buy'`
  - `insightCopy: string` (집값상승률 현재값 +1% 적용 시 1위 옵션 순자산 차이 기반)
  - `costBreakdown: { item: string; jeonse: number; monthly: number; buy: number }[]`
- **HistoryEntry**
  - `id: string`
  - `createdAt: number` (epoch ms)
  - `label: string` (규칙: `"{프리셋명 또는 '직접 입력'} · 집값 {housePriceGrowthRate}% · {residenceYears}년"`)
  - `input: SimulationInput`
- **SharePayload**
  - `v: number` (버전)
  - `input: SimulationInput`
  - (URL 쿼리 파라미터로 Base64 인코딩/디코딩)

## Core Flow (numbered steps)
1. 토스 앱에서 미니앱 진입 → 메인에서 **프리셋 4종**과 “직접 입력하기”를 확인
2. 프리셋 선택 또는 직접 입력 진입 → 입력값이 채워진 상태로 **결과 화면 이동**
3. (Payoff) **결과 확인 직전 TossRewardAd로 게이트** → 광고 시청 완료 시 결과 렌더링
4. 결과 화면에서 **순자산 카드 3장 + 추천 뱃지 + 인사이트 1줄 + 라인 차트** 확인
5. “조건 수정하기” → 바텀시트/탭 입력에서 값 조정 → **실시간 리렌더링**으로 결과 변화 확인
6. “저장/히스토리”로 최근 5개 자동 저장 확인 → “공유하기”로 **Base64 URL 생성 + 카카오톡 공유**

## Success Metrics (measurable)
- **월간 활성 시뮬레이션 실행 10,000회** (출시 3개월 내)
- **프리셋 → 결과 전환율 80% 이상**
- **결과 화면 평균 체류 시간 90초 이상**
- **공유 URL 생성 수 월 500건 이상**
- **히스토리 재접속률 20% 이상** (localStorage 기반 재방문 지표)

## MVP Scope (exhaustive feature list)
- **프리셋 시나리오 4종**: 메인 카드로 즉시 선택, 선택 즉시 결과로 이동
- **3탭 입력 폼 + 공통 설정**: 전세/월세/매매 입력 + 초기자산/거주기간/투자수익률/집값상승률
- **결과 화면(비교 + 설명)**: 옵션별 N년 후 순자산 카드 3장, 1위 옵션 추천 뱃지, 인사이트 1줄, 연도별 순자산 라인 차트(터치 툴팁), 비용 분석표
- **인사이트 자동 생성 로직**: 집값상승률을 **현재값 +1%**로 재계산했을 때 1위 옵션의 순자산 차이를 문장으로 생성
- **실시간 슬라이더 업데이트**: 공통 설정 변경 시 카드/인사이트/차트가 즉시 리렌더링(클라이언트 순수 함수 계산)
- **히스토리(최근 5개) + 공유**: localStorage에 최근 5개 저장, 자동 레이블 생성, 입력값 Base64 쿼리 URL 생성 및 카카오톡 공유

## Target Audience & Marketing
- **핵심 타겟**: 집 구하기 전후로 “전세 vs 월세 vs 매매”를 고민하는 20~30대 토스 사용자(신혼부부/사회초년생/재계약 직장인)
- **핵심 메시지**: “전세·월세·매매, **10년 뒤 내 순자산**을 숫자로 비교”
- **히어로 기능 3종(랜딩 카피 포인트)**  
  1) 프리셋으로 3초 만에 결과 확인  
  2) 슬라이더로 집값·수익률 시나리오 즉시 반영  
  3) “집값 1%만 더 오르면 X만원 차이” 인사이트 자동 생성
- **채널(브리프 기반)**: 카카오톡 공유(바이럴), 네이버 블로그(설명형 콘텐츠), 유튜브 KR(사례/튜토리얼)

## Monetization Strategy
- **유료 기능(Freemium) + 인앱 광고 병행 추천**
  - 무료: 결과 확인 시 **TossRewardAd 게이트(결과 화면 Payoff 시점 1회)** + 결과 화면 하단/분석표 사이에 **배너 AdSlot 1개**(콘텐츠 방해 최소)
  - 유료(토스페이먼츠): **“광고 없이 결과 보기(리워드 광고 스킵)”** 1회 구매(또는 기간형)로 해제  
- 이유: 계산/비교 유틸리티는 무료 유입이 크고, 결과 확인 순간 동기가 가장 커 **리워드 광고 전환이 높음**. 동시에 반복 사용자는 광고 제거 니즈가 있어 결제로 보완 가능.

## Assumptions
1. 모든 시뮬레이션 입력/히스토리는 **localStorage**에 저장하며 최근 5개만 유지해 용량(~5MB) 리스크를 제한한다.
2. 네트워크 연결은 항상 가능하다고 가정하며(토스 앱 환경), 오프라인 퍼스트는 고려하지 않는다.
3. 계산은 전부 클라이언트 사이드 순수 함수로 수행하며, 외부 시세/실거래가 API는 사용하지 않는다.
4. “정답” 제공이 아니라 **가정 기반 시뮬레이션**임을 결과 화면에 명시해 오해를 줄인다.
5. 카카오톡 공유는 동일 조건 재현을 위해 **Base64 쿼리 파라미터**만으로 입력을 복원한다(서버 저장 링크 없음).
6. 결과 화면이 앱의 Payoff이므로 **리워드 광고 게이트는 결과 공개 직전 1회**만 적용한다(입력 단계에는 적용하지 않음).
7. “대출 상품 추천/중개”로 해석될 수 있는 UI/카피는 배제하고, 사용자가 입력한 금리/비율을 계산에만 사용한다.
8. 모바일 한 손 조작을 위해 입력은 탭/바텀시트 중심, 스크롤은 섹션 단위로 구성한다.

## Open Questions
1. 결과 계산의 “순자산” 정의에 포함/제외할 항목 범위(예: 보유세는 “단순 추정”만 제공) 문구를 어디까지 명확히 할지?
2. 매매 대출의 상환방식(원리금/원금/만기일시)별 월 상환 계산식을 MVP에서 어느 수준으로 단순화할지?
3. 히스토리 5개 제한에서 사용자가 불편을 느끼는 임계점이 있는지(유료 기능으로 확장 여부 포함)?
4. 공유 URL의 길이가 길어질 때(입력값 많음) 카카오톡 공유/복사 UX 문제가 없는지?
5. 리워드 광고를 “결과 최초 진입 시 1회”로 고정할지, “조건 변경 후 결과 재확인 시” 재노출 규칙을 둘지?