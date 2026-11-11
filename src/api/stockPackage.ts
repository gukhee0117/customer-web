import { apiClient } from './client'

// 주식 패키지 API (maria: /api/customer/stock-packages/**)
// 로그인 세션(쿠키)이 필요하다. 설명 문장은 서버가 사전에 검수한 문장에 계산한 값만 끼워 만든 것이라 화면에서 고쳐 쓰지 않고 그대로 보여준다.
// 투자 권유가 아닌 정보 제공이다: 서버는 순위·점수·추천 이유를 내려주지 않는다.

interface ApiResponse<T> {
  message: string
  data: T
}

export type ProductType = 'STOCK' | 'FUND'
export type CandidateSortKey = 'NAME' | 'RISK_GRADE' | 'VOLATILITY'
export type SortDirectionKey = 'ASC' | 'DESC'

// 지표 하나의 설명: definition은 지표의 뜻, facts는 이 패키지(또는 이 고객)의 값과 기준선
export interface ExplanationBlock {
  metric: string
  title: string
  definition: string
  facts: string[]
}

// ───── 설문 성향 · 거래에서 본 경향 ─────

export interface Tendency {
  survey: {
    available: boolean
    investorType: string | null
    label: string | null
    allowedMinGrade: number | null
    assessedAt: string | null
    expired: boolean
  }
  trading: {
    available: boolean
    minBuyCount: number
    orderCount: number
    buyCount: number
    sellCount: number
    ordersPerMonth: number | null
    sellRatioPercent: number | null
    avgBuyGrade: number | null
    gradeCoveragePercent: number | null
    gradeDistribution: { grade: number; sharePercent: number }[]
    topSector: { name: string; weight: number } | null
    topTheme: { name: string; weight: number } | null
  }
  comparison: { available: boolean; outOfRangeBuySharePercent: number | null }
  explanation: ExplanationBlock[]
  disclaimer: string
  checkedAt: string
}

// ───── 후보 보기 ─────

export interface CandidateRequest {
  productTypes?: ProductType[]
  themes?: string[]
  minGrade?: number | null
  maxGrade?: number | null
  keyword?: string
  includeOutOfProfile?: boolean
  sort?: CandidateSortKey
  direction?: SortDirectionKey
}

export interface CandidateItem {
  domesticProductId: number
  ticker: string
  name: string
  market: string | null
  type: ProductType
  sectorName: string | null
  themes: string[]
  riskGrade: number | null
  volatilityPercent: number | null
  outOfProfile: boolean | null // null이면 내 성향 범위를 판단할 수 없음
  selectable: boolean
  unselectableReason: string | null
}

export interface CandidateList {
  items: CandidateItem[]
  totalCount: number
  truncated: boolean
  profileAvailable: boolean
  allowedMinGrade: number | null
  includeOutOfProfile: boolean
  sort: CandidateSortKey
  direction: SortDirectionKey
  summary: string[]
  disclaimer: string
  checkedAt: string
}

// ───── 말로 조건 찾기 ─────

export type ParseStatus = 'PARSED' | 'ADVICE_REFUSED' | 'NOT_UNDERSTOOD' | 'UNAVAILABLE'

export interface ParsedFilter {
  productTypes: ProductType[]
  themes: string[]
  minGrade: number | null
  maxGrade: number | null
  itemCountMin: number | null // 안내에만 쓰고 후보를 거르는 데는 쓰지 않음
  itemCountMax: number | null
  sort: CandidateSortKey | null
  direction: SortDirectionKey | null
}

export interface ParseResult {
  status: ParseStatus
  filter: ParsedFilter | null
  partial: boolean
  messages: string[]
  disclaimer: string
  checkedAt: string
}

// ───── 패키지 점검 ─────

export interface CheckRequestItem {
  domesticProductId: number
  weight: number
}

export interface CheckResult {
  itemCount: number
  avgRiskGrade: number
  profileAvailable: boolean
  outOfProfileCount: number | null
  outOfProfileNames: string[] | null
  volatilityPercent: number | null
  volatilityAsOf: string | null
  hhi: number
  equalWeightHhi: number
  topItem: { name: string; weight: number }
  contributions: { domesticProductId: number; name: string; weight: number; hhiSharePercent: number; riskGrade: number; outOfProfile: boolean | null }[]
  themes: { name: string; weight: number }[]
  sectors: { name: string; weight: number }[]
  unavailableFields: string[]
  allowedMinGrade: number | null
  explanation: ExplanationBlock[]
  disclaimer: string
  checkedAt: string
}

// ───── 내 패키지 · 보유 · 주문 내역 ─────

export interface PackageSummary {
  stockPackageId: number
  name: string
  totalAmount: number | null
  itemCount: number
  createdAt: string
  updatedAt: string
}

export interface PackageItem {
  domesticProductId: number
  ticker: string
  name: string
  weight: number // 목표 비중 %
  riskGrade: number | null
  outOfProfile: boolean | null // null이면 내 성향 범위를 판단할 수 없음
  unsuitableConfirmedAt: string | null
}

export interface PackageDetail {
  stockPackageId: number
  name: string
  totalAmount: number | null
  createdAt: string
  updatedAt: string
  items: PackageItem[]
}

// 담은 종목은 안 샀어도 qty 0으로 온다. 현재가를 받지 못한 종목은 price·평가 값이 null이다
export interface HoldingItem {
  domesticProductId: number
  ticker: string
  name: string
  securityTaxable: boolean // 팔 때 증권거래세 대상인지(코스피·코스닥 주식)
  qty: number
  avgPrice: number
  cost: number
  price: number | null
  previousClose: number | null
  changePercent: number | null
  evalAmount: number | null
  profitAmount: number | null
  profitRatePercent: number | null
}

export interface PackageHolding {
  stockPackageId: number
  items: HoldingItem[]
  totalCost: number
  totalEval: number | null
  totalProfit: number | null
  accountAmount: number | null
  buyingPower: number | null // 예수금에서 가정산을 뺀 주문 가능 금액
}

export type OrderStatusKey = 'EXECUTED' | 'REJECTED'

export interface OrderResult {
  orderId: number
  stockPackageId: number | null
  packageName: string | null
  domesticProductId: number
  ticker: string
  name: string
  side: 'BUY' | 'SELL'
  qty: number
  price: number | null
  amount: number | null
  feeAmount: number
  taxAmount: number
  status: OrderStatusKey
  rejectReason: string | null
  rejectMessage: string | null
  processedAt: string
}

// 오늘 기준 요율(%). 주문 창의 예상 금액 계산용이고 실제 금액은 체결할 때 서버가 같은 규칙으로 계산한다
export interface OrderFees {
  commissionRatePercent: number
  securitiesTaxRatePercent: number
}

export interface OrderRequest {
  idempotencyKey: string // 주문 한 번마다 새로 만든 값. 같은 값으로 다시 보내면 새로 체결하지 않고 처음 결과를 받는다
  items: { domesticProductId: number; side: 'BUY' | 'SELL'; qty: number }[]
}

export interface OrderResponse {
  orders: OrderResult[]
  accountAmount: number
  buyingPower: number
}

export interface SavePackageRequest {
  name: string
  totalAmount: number | null
  items: { domesticProductId: number; weight: number; unsuitableConfirmed: boolean }[]
}

export interface Quote {
  ticker: string
  available: boolean
  price: number | null
  previousClose: number | null
  upperLimit: number | null
  lowerLimit: number | null
}

const BASE = '/api/customer/stock-packages'

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> => p.then((res) => res.data.data)

export const fetchTendency = () => unwrap(apiClient.get<ApiResponse<Tendency>>(BASE + '/tendency'))
export const fetchThemes = () => unwrap(apiClient.get<ApiResponse<string[]>>(BASE + '/candidates/themes'))
export const searchCandidates = (req: CandidateRequest) => unwrap(apiClient.post<ApiResponse<CandidateList>>(BASE + '/candidates', req))
export const parseCondition = (text: string) => unwrap(apiClient.post<ApiResponse<ParseResult>>(BASE + '/candidates/parse', { text }))
export const checkPackage = (items: CheckRequestItem[]) => unwrap(apiClient.post<ApiResponse<CheckResult>>(BASE + '/check', { items }))
export const fetchPackages = () => unwrap(apiClient.get<ApiResponse<PackageSummary[]>>(BASE))
export const fetchPackage = (id: number) => unwrap(apiClient.get<ApiResponse<PackageDetail>>(BASE + '/' + id))
// 현재가(KIS)까지 받아 오므로 다른 요청보다 오래 걸릴 수 있다
export const fetchAllHoldings = () => unwrap(apiClient.get<ApiResponse<PackageHolding[]>>(BASE + '/holdings', { timeout: 30000 }))
export const fetchAllOrders = () => unwrap(apiClient.get<ApiResponse<OrderResult[]>>(BASE + '/orders'))
export const fetchOrderFees = () => unwrap(apiClient.get<ApiResponse<OrderFees>>(BASE + '/order-fees'))
export const fetchQuotes = (tickers: string[], signal?: AbortSignal) => unwrap(apiClient.get<ApiResponse<Quote[]>>(BASE + '/quotes', { params: { tickers: tickers.join(',') }, signal, timeout: 30000 }))
export const placeOrder = (packageId: number, req: OrderRequest) => unwrap(apiClient.post<ApiResponse<OrderResponse>>(BASE + '/' + packageId + '/orders', req, { timeout: 60000 }))
export const createPackage = (req: SavePackageRequest) => unwrap(apiClient.post<ApiResponse<PackageDetail>>(BASE, req))
export const updatePackage = (id: number, req: SavePackageRequest) => unwrap(apiClient.put<ApiResponse<PackageDetail>>(BASE + '/' + id, req))
export const deletePackage = (id: number) => apiClient.delete(BASE + '/' + id).then(() => undefined)

// 설문 성향(서버 값) → 끼루 아바타·성향 이름 키(화면 데이터의 PROFILES 키와 같다)
export const PROFILE_KEY: Record<string, string> = {
  STABLE: 'stable',
  CONSERVATIVE: 'stableSeek',
  NEUTRAL: 'neutral',
  ACTIVE: 'active',
  AGGRESSIVE: 'aggressive'
}

// ───── 성향별 추천 ─────
// 내 투자성향 범위 안에서 RIA 계좌로 살 수 있는 상품과 이유. 이유·답변은 서버가 가진 사실(등급·변동성·테마)로만 만든다

export type RecommendFilter = 'ALL' | 'STOCK' | 'FUND'
// 추천 기준: 설문으로 본 투자성향 / 거래로 본 경향
export type RecommendBasis = 'SURVEY' | 'TRADING'

export interface RecommendItem {
  domesticProductId: number
  ticker: string
  name: string
  market: string | null
  type: ProductType
  sectorName: string | null
  themes: string[]
  riskGrade: number
  volatilityPercent: number | null
  outOfProfile: boolean // 내 설문 투자성향 허용 범위보다 위험한 상품. 서버가 범위 안 상품만 추천하므로(테마 질문 포함) 지금은 항상 false
  reasons: string[]
  sectorMatched: boolean // 내가 가장 많이 산 업종과 같은 업종(거래 데이터가 없으면 false)
  themeMatched: boolean // 내가 가장 많이 산 테마에 속함(거래 데이터가 없으면 false)
  matchedTheme: string | null // 일치한 테마 이름(themeMatched가 false면 null)
}

export interface RecommendList {
  items: RecommendItem[]
  profileAvailable: boolean
  profileLabel: string | null
  allowedMinGrade: number | null
  filter: RecommendFilter
  basis: RecommendBasis
  basisAvailable: boolean // 이 기준으로 추천을 계산할 수 있는가(설문은 진단 유효, 거래는 체결 매수 최소 건수 이상)
  basisFacts: string[] // 거래 기준일 때 추천의 바탕이 된 경향 사실
  tradeBuyCount: number
  minBuyCount: number
  subtitle: string
  disclaimer: string
  checkedAt: string
  targetAdjusted: boolean // 거래 기준: 평균 매수 등급이 설문 허용 범위 밖이라 목표 등급을 허용 범위 경계로 보정했는가
  targetGrade: number | null // 추천을 고를 때 기준으로 쓴 목표 등급(보정 뒤)
  gradeFrom: number | null // 후보로 본 위험등급 범위(양 끝 포함, 1이 가장 위험). 추천을 계산하지 못했으면 null
  gradeTo: number | null
}

export interface RecommendAnswer {
  answer: string
  ticker: string | null // 있으면 그 종목의 "패키지에 담기" 버튼을 붙인다
  aiGenerated: boolean
  disclaimer: string
}

// ───── 종가 이력(차트) ─────
// 서버 업무일 이전 영업일의 저장 종가(날짜 오름차순). 현재가가 아니라서 표의 현재가와 조금 다를 수 있다

export interface PricePoint {
  date: string // 종가 기준일 YYYY-MM-DD
  close: number
}

export interface PriceHistory {
  ticker: string
  available: boolean // false면 이력을 받지 못한 종목(points는 비어 있음)
  points: PricePoint[]
}

export const fetchPriceHistory = (tickers: string[], days: number) =>
  unwrap(apiClient.get<ApiResponse<PriceHistory[]>>(BASE + '/price-history', { params: { tickers: tickers.join(','), days }, timeout: 30000 }))

export const fetchRecommendations = (filter: RecommendFilter, limit: number, basis: RecommendBasis) =>
  unwrap(apiClient.get<ApiResponse<RecommendList>>(BASE + '/recommendations', { params: { filter, limit, basis } }))
// limit: 지금 화면에 보이는 추천 종목 수. 서버가 화면과 같은 종목으로 답하려면 화면과 같은 값을 보내야 한다
export const askRecommendation = (question: string, focusTicker: string | null, basis: RecommendBasis, limit: number) =>
  unwrap(apiClient.post<ApiResponse<RecommendAnswer>>(BASE + '/recommendations/ask', { question, focusTicker, basis, limit }, { timeout: 20000 }))

// 서버가 문구를 주지 않을 때 쓰는 안내. 서버의 추천 안내 문구와 같은 문장으로 맞춰 둔다
export const REC_DISCLAIMER =
  '교육용 프로젝트의 자체 분석 결과예요. 수익을 보장하지 않으며, 실제 금융상품 판매·권유 절차를 대체하지 않아요. 투자 판단과 책임은 본인에게 있어요.'
