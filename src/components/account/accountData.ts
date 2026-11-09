import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'

// 일반계좌의 해외주식: [티커, 현재 보유, 2025.12.23 기준 보유] — 원본 account 화면 안의 예시 값
// [현행 유지] 증권사 시스템(REGISTRABLE_STOCK)을 고객 API로 여는 서버 작업이 먼저 필요해 예시 값을 쓴다
export const GEN_HOLDINGS: [ticker: string, now: number, base: number][] = [
  ['TSLA', 6, 4],
  ['AAPL', 15, 15],
  ['NVDA', 12, 10],
  ['MSFT', 3, 3]
]

export const FOOT_STATUS = '금액은 예시이며 다른 계좌의 해외주식 순매수가 없다고 가정했어요 · 투자 판단은 고객님께 있어요'
export const FOOT_FLOW = '자금 흐름은 RIA 계좌 안의 돈만 보여드려요 · 다른 계좌 거래는 포함하지 않아요'

export type PageKey = 'status' | 'flow'

export const PAGE_TABS = [
  { key: 'status', label: '계좌 현황' },
  { key: 'flow', label: '자금 흐름' }
]

export interface AccountSummary {
  bizShort: string
  total: string
  cash: string
  invest: string
  foreign: string
  pnlTxt: string
  pnlTone: Tone
  todayTxt: string
  todayTone: Tone
  todayBasis: string
  opened: string
  linked: string
}

export type Tone = 'up' | 'down' | 'flat'

const tone = (n: number): Tone => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat')
const sg = (n: number): string => (n > 0 ? '+' : n < 0 ? '-' : '')

// 계좌 요약 박스의 숫자 — 원본 renderVals의 krAll·pnl·today 계산 그대로(국내 보유 × 현재가)
export function accountSummary(): AccountSummary {
  const biz = RD.C.BUSINESS_DATE
  const A = RD.ASSETS
  const rows = RD.KR_HOLDINGS.map((h) => {
    const [px, ch] = RD.PX[h.code] || [0, 0]
    const v = px * h.qty
    return { v, cost: h.cost, pnl: v - h.cost, today: Math.round((v * ch) / (100 + ch)) }
  })
  const sum = (k: 'v' | 'cost' | 'pnl' | 'today') => rows.reduce((a, r) => a + r[k], 0)
  const krSum = sum('v')
  const krCost = sum('cost')
  const krPnl = sum('pnl')
  const krToday = sum('today')
  const tp = krSum - krToday ? (krToday / (krSum - krToday)) * 100 : 0

  return {
    bizShort: F.short(biz),
    total: F.won(A.total),
    cash: F.won(A.cash),
    invest: F.won(krSum),
    foreign: F.won(A.foreignHeld),
    pnlTxt: sg(krPnl) + '₩' + F.won(Math.abs(krPnl)) + ' (' + F.pct(krCost ? (krPnl / krCost) * 100 : 0) + ')',
    pnlTone: tone(krPnl),
    todayTxt: sg(krToday) + '₩' + F.won(Math.abs(krToday)) + ' (' + (tp >= 0 ? '+' : '') + tp.toFixed(1) + '%)',
    todayTone: tone(krToday),
    todayBasis: F.short(F.prevBiz(biz)) + ' 종가 기준',
    opened: F.dot(RD.ACCOUNT.opened),
    linked: RD.LINKED.name + ' ' + RD.LINKED.no
  }
}
