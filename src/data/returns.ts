// Returns 공통 데이터 — 원본 디자인(returns-data.js)의 RETURNS_DATA를 옮긴 단일 출처.
// 날짜 계산(dates, F)은 src/lib/calc.ts, 화면의 "오늘"은 src/lib/clock.ts의 getBusinessToday() 한 곳.
// 데이터 날짜는 고정값이 아니라 "기준일(F.anchor)로부터 N영업일 전"으로 정의 → 언제 열어도 앞뒤가 맞음.
// 주석·문구의 날짜 예시(10.21, 10.23 …)는 모두 "업무일 = 2026-11-18일 때"의 값. 금액·수량·차익률은 날짜와 무관. 모든 값은 예시.
import { F, addMonths, dates } from '../lib/calc'

// ===== 타입 =====
export type ProfileKey = 'stable' | 'stableSeek' | 'neutral' | 'active' | 'aggressive'
export type ChatProfile = ProfileKey | 'private' | 'me'
export type PackageId = 'semi-chain' | 'steady-div' | 'auto-parts'
export type AccountState = 'opened' | 'none' | 'reviewing' | 'rejected'
export type BenefitState = 'POSSIBLE' | 'REDUCED' | 'IMPOSSIBLE'

// 서버 프로필·진단 상태를 화면 전체가 같은 값으로 읽도록 담아 두는 값(로그인·새로고침·재진단 때 서버 값으로 채움, 브라우저에 저장하지 않음)
export interface ServerState {
  profile: ProfileKey | null // 서버 투자성향(미진단이면 null)
  account: AccountState // 서버 RIA 계좌 상태
  assess: string // 진단 상태: ok(유효) · expired(만료) · none(미진단)
}

export interface FixedDates {
  DEPOSIT_BASE: string
  JOIN_END: string
  DOCS_FROM_YEAR: number
  LAUNCH: string
}

export interface BizDates {
  anchor: string
  opened: string
  assessed: string
  assessValid: string
  deposit: string
  filled: string
  confirmed: string
  settled: string
  withdrawAvail: string
  buys: string[]
  reviewApplied: string
  newEtfSince: string
  benefitCancel: string
}

export interface DeductionBand {
  from: number
  to: number
  rate: number
}

export interface OverseasHolding {
  t: string
  name: string
  price: number
  qty: number
  rate: number
}

export interface Customer {
  name: string
  profile: ProfileKey | 'private' // 서버 투자성향, 미진단이면 'private'(기본 아바타)
  score: number
  domesticAssets: number
  birth: string
  phone: string
  email: string
}

// C.SOLD — 세액 계산용(체결일 구간 가중치)
export interface TaxSold {
  amount: number
  date: string
  filled: string
  confirmed: string
  gain: number
}

export interface Constants {
  readonly BUSINESS_DATE: string
  FIXED: FixedDates
  readonly CUSTOMER: Customer
  SELL_LIMIT: number
  readonly SOLD: TaxSold
  readonly HOLDINGS: OverseasHolding[]
  DEDUCTION_BANDS: DeductionBand[]
  BASIC_DEDUCTION: number
  TAX_RATE: number
  FEE_RATE: number
  SELL_TAX_RATE: number
  SELL_TAX_LABEL: string
  HOLD_YEARS: number
  URGENT_DAYS: number
}

export interface GradeRange {
  min: number
  max: number
}

export interface ProfileScoreRule {
  bands: [number, ProfileKey][]
  floor: ProfileKey
}

// 위험등급·RIA 편입 정보. 신선도(CURRENT/STALE/EXPIRED)는 계산하지 않고 데이터의 상태값을 그대로 쓴다.
export interface StockMeta {
  grade: number | null
  gradeBasis: string
  riaOk: boolean
  riaWhy?: string
}

export interface EtfInfo extends StockMeta {
  name: string
  mix: string
  since: string
  color: string
  ini: string
}

export interface RecInfo {
  cap: string
  per: string
  div: string
  lo: string
  hi: string
  seed: number
  extra: string
}

export interface Rec extends RecInfo {
  code: string
  reason: string
  profile: string
  allowedMin: number
  grade: number | null
  gradeBasis: string
  assessedAt: string
}

export interface PackageSummary {
  id: PackageId
  name: string
  ret: number
  count: number
  amt: number
  seed: number
  icons: [string, string][]
  items?: { n: string; c: string; amt: number }[]
}

export interface PackageHolding {
  code: string
  name: string
  qty: number
  avg: number
  cost: number
  target: number
}

export interface DomesticHolding {
  code: string
  name: string
  qty: number
  cost: number
  pkg: PackageId | null
  avg: number
}

export interface TradeRow {
  date: string
  kind: string
  text: string
  amount: number | null
  status: string
}

export interface Notif {
  date: string
  text: string
  short: string
}

export interface DomesticTrade {
  date: string
  code: string
  side: 'buy'
  qty: number
  px: number
  fee: number
  amount: number
  pkg: string
  ok: boolean
  why: string
}

export interface FlowMonth {
  month: string
  inflow: number
  buy: number
}

export interface Flow {
  inflow: number
  buyCost: number
  sold: number
  withdrawn: number
  cash: number
  evalAmt: number
  pnl: number
  monthly: FlowMonth[]
}

export interface Assessment {
  date: string
  validUntil: string
  score: number
  profile: ProfileKey
  validMonths: number
}

export interface AccountStateInfo {
  label: string
  appliedAt?: string
  reason?: string
}

export interface Benefit {
  state: BenefitState
  adj: number
  cancelledAt: string | null
  cancelReason: string
}

export interface Account {
  name: string
  no: string
  opened: string
  status: string
  state: AccountState
  sellLimit: number
  limitScope: string
  otherBrokerSold: number
}

export interface Assets {
  cash: number
  domesticInvest: number
  pkgInvest: number
  otherInvest: number
  domestic: number
  foreignHeld: number
  total: number
}

export interface Sold {
  amount: number
  filled: string
  confirmed: string
  settled: string
  gain: number
  bandRate: number
}

export interface Withdraw {
  paidIn: number
  paidDate: string
  availableDate: string
}

export interface ProfileInfo {
  label: string
  img?: string
}

// [id, 닉네임, 성향, 시간, 본문, 좋아요, 답글 수, 내 글(1) 여부]
export type ChatRow = [id: string, nick: string, profile: ChatProfile, time: string, text: string, likes: number, replies: number, mine: number]
// [id, 닉네임, 성향, 시간, 본문, 좋아요, 대상 닉네임]
export type ReplyRow = [id: string, nick: string, profile: ChatProfile, time: string, text: string, likes: number, target: string | null]
export type RankRow = [code: string, count: string]
export type HotRow = [title: string, code: string, postId: string, likes: number, replies: number]
export type LiveRow = [nick: string, profile: ChatProfile, text: string]

export interface ReturnsData {
  C: Constants
  FIXED: FixedDates
  ALLOWED_GRADE: Record<string, GradeRange>
  GRADE_NAMES: Record<number, string>
  GRADE_SOURCE: string
  PROFILE_SCORE: ProfileScoreRule
  ETF: Record<string, EtfInfo>
  RECS_BY_PROFILE: Record<string, string[]>
  serverState: () => ServerState
  setServerState: (patch: Partial<ServerState>) => ServerState
  readonly DATES: BizDates
  PROFILES: Record<string, ProfileInfo>
  SN: Record<string, string>
  PX: Record<string, [price: number, rate: number]>
  readonly RECS: Rec[]
  recsFor: (profile: string) => Rec[]
  readonly PKGS: PackageSummary[]
  readonly PKG_TOTAL_RET: number
  KR: Record<string, [string, string, string]>
  KR_ETF: Record<string, [string, string, string]>
  CHAT: Record<string, ChatRow[]>
  REPLIES: Record<string, ReplyRow[]>
  RANK: RankRow[]
  HOT: HotRow[]
  LIVE_BY_STOCK: Record<string, LiveRow[]>
  LIVE_POOL: LiveRow[]
  readonly TRADES: TradeRow[]
  readonly NOTIFS: Notif[]
  readonly DOMESTIC_BUYS: TradeRow[]
  readonly DOMESTIC_TRADES: DomesticTrade[]
  readonly KR_HOLDINGS: DomesticHolding[]
  readonly EVAL: number
  readonly FLOW: Flow
  WATCH: string[]
  COMMUNITY: { nickname: string; profilePublic: boolean }
  readonly CUSTOMER: Customer
  readonly ASSESSMENT: Assessment
  readonly ACCOUNT_STATE: AccountState
  readonly ACCOUNT_STATES: Record<AccountState, AccountStateInfo>
  readonly ACCOUNT: Account
  LINKED: { name: string; no: string; note: string }
  readonly ASSETS: Assets
  readonly SOLD: Sold
  readonly WITHDRAW: Withdraw
  readonly PKG_HOLDINGS: Record<PackageId, PackageHolding[]>
  readonly F: typeof F
  readonly META: Record<string, StockMeta>
}

// ===== 절대 바뀌지 않는 날짜 =====
export const FIXED: FixedDates = { DEPOSIT_BASE: '2025-12-23', JOIN_END: '2026-12-31', DOCS_FROM_YEAR: 2027, LAUNCH: '2026-03-23' }

// ===== 서버 값 상태(모든 페이지 공통, 메모리에만 둠) =====
const STATE_EVENT = 'returns-state' // 값이 바뀌면 이 이벤트로 알려 화면이 다시 그린다
let state: ServerState = { profile: null, account: 'opened', assess: 'ok' }
export const serverState = (): ServerState => state
const setServerState = (patch: Partial<ServerState>): ServerState => {
  state = { ...state, ...patch }
  try {
    window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: state }))
  } catch {
    // 이벤트 발행 실패는 무시
  }
  return state
}

// 상대 날짜 표(영업일 전) — 괄호는 업무일 = 2026-11-18일 때
export const OFF = { opened: 33, assessed: 23, deposit: 21, filled: 20 } // 개설(10.02) · 성향 진단(10.16) · 입고(10.20) · 매도 체결(10.21)
export const BUY_POS = [0, 0, 1 / 16, 6 / 16, 13 / 16, 1] // 국내 매수 6건: 원화 확정 다음 영업일 ~ 전 영업일 사이 위치(10.26 · 10.26 · 10.27 · 11.03 · 11.12 · 11.17)
const BUY_TXT = ['반도체 밸류체인 담기', '꾸준한 배당 담기', '자동차·부품 담기', '현대차·셀트리온', '반도체 밸류체인 추가', '꾸준한 배당 추가']

// ===== 국내 매매 체결 18건 = 국내 보유 = 평가의 단일 출처 =====
// [묶음(국내 매수 날짜 index 0~5), 코드, 수량, 체결가, 패키지 id(null = 패키지 밖)]
// 금액 = 수량 × 체결가 + 수수료(0.015%, 원 단위 반올림) → 18건 합계 31,800,000. 끝수는 한온시스템 333주 × 5,091원으로 맞춤
type DomBuy = [group: number, code: string, qty: number, price: number, pkg: PackageId | null]
const DOM_BUYS: DomBuy[] = [
  [0, '000660', 10, 388310, 'semi-chain'], [0, '005930', 15, 95350, 'semi-chain'], [0, '042700', 17, 95410, 'semi-chain'],
  [1, '105560', 24, 100100, 'steady-div'], [1, '005490', 6, 338280, 'steady-div'], [1, '055550', 32, 58560, 'steady-div'], [1, '033780', 12, 109800, 'steady-div'], [1, '017670', 36, 48920, 'steady-div'],
  [2, '000270', 20, 115880, 'auto-parts'], [2, '373220', 3, 388830, 'auto-parts'], [2, '012330', 5, 264040, 'auto-parts'], [2, '204320', 30, 37620, 'auto-parts'], [2, '018880', 333, 5091, 'auto-parts'],
  [3, '005380', 5, 246280, null], [3, '068270', 5, 179610, null],
  [4, '058470', 9, 178850, 'semi-chain'], [4, '240810', 41, 32778, 'semi-chain'],
  [5, '900020', 200, 13820, 'steady-div']
]
const DOM_REJECT: [number, string, string] = [4, '900040', 'RIA 계좌에서 살 수 없는 상품이에요(국내주식 비중 40%)'] // 거부 — 합계·보유에서 제외
const KN: Record<string, string> = { '000660': 'SK하이닉스', '005930': '삼성전자', '042700': '한미반도체', '058470': '리노공업', '240810': '원익IPS', '105560': 'KB금융', '005490': 'POSCO홀딩스', '055550': '신한지주', '033780': 'KT&G', '017670': 'SK텔레콤', '000270': '기아', '373220': 'LG에너지솔루션', '012330': '현대모비스', '204320': 'HL만도', '018880': '한온시스템', '005380': '현대차', '068270': '셀트리온', '900020': '국내고배당 ETF' }
const PKG_TARGET: Record<string, number> = { '000660': 30, '005930': 25, '042700': 15, '058470': 15, '240810': 15, '105560': 20, '005490': 15, '055550': 15, '033780': 15, '017670': 15, '900020': 20, '000270': 30, '373220': 15, '012330': 15, '204320': 15, '018880': 25 }
const buyAmt = (q: number, p: number): number => q * p + Math.round(q * p * 0.00015)

// 보유(종목별 매수 수량 합). avg = 수수료 포함 평균 매입가, cost = 매수 금액 합
const HOLD: DomesticHolding[] = (() => {
  const m = new Map<string, Omit<DomesticHolding, 'avg'>>()
  DOM_BUYS.forEach(([, code, qty, px, pkg]) => {
    if (!m.has(code)) m.set(code, { code, name: KN[code], qty: 0, cost: 0, pkg })
    const h = m.get(code)!
    h.qty += qty
    h.cost += buyAmt(qty, px)
  })
  return [...m.values()].map((h) => ({ ...h, avg: h.cost / h.qty }))
})()
const BUY_AMT = [0, 1, 2, 3, 4, 5].map((g) => DOM_BUYS.filter((b) => b[0] === g).reduce((s, b) => s + buyAmt(b[2], b[3]), 0)) // 합계 31,800,000
const BUY_TOTAL = BUY_AMT.reduce((s, v) => s + v, 0)

export const C: Constants = {
  get BUSINESS_DATE() { return F.biz() },
  FIXED,
  get CUSTOMER() { return D.CUSTOMER },
  SELL_LIMIT: 50000000,
  get SOLD() {
    const t = dates()
    return { amount: 38000000, date: t.confirmed, filled: t.filled, confirmed: t.confirmed, gain: 14000000 }
  },
  // 입고 해외주식(매도 가능)
  get HOLDINGS() {
    return [
      { t: 'TSLA', name: '테슬라', price: 450000, qty: 10, rate: 0.52 },
      { t: 'AAPL', name: '애플', price: 300000, qty: 20, rate: 0.31 },
      { t: 'NVDA', name: '엔비디아', price: 500000, qty: 8, rate: 0.28 },
      { t: 'MSFT', name: '마이크로소프트', price: 700000, qty: 5, rate: 0.24 }
    ]
  },
  DEDUCTION_BANDS: [{ from: 1, to: 5, rate: 1 }, { from: 6, to: 7, rate: 0.8 }, { from: 8, to: 12, rate: 0.5 }], // 매도 체결일이 들어가는 구간
  BASIC_DEDUCTION: 2500000,
  TAX_RATE: 0.22,
  FEE_RATE: 0.00015, // 매매 수수료 0.015% (예시)
  SELL_TAX_RATE: 0.002, // 증권거래세(예시) 0.20% — 실제 세율은 팀 확인 후 이 값만 바꿈
  SELL_TAX_LABEL: '증권거래세(예시)',
  HOLD_YEARS: 1,
  URGENT_DAYS: 14
}

// ===== 성향·위험등급 =====
export const ALLOWED_GRADE: Record<string, GradeRange> = { aggressive: { min: 1, max: 6 }, active: { min: 2, max: 6 }, neutral: { min: 4, max: 6 }, stableSeek: { min: 5, max: 6 }, stable: { min: 6, max: 6 } }
export const GRADE_NAMES: Record<number, string> = { 1: '매우 높은 위험', 2: '높은 위험', 3: '다소 높은 위험', 4: '보통 위험', 5: '낮은 위험', 6: '매우 낮은 위험' }
const GRADE_SOURCE = '키움증권 고객투자성향 및 금융투자상품 분류 기준'
// 진단 점수: 서버 9문항 합계(50점 만점). 구간은 서버 투자성향 분류와 같다 — 41점 이상 공격투자형 / 31~40 적극 / 21~30 중립 / 11~20 안정추구 / 10점 이하 안정. 초과 기준
export const PROFILE_SCORE: ProfileScoreRule = { bands: [[40, 'aggressive'], [30, 'active'], [20, 'neutral'], [10, 'stableSeek']], floor: 'stable' }

// ===== 국내 ETF(가명, 예시) =====
export const ETF: Record<string, EtfInfo> = {
  '900010': { name: '국내대형주200 ETF', mix: '국내주식 98%', since: '2019.03', color: '#2F5D8C', ini: 'K2', grade: 2, gradeBasis: '3년 VaR 34%', riaOk: true },
  '900020': { name: '국내고배당 ETF', mix: '국내주식 95%', since: '2020.07', color: '#7A5C2E', ini: 'HD', grade: 3, gradeBasis: '3년 VaR 27%', riaOk: true },
  '900030': { name: '반도체TOP10 ETF', mix: '국내주식 99%', since: '2021.05', color: '#5B3F8C', ini: 'S10', grade: 1, gradeBasis: '3년 VaR 52%', riaOk: true },
  '900040': { name: '국내채권혼합 ETF', mix: '국내주식 40%', since: '2018.09', color: '#3E7D6B', ini: 'B', grade: 5, gradeBasis: '3년 VaR 9%', riaOk: false, riaWhy: '국내주식 비중 40% (80% 이상이어야 RIA 계좌에서 살 수 있어요)' },
  '900050': { name: '신규2차전지 ETF', mix: '국내주식 97%', get since() { return F.dot(dates().newEtfSince) }, color: '#B5462F', ini: 'E', grade: null, gradeBasis: '3년 이력 부족 · 등급 없음', riaOk: false, get riaWhy() { return '설정 1개월이 지나야 살 수 있어요 (' + F.short(addMonths(dates().newEtfSince, 1)) + '부터)' } }
}
const ETF_PX: Record<string, [number, number]> = { '900010': [38450, 0.42], '900020': [13820, 0.18], '900030': [21600, 1.35], '900040': [10240, 0.05], '900050': [9980, -0.6] }
const KR_EXTRA = ['042700', '058470', '240810', '055550', '033780', '017670', '012330', '204320', '018880'] // 패키지 종목(국내 상장주식)

// ===== 추천(성향별, RIA 편입 가능 + 성향 허용 범위 안만) =====
const REC_INFO: Record<string, RecInfo> = {
  '005930': { cap: '587조 원', per: '14.2배', div: '1.6%', lo: '52,100', hi: '101,500', seed: 3, extra: '보유하신 해외 기술주와 같은 반도체 업종이고, RIA 계좌에서 살 수 있는 국내 대형주예요.' },
  '900020': { cap: '순자산 1.1조 원', per: '9.6배', div: '5.2%', lo: '11,240', hi: '14,350', seed: 9, extra: '배당 성향이 높은 국내 주식에 나눠 투자해서 한 종목 쏠림이 적어요. 1년 유지 기간 동안 들고 가기 무난한 편이에요.' },
  '005380': { cap: '52조 원', per: '5.1배', div: '4.8%', lo: '196,000', hi: '268,000', seed: 11, extra: '최근 3년 연속 배당을 늘렸고 경기에 덜 민감한 대형주예요.' },
  '900030': { cap: '순자산 2.4조 원', per: '13.1배', div: '0.7%', lo: '13,900', hi: '22,850', seed: 15, extra: '국내 반도체 대형주 10종목에 나눠 투자하는 ETF예요. 위험 1등급(매우 높은 위험) · 과거 3년 연 변동성 45%예요.' },
  '000660': { cap: '300조 원', per: '9.8배', div: '0.5%', lo: '162,000', hi: '438,000', seed: 7, extra: '메모리 반도체 매출 비중이 높은 회사예요. 위험 2등급(높은 위험) · 과거 3년 연 변동성 34%예요.' }
}
const RECS_BY_PROFILE: Record<string, string[]> = { active: ['005930', '900020', '005380'], aggressive: ['900030', '000660', '900020'], neutral: [], stableSeek: [], stable: [] }

const KR: Record<string, [string, string, string]> = { '005930': ['반도체', '#1428A0', 'S'], '000660': ['반도체', '#EA002C', 'SK'], '005380': ['자동차', '#002C5F', 'H'], '000270': ['자동차', '#05141F', 'K'], '068270': ['제약·바이오', '#0A8F5A', 'C'], '207940': ['제약·바이오', '#1C3C8C', 'S'], '373220': ['2차전지', '#A50034', 'L'], '035420': ['인터넷', '#03A94D', 'N'], '105560': ['금융', '#60584C', 'KB'], '005490': ['철강', '#05507D', 'P'] }

// 국내 종목 위험등급·RIA 편입: { grade, gradeBasis, riaOk, riaWhy }
export const META: Record<string, StockMeta> = {}
Object.keys(KR).concat(KR_EXTRA).forEach((c) => { META[c] = { grade: 2, gradeBasis: '3년 VaR 자체 산정', riaOk: true, riaWhy: '' } })

const D: ReturnsData = {
  C, FIXED, ALLOWED_GRADE, GRADE_NAMES, GRADE_SOURCE, PROFILE_SCORE, ETF, RECS_BY_PROFILE,
  serverState, setServerState,
  get DATES() { return dates() },
  PROFILES: {
    stable: { label: '안정형', img: 'assets/kkiru-stable.png' },
    stableSeek: { label: '안정추구형', img: 'assets/kkiru-stable-seek.png' },
    neutral: { label: '위험중립형', img: 'assets/kkiru-neutral.png' },
    active: { label: '적극투자형', img: 'assets/kkiru-active.png' },
    aggressive: { label: '공격투자형', img: 'assets/kkiru-aggressive.png' },
    private: { label: '비공개' }
  },
  SN: { TSLA: '테슬라', AAPL: '애플', NVDA: '엔비디아', MSFT: '마이크로소프트', '005930': '삼성전자', '000660': 'SK하이닉스', '005380': '현대차', '000270': '기아', '068270': '셀트리온', '207940': '삼성바이오로직스', '373220': 'LG에너지솔루션', '035420': 'NAVER', '105560': 'KB금융', '005490': 'POSCO홀딩스', '900010': '국내대형주200 ETF', '900020': '국내고배당 ETF', '900030': '반도체TOP10 ETF', '900040': '국내채권혼합 ETF', '900050': '신규2차전지 ETF', '042700': '한미반도체', '058470': '리노공업', '240810': '원익IPS', '055550': '신한지주', '033780': 'KT&G', '017670': 'SK텔레콤', '012330': '현대모비스', '204320': 'HL만도', '018880': '한온시스템' },
  PX: { TSLA: [0, 2.14], AAPL: [0, 0.48], NVDA: [0, -0.62], MSFT: [0, 0.33], '005930': [98400, 1.24], '000660': [412000, -0.85], '005380': [248500, 0.61], '000270': [118200, 1.02], '068270': [182300, -0.47], '207940': [1068000, 0.38], '373220': [386500, 2.15], '035420': [212000, -0.33], '105560': [98700, -0.4], '005490': [342000, 0.88], '042700': [104000, 1.86], '058470': [186000, 0.54], '240810': [33350, -0.75], '055550': [56800, -0.35], '033780': [112000, 0.27], '017670': [49100, 0.20], '012330': [268000, 0.56], '204320': [38000, -0.52], '018880': [5250, 0.96], ...ETF_PX },
  // 성향별 추천 — 행마다 스냅샷(profile, allowedMin, grade, gradeBasis, assessedAt). neutral·stableSeek·stable은 빈 배열
  get RECS() { return D.recsFor(D.CUSTOMER.profile) },
  recsFor(profile) {
    const al = ALLOWED_GRADE[profile] || ALLOWED_GRADE.stable, at = dates().assessed
    return (RECS_BY_PROFILE[profile] || []).map((code) => {
      const m = F.meta(code)
      return { code, ...REC_INFO[code], reason: REC_INFO[code].extra, profile, allowedMin: al.min, grade: m.grade, gradeBasis: m.gradeBasis, assessedAt: at }
    }).filter((r) => F.meta(r.code).riaOk && F.suitable(r.grade, profile))
  },
  // 패키지 평가금액·수익률·종목 수 = PKG_HOLDINGS(보유 주 수 × 현재가)에서 계산
  get PKGS() {
    const r2 = (n: number) => Math.round(n * 100) / 100
    const defs: { id: PackageId; name: string; seed: number; icons: [string, string][]; items?: boolean }[] = [
      { id: 'semi-chain', name: '반도체 밸류체인', seed: 5, icons: [['#EA002C', 'SK'], ['#1428A0', 'S'], ['#1E4FA0', 'H']], items: true },
      { id: 'steady-div', name: '꾸준한 배당', seed: 13, icons: [['#60584C', 'KB'], ['#05507D', 'P'], ['#002C5F', 'H']] },
      { id: 'auto-parts', name: '자동차·부품', seed: 4, icons: [['#002C5F', 'H'], ['#05141F', 'K'], ['#0B2D6B', 'M']] }
    ]
    return defs.map((p) => {
      const hs = D.PKG_HOLDINGS[p.id], amt = hs.reduce((s, h) => s + h.qty * D.PX[h.code][0], 0), cost = hs.reduce((s, h) => s + h.cost, 0)
      const o: PackageSummary = { id: p.id, name: p.name, ret: r2((amt / cost - 1) * 100), count: hs.length, amt, seed: p.seed, icons: p.icons }
      if (p.items) o.items = hs.map((h) => ({ n: h.name, c: h.code, amt: h.qty * D.PX[h.code][0] }))
      return o
    })
  },
  get PKG_TOTAL_RET() {
    const hs = HOLD.filter((h) => h.pkg), amt = hs.reduce((s, h) => s + h.qty * D.PX[h.code][0], 0), cost = hs.reduce((s, h) => s + h.cost, 0)
    return Math.round((amt / cost - 1) * 10000) / 100 // 원금 대비 합산
  },
  KR,
  // ETF 표시용: [업종 배지, 아이콘 색, 이니셜] — 커뮤니티 종목방(KR)과는 따로
  KR_ETF: { '900010': ['ETF', '#2F5D8C', 'K2'], '900020': ['ETF', '#7A5C2E', 'HD'], '900030': ['ETF', '#5B3F8C', 'S10'], '900040': ['ETF', '#3E7D6B', 'B'], '900050': ['ETF', '#B5462F', 'E'] },
    CHAT: {
    '000660': [
      ['t660-01', '반도체개미', 'aggressive', '14:32', 'HBM 뉴스 나오고 거래량 확 늘었네요', 24, 3, 0],
      ['t660-02', '리아', 'me', '14:20', 'NVDA 실적 발표 전엔 다들 관망하는 분위기인가요?', 8, 2, 1],
      ['t660-03', '장기보유러', 'neutral', '14:05', '52주 최고가 근처라 무섭긴 한데 저는 세 번에 나눠 사는 중이에요. 오늘이 두 번째', 15, 0, 0],
      ['t660-04', '도시락', 'private', '13:48', '외국인 3일째 순매도… 그래도 오늘은 -210억으로 많이 줄었어요', 6, 1, 0],
      ['t660-05', '차분한투자', 'stable', '13:31', 'ㅎㅎ 저는 그냥 배당주로 갑니다', 4, 0, 0],
      ['t660-06', '새벽시장', 'active', '13:12', '메모리 단가 기사 보면 내년 상반기까진 괜찮아 보이는데 다들 어떻게 보세요?', 48, 23, 0],
      ['t660-07', '익명투자자', 'private', '12:58', '41만 원 깨지면 일단 정리합니다', 22, 9, 0],
      ['t660-08', '리아', 'me', '12:40', 'RIA 자금으로 담을 수 있는 종목인지 확인했어요', 3, 0, 1],
      ['t660-09', '차트공부', 'neutral', '12:21', '20일선 위로 다시 올라왔네요. 거래량이 같이 붙는지 보는 중', 7, 1, 0],
      ['t660-10', '도시락', 'private', '12:04', '한빛경제 기사 보니 HBM 공급 계약 얘기가 또 나왔던데 확정은 아닌 듯해요', 12, 2, 0],
      ['t660-11', '익명투자자', 'private', '11:47', '점심 전에 한 번 흔들고 가네요', 3, 0, 0],
      ['t660-12', '가치투자', 'stable', '11:30', '저는 실적 발표까지는 그냥 들고 있으려고요.\n분기 영업이익 컨센서스가 얼마였죠?', 5, 2, 0],
      ['t660-13', '불개미', 'aggressive', '11:12', '41만 원대 지지 확인하면 조금 더 담아볼까 생각 중', 4, 1, 0],
      ['t660-14', '장기보유러', 'neutral', '10:55', '메모리 업황은 몇 달 단위로 봐야지 하루하루 보면 멘탈이 남아나질 않네요 ㅎㅎ', 9, 0, 0],
      ['t660-15', '리아', 'me', '10:38', 'RIA 계좌로 처음 담아본 종목이라 괜히 더 신경 쓰이네요', 6, 2, 1]
    ],
    '005930': [
      ['t930-01', '가치투자', 'stable', '14:40', '배당 기준일 전이라 그런지 거래가 늘었네요', 18, 2, 0],
      ['t930-02', '리아', 'me', '14:11', 'HBM 2배 기사 원문 보신 분?', 5, 1, 1],
      ['t930-03', '오후세시', 'active', '13:55', '10만 원 앞에서 벌써 네 번째 멈춤… 이번엔 넘을까요', 44, 18, 0],
      ['t930-04', '차트공부', 'neutral', '13:40', '거래대금 기준 오늘 코스피 1위', 7, 0, 0],
      ['t930-05', '해외에서복귀', 'stableSeek', '13:02', 'RIA로 돌아온 돈 1,200만 원 중에 절반 여기 담았습니다', 61, 37, 0],
      ['t930-06', '불개미', 'aggressive', '12:47', '오늘 장 마감 전에 한 번 더 밀어줄 듯', 3, 1, 0],
      ['t930-07', '익명투자자', 'private', '12:30', '반도체 수출 지표 발표 일정 아시는 분 있나요?', 2, 1, 0],
      ['t930-08', '차분한투자', 'stable', '12:18', '배당 기준일이 언제인지 헷갈리는 분들 계실까 봐… 12월 말 기준이에요', 9, 1, 0],
      ['t930-09', '새벽시장', 'active', '12:02', '외국인 순매수 3일째네요. 머니라인 수급 표 보면 규모는 크지 않아요', 6, 0, 0],
      ['t930-10', '반도체개미', 'aggressive', '11:45', '10만 원 돌파 기사 벌써 써놓은 데도 있던데 ㅎㅎ', 11, 2, 0],
      ['t930-11', '장기보유러', 'neutral', '11:26', '스마트폰 신제품 반응은 어떤가요? 주변에선 평이 갈리네요', 4, 1, 0],
      ['t930-12', '익명투자자', 'private', '11:08', '오늘 거래대금 1조 넘었네', 2, 0, 0],
      ['t930-13', '도시락', 'private', '10:51', '저는 매달 같은 날 조금씩 모으는 중이라 가격은 크게 안 봐요', 13, 1, 0],
      ['t930-14', '리아', 'me', '10:33', '서울비즈 기사에 파운드리 수주 얘기 있던데 원문 찾으신 분 있나요?', 3, 1, 1]
    ],
    '105560': [
      ['t5560-01', '가치투자', 'stable', '14:12', '분기 배당 기준일이 바뀌었다고 해서 다시 확인해 봤어요', 8, 1, 0],
      ['t5560-02', '도시락', 'private', '13:40', '주주환원 정책 발표 이후로 꾸준하네요', 6, 1, 0],
      ['t5560-03', '새벽시장', 'active', '13:11', '금리 인하 얘기 나오면 은행주는 좀 눌리는 편이라…', 5, 0, 0],
      ['t5560-04', '차트공부', 'neutral', '12:44', '98,700원, 10만 원 앞에서 쉬어가는 모양', 3, 0, 0],
      ['t5560-05', '익명투자자', 'private', '12:19', '배당 받고 다시 생각해 볼래요', 2, 0, 0],
      ['t5560-06', '리아', 'me', '11:52', '꾸준한 배당 패키지에서 제일 오래 들고 있는 종목이에요', 4, 1, 1]
    ],
    '207940': [
      ['t7940-01', '장기보유러', 'neutral', '14:10', '100만 원 넘는 주식은 1주 사기도 부담이에요 ㅎㅎ', 9, 1, 0],
      ['t7940-02', '차분한투자', 'stable', '13:44', '수주 잔고가 꾸준히 늘고 있어서 저는 길게 봐요', 6, 0, 0],
      ['t7940-03', '불개미', 'aggressive', '13:15', '4공장 가동률 얘기 서울비즈에 있던데 확인해 보신 분?', 4, 1, 0],
      ['t7940-04', '해외에서복귀', 'stableSeek', '12:49', '환율 영향 받는 종목이라 요즘 원화 강세가 좀 신경 쓰여요', 5, 1, 0],
      ['t7940-05', '익명투자자', 'private', '12:22', '오늘도 조용하네', 1, 0, 0],
      ['t7940-06', '오후세시', 'active', '11:58', '+0.38%, 큰 움직임 없이 마감할 듯', 2, 0, 0]
    ],
    '373220': [
      ['t220-01', '새벽시장', 'active', '14:21', '4조 수주, 실적엔 언제 반영될까\n계약 기간이 5년이라 한 해에 잡히는 건 생각보다 작을 것 같아요', 39, 15, 0],
      ['t220-02', '가치투자', 'stable', '13:58', '2차전지 쪽은 변동성이 커서 저는 비중을 작게만 가져가요', 8, 1, 0],
      ['t220-03', '불개미', 'aggressive', '13:40', '오늘 +2% 넘게 올랐네요. 수주 기사 효과인 듯', 6, 0, 0],
      ['t220-04', '도시락', 'private', '13:12', '데일리마켓에서 북미 공장 가동률 얘기 나왔던데 다들 보셨어요?', 5, 2, 0],
      ['t220-05', '익명투자자', 'private', '12:47', 'PER 100배 넘는 건 아무래도 부담…', 7, 1, 0],
      ['t220-06', '리아', 'me', '12:15', 'RIA 한도 남은 걸로 자동차·부품 패키지에 조금 넣어뒀어요', 2, 0, 1]
    ],
    '005380': [
      ['t380-01', '차트공부', 'neutral', '14:30', '248,500원이면 52주 최고가 근처네요', 5, 1, 0],
      ['t380-02', '해외에서복귀', 'stableSeek', '14:02', '배당 4.8%면 1년 들고 갈 만한가요\nRIA로 돌아온 돈이라 1년은 묶여 있어서 배당주 위주로 보고 있어요', 27, 21, 0],
      ['t380-03', '차분한투자', 'stable', '13:35', '3년 연속 배당을 늘린 건 확실히 장점이에요', 9, 1, 0],
      ['t380-04', '오후세시', 'active', '13:08', '환율 내려가면 수출주는 좀 쉬어가는 편이라 그 부분만 보는 중', 4, 0, 0],
      ['t380-05', '익명투자자', 'private', '12:41', '하이브리드 판매량 발표 언제쯤인가요?', 3, 1, 0],
      ['t380-06', '불개미', 'aggressive', '12:10', '전기차보다 하이브리드가 효자네요 요즘 ㅎㅎ', 6, 0, 0]
    ],
    '035420': [
      ['t420-01', '장기보유러', 'neutral', '14:15', '검색 광고 실적이 생각보다 버텨주네요', 6, 1, 0],
      ['t420-02', '새벽시장', 'active', '13:50', 'AI 서비스 유료화 얘기 나오던데 수익으로 이어질지는 좀 더 봐야 할 듯', 8, 2, 0],
      ['t420-03', '익명투자자', 'private', '13:22', '21만 원 박스권 언제 벗어나나…', 4, 0, 0],
      ['t420-04', '가치투자', 'stable', '12:58', '자사주 소각 공시 나온 거 보셨어요? 규모는 크지 않아요', 7, 1, 0],
      ['t420-05', '도시락', 'private', '12:31', '웹툰 쪽 자회사 소식은 한빛경제가 제일 빨리 쓰는 것 같아요', 3, 0, 0],
      ['t420-06', '불개미', 'aggressive', '12:05', '오늘 -0.3%면 선방이죠 뭐', 2, 0, 0]
    ],
    '068270': [
      ['t8270-01', '차분한투자', 'stable', '14:22', '바이오시밀러 신제품 허가 일정이 내년 초라고 하네요', 5, 1, 0],
      ['t8270-02', '오후세시', 'active', '13:55', '18만 원 초반에서 계속 왔다 갔다 하네요', 4, 0, 0],
      ['t8270-03', '해외에서복귀', 'stableSeek', '13:30', '합병 이후 실적 비교하기가 좀 어렵더라고요. 다들 어떤 지표 보세요?', 9, 2, 0],
      ['t8270-04', '익명투자자', 'private', '13:01', '오늘 거래량 적네', 1, 0, 0],
      ['t8270-05', '장기보유러', 'neutral', '12:36', '유럽 처방 데이터 머니라인에 정리돼 있던데 꽤 괜찮았어요', 6, 1, 0],
      ['t8270-06', '불개미', 'aggressive', '12:08', '-0.47%… 그래도 어제보단 낫네요', 2, 0, 0]
    ],
    '000270': [
      ['t270-01', '도시락', 'private', '14:18', '배당 5%대면 은행 예금보다 낫다는 얘기가 많네요', 11, 2, 0],
      ['t270-02', '차트공부', 'neutral', '13:46', '118,200원, 이번 주 고점 다시 시도하는 중', 4, 0, 0],
      ['t270-03', '가치투자', 'stable', '13:20', 'PER 4배대면 싸다는 사람도 있고 원래 그렇다는 사람도 있고 ㅎㅎ', 8, 1, 0],
      ['t270-04', '리아', 'me', '12:52', '자동차·부품 패키지에서 비중이 제일 큰 종목이라 매일 보게 되네요', 3, 1, 1],
      ['t270-05', '새벽시장', 'active', '12:27', '미국 판매량 데일리마켓 기사 보니 전년보다 늘었대요', 5, 0, 0],
      ['t270-06', '익명투자자', 'private', '12:01', '+1%면 오늘은 만족', 2, 0, 0]
    ],
    '005490': [
      ['t5490-01', '오후세시', 'active', '14:05', '리튬 가격 기사 나오니까 바로 움직이네요', 6, 1, 0],
      ['t5490-02', '장기보유러', 'neutral', '13:38', '철강보다 2차전지 소재 쪽 비중이 얼마나 되는지 궁금해요', 7, 2, 0],
      ['t5490-03', '차분한투자', 'stable', '13:06', '배당은 꾸준히 주는 편이라 그건 마음이 편해요', 5, 0, 0],
      ['t5490-04', '불개미', 'aggressive', '12:40', '+0.88%, 오늘 철강주 중에선 제일 낫네요', 3, 0, 0],
      ['t5490-05', '해외에서복귀', 'stableSeek', '12:13', '한빛경제에 아르헨티나 염호 얘기 있던데 진행 상황 아시는 분', 4, 1, 0],
      ['t5490-06', '익명투자자', 'private', '11:46', '34만 원대 계속 유지되면 좋겠다', 2, 0, 0]
    ]
  },
    // 답글: { 글ID: [[답글ID, 닉네임, 성향, 시간, 본문, 좋아요, 대상 닉네임 또는 null]] } — 오래된 순. 개수 = 글의 답글 수
    REPLIES: {
      't660-01': [
        ['t660-01-r1', '장기보유러', 'neutral', '14:35', '저도 봤어요. 거래량은 평소 두 배 정도', 4, null],
        ['t660-01-r2', '불개미', 'aggressive', '14:37', '뉴스 나오면 늘 이렇죠 ㅎㅎ', 2, null],
        ['t660-01-r3', '리아', 'me', '14:40', '두 배면 꽤 많네요', 1, '장기보유러']
      ],
      't660-02': [
        ['t660-02-r1', '차트공부', 'neutral', '14:24', '실적 발표 전날은 보통 조용하더라고요', 3, null],
        ['t660-02-r2', '도시락', 'private', '14:26', '저도 관망 중이에요', 1, null]
      ],
      't660-04': [
        ['t660-04-r1', '차분한투자', 'stable', '13:52', '줄어드는 건 좋은 신호 같아요', 2, null]
      ],
      't660-06': [
        ['t660-06-p1', '차분한투자', 'stable', '13:13', '결국 1년은 들고 가야 하니 길게 봐요', 3, null],
        ['t660-06-p2', '차트공부', 'neutral', '13:15', '저는 조금 더 지켜보려고요', 4, null],
        ['t660-06-p3', '장기보유러', 'neutral', '13:17', '머니라인 표 보니까 맞는 얘기 같아요', 0, null],
        ['t660-06-p4', '해외에서복귀', 'stableSeek', '13:19', '숫자로 보니까 이해가 잘 되네요', 1, null],
        ['t660-06-p5', '반도체개미', 'aggressive', '13:21', '저도 RIA 자금이라 비슷한 고민이에요', 2, null],
        ['t660-06-p6', '반도체개미', 'aggressive', '13:23', '이 부분은 실적 발표 때 확인해 봐야 할 듯', 3, null],
        ['t660-06-p7', '차트공부', 'neutral', '13:25', '다음 주 지표 나오면 다시 얘기해요', 4, null],
        ['t660-06-p8', '오후세시', 'active', '13:27', '공감합니다', 0, null],
        ['t660-06-p9', '가치투자', 'stable', '13:29', '저는 아직 확신이 안 서요…', 1, null],
        ['t660-06-p10', '장기보유러', 'neutral', '13:31', '저는 비중을 조금 줄여 뒀어요', 2, null],
        ['t660-06-p11', '해외에서복귀', 'stableSeek', '13:33', '좋은 정리 감사해요', 3, null],
        ['t660-06-p12', '가치투자', 'stable', '13:35', '데일리마켓에도 비슷한 분석 있었어요', 4, null],
        ['t660-06-p13', '해외에서복귀', 'stableSeek', '13:37', '기사 원문 링크 있으면 공유 부탁드려요', 0, null],
        ['t660-06-p14', '해외에서복귀', 'stableSeek', '13:39', '혹시 근거 자료 어디서 보셨어요?', 1, null],
        ['t660-06-p15', '장기보유러', 'neutral', '13:41', '저는 반대로 보는데 근거는 비슷하네요 ㅎㅎ', 2, null],
        ['t660-06-p16', '차트공부', 'neutral', '13:43', '급하게 판단 안 하려고요', 3, null],
        ['t660-06-p17', '장기보유러', 'neutral', '13:45', '저도 나눠서 하는 중이에요', 4, null],
        ['t660-06-p18', '장기보유러', 'neutral', '13:47', '정리 깔끔하네요', 0, null],
        ['t660-06-p19', '반도체개미', 'aggressive', '13:49', '오늘 거래량 보면 다들 비슷하게 생각하는 듯', 1, null],
        ['t660-06-r1', '반도체개미', 'aggressive', '13:51', '저도 상반기까진 괜찮다고 봐요. 재고가 줄었으니까', 5, null],
        ['t660-06-r2', '가치투자', 'stable', '13:53', '단가는 하반기에 다시 봐야 할 것 같아요', 3, null],
        ['t660-06-r3', '새벽시장', 'active', '13:55', '하반기 증설 얘기 때문인가요?', 1, '가치투자'],
        ['t660-06-r4', '가치투자', 'stable', '13:57', '네, 공급이 늘면 단가가 눌릴 수 있어서요', 2, '새벽시장']
      ],
      't660-07': [
        ['t660-07-p1', '장기보유러', 'neutral', '12:59', '저도 같은 생각이에요', 2, null],
        ['t660-07-p2', '차분한투자', 'stable', '13:00', '결국 1년은 들고 가야 하니 길게 봐요', 3, null],
        ['t660-07-p3', '장기보유러', 'neutral', '13:01', '저는 조금 더 지켜보려고요', 4, null],
        ['t660-07-p4', '장기보유러', 'neutral', '13:02', '머니라인 표 보니까 맞는 얘기 같아요', 0, null],
        ['t660-07-p5', '반도체개미', 'aggressive', '13:03', '숫자로 보니까 이해가 잘 되네요', 1, null],
        ['t660-07-p6', '가치투자', 'stable', '13:04', '저도 RIA 자금이라 비슷한 고민이에요', 2, null],
        ['t660-07-p7', '불개미', 'aggressive', '13:05', '이 부분은 실적 발표 때 확인해 봐야 할 듯', 3, null],
        ['t660-07-r1', '장기보유러', 'neutral', '13:06', '기준을 정해두는 거 좋네요', 3, null],
        ['t660-07-r2', '오후세시', 'active', '13:07', '저는 기준을 두 단계로 나눠요', 1, null]
      ],
      't660-09': [
        ['t660-09-r1', '반도체개미', 'aggressive', '12:24', '거래량은 아직 평범해요', 1, null]
      ],
      't660-10': [
        ['t660-10-r1', '가치투자', 'stable', '12:08', '확정 공시 전까지는 기다려 보려고요', 2, null],
        ['t660-10-r2', '리아', 'me', '12:11', '기사 날짜가 언제였어요?', 0, '도시락']
      ],
      't660-12': [
        ['t660-12-r1', '차트공부', 'neutral', '11:34', '컨센서스는 데일리마켓 기준으로 7조 조금 넘었어요', 4, null],
        ['t660-12-r2', '가치투자', 'stable', '11:36', '감사합니다', 1, '차트공부']
      ],
      't660-13': [
        ['t660-13-r1', '장기보유러', 'neutral', '11:15', '지지선 보는 거 좋네요. 저는 나눠서만 해요', 2, null]
      ],
      't660-15': [
        ['t660-15-r1', '도시락', 'private', '10:42', '첫 종목은 다 그렇죠 ㅎㅎ', 3, null],
        ['t660-15-r2', '차분한투자', 'stable', '10:45', '1년 유지만 신경 쓰시면 될 것 같아요', 2, null]
      ],
      't930-01': [
        ['t930-01-r1', '차분한투자', 'stable', '14:44', '기준일 전엔 늘 이렇죠', 2, null],
        ['t930-01-r2', '리아', 'me', '14:46', '기준일이 12월 말 맞죠?', 1, '차분한투자']
      ],
      't930-02': [
        ['t930-02-r1', '반도체개미', 'aggressive', '14:15', '머니라인에 원문 요약 있었어요', 3, null]
      ],
      't930-03': [
        ['t930-03-p1', '장기보유러', 'neutral', '13:56', '다음 주 지표 나오면 다시 얘기해요', 4, null],
        ['t930-03-p2', '해외에서복귀', 'stableSeek', '13:57', '공감합니다', 0, null],
        ['t930-03-p3', '해외에서복귀', 'stableSeek', '13:58', '저는 아직 확신이 안 서요…', 1, null],
        ['t930-03-p4', '차분한투자', 'stable', '13:59', '저는 비중을 조금 줄여 뒀어요', 2, null],
        ['t930-03-p5', '해외에서복귀', 'stableSeek', '14:00', '좋은 정리 감사해요', 3, null],
        ['t930-03-p6', '반도체개미', 'aggressive', '14:01', '데일리마켓에도 비슷한 분석 있었어요', 4, null],
        ['t930-03-p7', '도시락', 'private', '14:02', '기사 원문 링크 있으면 공유 부탁드려요', 0, null],
        ['t930-03-p8', '반도체개미', 'aggressive', '14:03', '혹시 근거 자료 어디서 보셨어요?', 1, null],
        ['t930-03-p9', '새벽시장', 'active', '14:04', '저는 반대로 보는데 근거는 비슷하네요 ㅎㅎ', 2, null],
        ['t930-03-p10', '장기보유러', 'neutral', '14:05', '급하게 판단 안 하려고요', 3, null],
        ['t930-03-p11', '가치투자', 'stable', '14:06', '저도 나눠서 하는 중이에요', 4, null],
        ['t930-03-p12', '도시락', 'private', '14:07', '정리 깔끔하네요', 0, null],
        ['t930-03-p13', '해외에서복귀', 'stableSeek', '14:08', '오늘 거래량 보면 다들 비슷하게 생각하는 듯', 1, null],
        ['t930-03-r1', '가치투자', 'stable', '14:09', '이번엔 거래량이 같이 붙어서 다를 수도요', 6, null],
        ['t930-03-r2', '차트공부', 'neutral', '14:10', '네 번째면 저항이 꽤 세네요', 4, null],
        ['t930-03-r3', '불개미', 'aggressive', '14:11', '넘으면 기사 엄청 나오겠네요 ㅎㅎ', 2, null],
        ['t930-03-r4', '오후세시', 'active', '14:12', '그래서 저도 반만 보고 있어요', 1, '차트공부'],
        ['t930-03-r5', '도시락', 'private', '14:13', '가격보다 꾸준히 모으는 쪽이 마음 편해요', 3, null]
      ],
      't930-05': [
        ['t930-05-p1', '가치투자', 'stable', '13:03', '저도 같은 생각이에요', 2, null],
        ['t930-05-p2', '오후세시', 'active', '13:05', '결국 1년은 들고 가야 하니 길게 봐요', 3, null],
        ['t930-05-p3', '장기보유러', 'neutral', '13:07', '저는 조금 더 지켜보려고요', 4, null],
        ['t930-05-p4', '새벽시장', 'active', '13:09', '머니라인 표 보니까 맞는 얘기 같아요', 0, null],
        ['t930-05-p5', '도시락', 'private', '13:11', '숫자로 보니까 이해가 잘 되네요', 1, null],
        ['t930-05-p6', '장기보유러', 'neutral', '13:13', '저도 RIA 자금이라 비슷한 고민이에요', 2, null],
        ['t930-05-p7', '장기보유러', 'neutral', '13:15', '이 부분은 실적 발표 때 확인해 봐야 할 듯', 3, null],
        ['t930-05-p8', '익명투자자', 'private', '13:17', '다음 주 지표 나오면 다시 얘기해요', 4, null],
        ['t930-05-p9', '차분한투자', 'stable', '13:19', '공감합니다', 0, null],
        ['t930-05-p10', '차분한투자', 'stable', '13:21', '저는 아직 확신이 안 서요…', 1, null],
        ['t930-05-p11', '반도체개미', 'aggressive', '13:23', '저는 비중을 조금 줄여 뒀어요', 2, null],
        ['t930-05-p12', '장기보유러', 'neutral', '13:25', '좋은 정리 감사해요', 3, null],
        ['t930-05-p13', '오후세시', 'active', '13:27', '데일리마켓에도 비슷한 분석 있었어요', 4, null],
        ['t930-05-p14', '장기보유러', 'neutral', '13:29', '기사 원문 링크 있으면 공유 부탁드려요', 0, null],
        ['t930-05-p15', '가치투자', 'stable', '13:31', '혹시 근거 자료 어디서 보셨어요?', 1, null],
        ['t930-05-p16', '가치투자', 'stable', '13:33', '저는 반대로 보는데 근거는 비슷하네요 ㅎㅎ', 2, null],
        ['t930-05-p17', '불개미', 'aggressive', '13:35', '급하게 판단 안 하려고요', 3, null],
        ['t930-05-p18', '새벽시장', 'active', '13:37', '저도 나눠서 하는 중이에요', 4, null],
        ['t930-05-p19', '장기보유러', 'neutral', '13:39', '정리 깔끔하네요', 0, null],
        ['t930-05-p20', '불개미', 'aggressive', '13:41', '오늘 거래량 보면 다들 비슷하게 생각하는 듯', 1, null],
        ['t930-05-p21', '불개미', 'aggressive', '13:43', '저도 같은 생각이에요', 2, null],
        ['t930-05-p22', '오후세시', 'active', '13:45', '결국 1년은 들고 가야 하니 길게 봐요', 3, null],
        ['t930-05-p23', '차분한투자', 'stable', '13:47', '저는 조금 더 지켜보려고요', 4, null],
        ['t930-05-p24', '반도체개미', 'aggressive', '13:49', '머니라인 표 보니까 맞는 얘기 같아요', 0, null],
        ['t930-05-p25', '가치투자', 'stable', '13:51', '숫자로 보니까 이해가 잘 되네요', 1, null],
        ['t930-05-p26', '새벽시장', 'active', '13:53', '저도 RIA 자금이라 비슷한 고민이에요', 2, null],
        ['t930-05-p27', '불개미', 'aggressive', '13:55', '이 부분은 실적 발표 때 확인해 봐야 할 듯', 3, null],
        ['t930-05-p28', '반도체개미', 'aggressive', '13:57', '다음 주 지표 나오면 다시 얘기해요', 4, null],
        ['t930-05-p29', '새벽시장', 'active', '13:59', '공감합니다', 0, null],
        ['t930-05-p30', '가치투자', 'stable', '14:01', '저는 아직 확신이 안 서요…', 1, null],
        ['t930-05-p31', '반도체개미', 'aggressive', '14:03', '저는 비중을 조금 줄여 뒀어요', 2, null],
        ['t930-05-p32', '차분한투자', 'stable', '14:05', '좋은 정리 감사해요', 3, null],
        ['t930-05-p33', '가치투자', 'stable', '14:07', '데일리마켓에도 비슷한 분석 있었어요', 4, null],
        ['t930-05-p34', '반도체개미', 'aggressive', '14:09', '기사 원문 링크 있으면 공유 부탁드려요', 0, null],
        ['t930-05-r1', '도시락', 'private', '14:11', '저도 비슷하게 나눴어요', 4, null],
        ['t930-05-r2', '장기보유러', 'neutral', '14:13', '나머지 반은 어디에 두셨어요?', 2, null],
        ['t930-05-r3', '해외에서복귀', 'stableSeek', '14:15', '나머지는 배당주 쪽이에요', 3, '장기보유러']
      ],
      't930-06': [
        ['t930-06-r1', '차분한투자', 'stable', '12:50', '장 마감 전엔 늘 변동이 있더라고요', 1, null]
      ],
      't930-07': [
        ['t930-07-r1', '새벽시장', 'active', '12:33', '다음 주 화요일이에요', 2, null]
      ],
      't930-08': [
        ['t930-08-r1', '가치투자', 'stable', '12:20', '정리 감사해요', 2, null]
      ],
      't930-10': [
        ['t930-10-r1', '장기보유러', 'neutral', '11:48', '기사 제목이 늘 빠르죠 ㅎㅎ', 3, null],
        ['t930-10-r2', '오후세시', 'active', '11:50', '저도 봤어요', 1, '반도체개미']
      ],
      't930-11': [
        ['t930-11-r1', '도시락', 'private', '11:30', '카메라는 좋다는 얘기가 많아요', 2, null]
      ],
      't930-13': [
        ['t930-13-r1', '리아', 'me', '10:55', '저도 그렇게 해볼까 해요', 1, '도시락']
      ],
      't930-14': [
        ['t930-14-r1', '반도체개미', 'aggressive', '10:36', '서울비즈 오늘 아침 기사예요', 2, null]
      ],
      't220-01': [
        ['t220-01-p1', '불개미', 'aggressive', '14:22', '좋은 정리 감사해요', 3, null],
        ['t220-01-p2', '가치투자', 'stable', '14:26', '데일리마켓에도 비슷한 분석 있었어요', 4, null],
        ['t220-01-p3', '장기보유러', 'neutral', '14:30', '기사 원문 링크 있으면 공유 부탁드려요', 0, null],
        ['t220-01-p4', '장기보유러', 'neutral', '14:34', '혹시 근거 자료 어디서 보셨어요?', 1, null],
        ['t220-01-p5', '차분한투자', 'stable', '14:38', '저는 반대로 보는데 근거는 비슷하네요 ㅎㅎ', 2, null],
        ['t220-01-p6', '불개미', 'aggressive', '14:42', '급하게 판단 안 하려고요', 3, null],
        ['t220-01-p7', '차분한투자', 'stable', '14:46', '저도 나눠서 하는 중이에요', 4, null],
        ['t220-01-p8', '반도체개미', 'aggressive', '14:50', '정리 깔끔하네요', 0, null],
        ['t220-01-p9', '가치투자', 'stable', '14:54', '오늘 거래량 보면 다들 비슷하게 생각하는 듯', 1, null],
        ['t220-01-p10', '도시락', 'private', '14:58', '저도 같은 생각이에요', 2, null],
        ['t220-01-r1', '가치투자', 'stable', '15:02', '연간으로 나누면 매출의 5% 정도라고 보면 될까요', 4, null],
        ['t220-01-r2', '새벽시장', 'active', '15:05', '네, 대략 그 정도로 계산했어요', 2, '가치투자'],
        ['t220-01-r3', '도시락', 'private', '15:08', '그래도 수주 잔고가 쌓이는 건 좋은 신호죠', 5, null],
        ['t220-01-r4', '불개미', 'aggressive', '15:11', '내년 1분기 실적부터 조금씩 보일 듯', 3, null],
        ['t220-01-r5', '장기보유러', 'neutral', '15:14', '저는 실적 반영 확인하고 다시 보려고요', 2, null]
      ],
      't220-02': [
        ['t220-02-r1', '리아', 'me', '14:01', '저도 패키지 안에서 비중을 작게 잡았어요', 1, null]
      ],
      't220-04': [
        ['t220-04-r1', '차트공부', 'neutral', '13:15', '가동률 80% 넘었다는 내용이었어요', 3, null],
        ['t220-04-r2', '도시락', 'private', '13:17', '생각보다 높네요', 1, '차트공부']
      ],
      't220-05': [
        ['t220-05-r1', '새벽시장', 'active', '12:50', '성장주라 PER만으로 보긴 어렵긴 해요', 3, null]
      ],
      't380-01': [
        ['t380-01-r1', '오후세시', 'active', '14:33', '최고가가 268,000원이었죠', 2, null]
      ],
      't380-02': [
        ['t380-02-p1', '가치투자', 'stable', '14:03', '혹시 근거 자료 어디서 보셨어요?', 1, null],
        ['t380-02-p2', '장기보유러', 'neutral', '14:05', '저는 반대로 보는데 근거는 비슷하네요 ㅎㅎ', 2, null],
        ['t380-02-p3', '장기보유러', 'neutral', '14:07', '급하게 판단 안 하려고요', 3, null],
        ['t380-02-p4', '불개미', 'aggressive', '14:09', '저도 나눠서 하는 중이에요', 4, null],
        ['t380-02-p5', '익명투자자', 'private', '14:12', '정리 깔끔하네요', 0, null],
        ['t380-02-p6', '오후세시', 'active', '14:14', '오늘 거래량 보면 다들 비슷하게 생각하는 듯', 1, null],
        ['t380-02-p7', '새벽시장', 'active', '14:16', '저도 같은 생각이에요', 2, null],
        ['t380-02-p8', '오후세시', 'active', '14:19', '결국 1년은 들고 가야 하니 길게 봐요', 3, null],
        ['t380-02-p9', '장기보유러', 'neutral', '14:21', '저는 조금 더 지켜보려고요', 4, null],
        ['t380-02-p10', '도시락', 'private', '14:23', '머니라인 표 보니까 맞는 얘기 같아요', 0, null],
        ['t380-02-p11', '장기보유러', 'neutral', '14:26', '숫자로 보니까 이해가 잘 되네요', 1, null],
        ['t380-02-p12', '가치투자', 'stable', '14:28', '저도 RIA 자금이라 비슷한 고민이에요', 2, null],
        ['t380-02-p13', '익명투자자', 'private', '14:30', '이 부분은 실적 발표 때 확인해 봐야 할 듯', 3, null],
        ['t380-02-p14', '장기보유러', 'neutral', '14:33', '다음 주 지표 나오면 다시 얘기해요', 4, null],
        ['t380-02-p15', '장기보유러', 'neutral', '14:35', '공감합니다', 0, null],
        ['t380-02-p16', '새벽시장', 'active', '14:37', '저는 아직 확신이 안 서요…', 1, null],
        ['t380-02-r1', '차분한투자', 'stable', '14:40', '1년 들고 갈 거면 배당 성향이 유지되는지가 중요해 보여요', 6, null],
        ['t380-02-r2', '가치투자', 'stable', '14:43', '3년 연속 늘렸으니 급하게 줄이진 않을 것 같아요', 4, null],
        ['t380-02-r3', '해외에서복귀', 'stableSeek', '14:46', '그 부분이 제일 마음 편한 이유예요', 2, '가치투자'],
        ['t380-02-r4', '리아', 'me', '14:49', '저도 RIA 자금이라 1년 기준으로 보고 있어요', 3, null],
        ['t380-02-r5', '불개미', 'aggressive', '14:52', '환율만 크게 안 움직이면 괜찮을 듯', 1, null]
      ],
      't380-03': [
        ['t380-03-r1', '도시락', 'private', '13:38', '배당 늘리는 회사는 믿음이 가요', 2, null]
      ],
      't380-05': [
        ['t380-05-r1', '차트공부', 'neutral', '12:44', '보통 매달 초에 나와요', 2, null]
      ],
      't420-01': [
        ['t420-01-r1', '가치투자', 'stable', '14:18', '광고가 버텨주니 다행이에요', 1, null]
      ],
      't420-02': [
        ['t420-02-r1', '장기보유러', 'neutral', '13:53', '유료 전환율이 관건이겠네요', 3, null],
        ['t420-02-r2', '새벽시장', 'active', '13:56', '네, 그 숫자가 나와야 판단할 수 있을 것 같아요', 1, '장기보유러']
      ],
      't420-04': [
        ['t420-04-r1', '도시락', 'private', '13:01', '규모는 작아도 방향은 좋네요', 2, null]
      ],
      't8270-01': [
        ['t8270-01-r1', '장기보유러', 'neutral', '14:25', '내년 초면 금방이네요', 1, null]
      ],
      't8270-03': [
        ['t8270-03-r1', '가치투자', 'stable', '13:33', '저는 영업이익률 위주로 봐요', 3, null],
        ['t8270-03-r2', '해외에서복귀', 'stableSeek', '13:36', '감사해요, 그걸로 다시 비교해 볼게요', 1, '가치투자']
      ],
      't8270-05': [
        ['t8270-05-r1', '차분한투자', 'stable', '12:39', '유럽 비중이 꽤 크더라고요', 2, null]
      ],
      't270-01': [
        ['t270-01-r1', '가치투자', 'stable', '14:21', '배당은 실적 따라 바뀔 수 있어서 그것만 주의하면 될 것 같아요', 4, null],
        ['t270-01-r2', '리아', 'me', '14:24', '맞아요, 작년 실적 기준이라서요', 1, '가치투자']
      ],
      't270-03': [
        ['t270-03-r1', '차트공부', 'neutral', '13:23', '업종 평균이 원래 낮긴 해요', 2, null]
      ],
      't270-04': [
        ['t270-04-r1', '도시락', 'private', '12:55', '저도 비중 큰 종목은 자꾸 보게 되더라고요 ㅎㅎ', 2, null]
      ],
      't7940-01': [
        ['t7940-01-r1', '차분한투자', 'stable', '14:13', '그래서 저는 금액으로 조금씩 모아요', 3, null]
      ],
      't7940-03': [
        ['t7940-03-r1', '장기보유러', 'neutral', '13:18', '가동률이 높다는 내용이었어요', 1, null]
      ],
      't7940-04': [
        ['t7940-04-r1', '가치투자', 'stable', '12:52', '달러 매출 비중이 높아서 그렇죠', 2, null]
      ],
      't5560-01': [
        ['t5560-01-r1', '도시락', 'private', '14:15', '저도 헷갈렸는데 정리 감사해요', 2, null]
      ],
      't5560-02': [
        ['t5560-02-r1', '장기보유러', 'neutral', '13:43', '자사주 소각도 같이 하더라고요', 2, null]
      ],
      't5560-06': [
        ['t5560-06-r1', '차분한투자', 'stable', '11:55', '오래 들고 계신 종목은 마음이 편하죠', 1, null]
      ],
      't5490-01': [
        ['t5490-01-r1', '장기보유러', 'neutral', '14:08', '리튬 가격이랑 같이 움직이는 날이 많아졌어요', 2, null]
      ],
      't5490-02': [
        ['t5490-02-r1', '가치투자', 'stable', '13:41', '아직은 철강 비중이 훨씬 커요', 3, null],
        ['t5490-02-r2', '장기보유러', 'neutral', '13:44', '그렇군요, 감사해요', 1, '가치투자']
      ],
      't5490-05': [
        ['t5490-05-r1', '차트공부', 'neutral', '12:16', '내년 상반기 생산 목표라고 들었어요', 2, null]
      ]
    },
    RANK: [['000660', '1,284'], ['005930', '1,102'], ['373220', '846'], ['005380', '611'], ['035420', '538'], ['068270', '402'], ['000270', '377'], ['207940', '295'], ['105560', '248'], ['005490', '190']],
    HOT: [
    ['메모리 단가, 내년 상반기까지 괜찮을까요?', '000660', 't660-06', 48, 23],
    ['RIA로 복귀한 자금 다들 어디에 담으셨어요?', '005930', 't930-05', 61, 37],
    ['10만 원 앞에서 또 멈춘 이유 정리해봤습니다', '005930', 't930-03', 44, 18],
    ['4조 수주, 실적엔 언제 반영될까', '373220', 't220-01', 39, 15],
    ['배당 4.8%면 1년 들고 갈 만한가요', '005380', 't380-02', 27, 21],
    ['41만 원 깨지면 정리합니다 (근거 있음)', '000660', 't660-07', 22, 9]
  ],
    // 실시간 예시 새 글(종목별): { 코드: [[닉네임, 성향, 내용]] }
    LIVE_BY_STOCK: {
      '105560': [['가치투자', 'stable', '분기 배당 기준일 바뀐 거 다시 확인하세요'], ['도시락', 'private', '주주환원 정책 발표 후로 꾸준히 오르네요'], ['새벽시장', 'active', '금리 인하 얘기 나와서 은행주 같이 눌리는 중'], ['차트공부', 'neutral', '98,700원, 10만 원 앞에서 쉬어가요']],
      '207940': [['장기보유러', 'neutral', '수주 잔고 공시 업데이트됐어요'], ['차분한투자', 'stable', '4공장 가동률 높다는 얘기 서울비즈에 있어요'], ['해외에서복귀', 'stableSeek', '원화 강세라 오늘은 조금 눌리네요'], ['불개미', 'aggressive', '100만 원 위에서 조용히 버티는 중']],
      '373220': [['불개미', 'aggressive', '수주 공시 후로 거래대금이 평소 두 배예요'], ['가치투자', 'stable', '북미 공장 가동률 숫자 데일리마켓에 나왔어요'], ['차트공부', 'neutral', '38만 원대 후반에서 계속 공방 중'], ['해외에서복귀', 'stableSeek', '실적 반영은 내년부터라 저는 천천히 보려고요']],
      '000660': [['오후세시', 'active', 'HBM 공급 얘기 다시 나오니까 거래량 바로 붙네요'], ['차트공부', 'neutral', '412,000원 근처에서 매수 호가가 두꺼워요'], ['도시락', 'private', '한빛경제에 메모리 고정가 협상 기사 떴어요'], ['가치투자', 'stable', '다음 분기 영업이익 추정치가 조금 올라갔네요'], ['불개미', 'aggressive', '41만 원 지지 이번에도 버티는 중']],
      '005930': [['새벽시장', 'active', '10만 원 앞 매도 물량이 오늘은 좀 얇아 보여요'], ['차분한투자', 'stable', '연말 배당 기준일까지 들고 갈 생각이에요'], ['차트공부', 'neutral', '외국인 순매수 4일째로 늘었어요'], ['장기보유러', 'neutral', '파운드리 수주 관련 서울비즈 기사 올라왔네요'], ['도시락', 'private', '98,400원, 오늘 고점 다시 시도하는 중']],
      '005380': [['차분한투자', 'stable', '배당 4.8%면 1년 보유 기준으로 꽤 괜찮네요'], ['오후세시', 'active', '하이브리드 판매량 발표 나왔어요, 전년보다 늘었대요'], ['차트공부', 'neutral', '248,500원, 52주 최고가까지 얼마 안 남았네요'], ['도시락', 'private', '환율 조금 내려와서 오후엔 쉬어가는 분위기']],
      '035420': [['장기보유러', 'neutral', '검색 광고 매출 성장률이 예상보다 높게 나왔네요'], ['새벽시장', 'active', 'AI 서비스 유료 가입자 수 공개됐어요'], ['가치투자', 'stable', '자사주 소각 일정 공시 확인했어요'], ['불개미', 'aggressive', '21만 원 박스 상단 다시 두드리는 중']],
      '068270': [['해외에서복귀', 'stableSeek', '유럽 처방 데이터 업데이트 머니라인에 올라왔어요'], ['차분한투자', 'stable', '신제품 허가 일정이 내년 초로 확정됐대요'], ['오후세시', 'active', '18만 원 초반에서 거래량이 조금 늘었어요'], ['장기보유러', 'neutral', '합병 후 영업이익률 추이 보니 개선 중이네요']],
      '000270': [['도시락', 'private', '배당 5%대 유지되면 저는 계속 들고 가요'], ['차트공부', 'neutral', '118,200원, 이번 주 고점 근처예요'], ['새벽시장', 'active', '미국 판매량 발표 나왔는데 전년보다 늘었어요'], ['가치투자', 'stable', 'PER 4배대는 여전히 낮은 편이네요']],
      '005490': [['오후세시', 'active', '리튬 가격 반등 기사 나오니까 바로 반응하네요'], ['장기보유러', 'neutral', '2차전지 소재 매출 비중 공시 확인했어요'], ['차분한투자', 'stable', '배당은 꾸준해서 마음 편히 들고 있어요'], ['해외에서복귀', 'stableSeek', '34만 원대 유지하면서 거래량이 늘었어요']]
    },
    LIVE_POOL: [['오후세시', 'active', '{n} 체결 강도 방금 확 올라갔네요'], ['차트공부', 'neutral', '오늘 거래대금 벌써 어제 수준 넘었어요'], ['도시락', 'private', '외국인 순매도 규모가 계속 줄어드는 중이에요'], ['새벽시장', 'active', '분할매수 세 번째 들어갔습니다'], ['가치투자', 'stable', '장 마감까지 조용히 지켜보려고요'], ['불개미', 'aggressive', '{n} 오후장에 한 번 더 움직일 것 같아요']],
    // 거래 진행(최근순) — 홈 "거래 진행 현황"·내 계좌와 같음
    get TRADES() {
      const t = dates()
      return [
        { date: t.confirmed, kind: '정산', text: '원화 확정·정산 완료(1년 유지 시작)', amount: 38000000, status: '완료' },
        { date: t.filled, kind: '매도', text: '해외주식 5종목 체결', amount: 38000000, status: '완료' },
        { date: t.deposit, kind: '입고', text: '해외주식 9종목', amount: null, status: '입고 완료' },
        { date: t.opened, kind: '개설', text: 'Returns RIA 계좌', amount: null, status: '완료' }
      ]
    },
    // 알림(최신이 위)
    get NOTIFS() {
      const t = dates()
      return [
        { date: t.confirmed, text: F.kday(t.filled) + ' 매도 대금 정산이 완료됐어요 · 원화 확정 ' + F.won(38000000) + '원', short: F.kday(t.filled) + ' 매도 대금 정산 완료' },
        { date: t.assessed, text: '투자성향 진단이 완료됐어요 · ' + D.PROFILES[D.CUSTOMER.profile].label, short: '투자성향 진단 완료 · ' + D.PROFILES[D.CUSTOMER.profile].label },
        { date: t.opened, text: '계좌 개설이 완료됐어요', short: '계좌 개설 완료' }
      ]
    },
    // 국내 매수 내역(원가) — 원화 확정 다음 영업일부터 전 영업일 사이
    get DOMESTIC_BUYS() {
      const t = dates()
      return t.buys.map((d, i) => ({ date: d, kind: '매수', text: BUY_TXT[i], amount: BUY_AMT[i], status: '체결 완료' }))
    },
    // 국내 매매 내역(최신이 위): 체결 18건 + 거부 1건. amount = 수량 × 체결가 + 수수료
    get DOMESTIC_TRADES() {
      const t = dates(), out: DomesticTrade[] = []
      const pn: Record<string, string> = { 'semi-chain': '반도체 밸류체인', 'steady-div': '꾸준한 배당', 'auto-parts': '자동차·부품' }
      ;[5, 4, 3, 2, 1, 0].forEach((g) => {
        if (g === DOM_REJECT[0]) out.push({ date: t.buys[g], code: DOM_REJECT[1], side: 'buy', qty: 0, px: 0, fee: 0, amount: 0, pkg: '', ok: false, why: DOM_REJECT[2] })
        DOM_BUYS.filter((b) => b[0] === g).forEach(([, code, qty, px, pkg]) => {
          const a = buyAmt(qty, px)
          out.push({ date: t.buys[g], code, side: 'buy', qty, px, fee: a - qty * px, amount: a, pkg: pkg ? pn[pkg] : '', ok: true, why: '' })
        })
      })
      return out
    },
    // 국내 보유 전체(패키지 + 패키지 밖) — 잔고 표·도넛·평가금액이 모두 이 값에서 계산
    get KR_HOLDINGS() { return HOLD.map((h) => ({ ...h })) },
    get EVAL() { return HOLD.reduce((s, h) => s + h.qty * D.PX[h.code][0], 0) },
    // 자금 흐름(내 계좌): 예수금 = 원화 확정 누적 − 국내 매수 누적
    get FLOW() {
      const t = dates(), buys = D.DOMESTIC_BUYS, months: Record<string, FlowMonth> = {}
      const add = (d: string, k: 'inflow' | 'buy', v: number) => {
        const m = d.slice(0, 7)
        months[m] = months[m] || { month: m, inflow: 0, buy: 0 }
        months[m][k] += v
      }
      add(t.confirmed, 'inflow', 38000000)
      buys.forEach((b) => add(b.date, 'buy', b.amount as number))
      const ev = D.EVAL
      return { inflow: 38000000, buyCost: BUY_TOTAL, sold: 0, withdrawn: 0, cash: 38000000 - BUY_TOTAL, evalAmt: ev, pnl: ev - BUY_TOTAL, monthly: Object.values(months).sort((x, y) => x.month < y.month ? -1 : 1) }
    },
    WATCH: ['000660', '005380', '900020'], // 관심 종목. 최근 본 종목은 localStorage 기준
    COMMUNITY: { nickname: '리아', profilePublic: false },
    get CUSTOMER() {
      const pf = state.profile
      return { name: '김리아', profile: (pf && ALLOWED_GRADE[pf] ? pf : 'private') as ProfileKey | 'private', score: 36, domesticAssets: D.ASSETS.domestic, birth: '1994.**.**', phone: '010-****-5678', email: 'ri***@returns.co.kr' }
    },
    get ASSESSMENT() {
      const t = dates()
      return { date: t.assessed, validUntil: t.assessValid, score: 36, profile: F.profileOf(36), validMonths: 24 }
    },
    // 계좌 상태: 서버 프로필 값(opened / none / reviewing / rejected)
    get ACCOUNT_STATE() { return state.account },
    get ACCOUNT_STATES() { return { opened: { label: '정상' }, none: { label: '계좌 없음' }, reviewing: { label: '심사 중', appliedAt: dates().reviewApplied }, rejected: { label: '반려', reason: '다른 증권사 RIA 한도 합계가 5,000만 원을 넘어요' } } },
    get ACCOUNT() {
      const t = dates()
      return { name: 'Returns RIA', no: '123-45-****89', opened: t.opened, status: (D.ACCOUNT_STATES[state.account] || { label: '정상' }).label, state: state.account, sellLimit: 50000000, limitScope: '전 증권사 합산', otherBrokerSold: 0 }
    },
    LINKED: { name: 'Returns 일반계좌', no: '456-78-****10', note: '입고·인출은 이 계좌로만' },
    get ASSETS() {
      const cash = 38000000 - BUY_TOTAL, ev = D.EVAL, pkg = HOLD.filter((h) => h.pkg).reduce((s, h) => s + h.qty * D.PX[h.code][0], 0), fh = 18000000
      return { cash, domesticInvest: ev, pkgInvest: pkg, otherInvest: ev - pkg, domestic: cash + ev, foreignHeld: fh, total: cash + ev + fh }
    },
    get SOLD() {
      const t = dates()
      return { amount: 38000000, filled: t.filled, confirmed: t.confirmed, settled: t.settled, gain: 14000000, bandRate: F.band(t.filled).rate }
    },
    get WITHDRAW() {
      const t = dates()
      return { paidIn: 38000000, paidDate: t.confirmed, availableDate: t.withdrawAvail }
    },
    // 패키지별 보유 종목 — { code, name, qty(보유 주 수), avg(평균 매입가), target(목표 비중 %) } / 현재가는 PX
    // 국내 매매 18건(DOM_BUYS)에서 계산. 한 종목은 한 패키지에만. 패키지 밖 보유: 현대차 5·셀트리온 5 (= ASSETS.otherInvest)
    get PKG_HOLDINGS() {
      const o = {} as Record<PackageId, PackageHolding[]>
      const ids: PackageId[] = ['semi-chain', 'steady-div', 'auto-parts']
      ids.forEach((id) => { o[id] = HOLD.filter((h) => h.pkg === id).map((h) => ({ code: h.code, name: h.name, qty: h.qty, avg: h.avg, cost: h.cost, target: PKG_TARGET[h.code] })) })
      return o
    },
    get F() { return F },
    get META() { return META }
}

export const RETURNS_DATA = D
