import { F } from '../../lib/calc'
import type { Tone } from './accountData'
import type { InboundHistoryItem } from '../../api/inbound'
import type { WithdrawalHistoryItem } from '../../api/withdrawal'
import type { WithdrawalAvailability } from '../../api/withdrawalAvailability'
import type { DomesticTradeItem, SellOrderItem, SettlementItem } from '../../api/accountHistory'

// 거래·신청 내역 박스의 탭(원본 TABS 순서·이름)
export const HIST_TABS = [
  { key: 'deposits', label: '입고' },
  { key: 'sells', label: '매도' },
  { key: 'settle', label: '정산 상태' },
  { key: 'domestic', label: '국내 매매' },
  { key: 'withdraw', label: '인출' }
]
export type HistTab = 'deposits' | 'sells' | 'settle' | 'domestic' | 'withdraw'
export const isHistTab = (k: string): k is HistTab => HIST_TABS.some((t) => t.key === k)

// 더보기 전에 보이는 줄 수(원본: 입고·매도 5줄, 국내 매매 6줄)
export const SHOW_INS = 5
export const SHOW_SELLS = 5
export const SHOW_DOM = 6

// StockLabel에 있는 해외 종목은 StockLabel로, 없는 종목은 색 원 + 티커 + 이름으로 표시
const LABELED = ['TSLA', 'AAPL', 'NVDA', 'MSFT']

export interface StockCell {
  t: string
  name: string
  color: string
  ini: string
  labeled: boolean
}

// 서버 종목(티커·이름) → 종목 칸. StockLabel에 없는 종목은 색 원 + 티커 + 이름
const serverStock = (t: string, name: string): StockCell => ({ t, name, color: 'var(--color-muted)', ini: t[0], labeled: LABELED.includes(t) })

// 입고 내역 ---------------------------------------------------------------
export type DepTone = 'part' | 'ok'

export interface DepRowView extends StockCell {
  id: number
  date: string
  req: number
  got: number
  status: string
  tone: DepTone
  ret: string // 반환 수량(신청 − 입고)
  retOn: boolean
}

// 서버 입고 이력 한 줄 → 화면 줄. 신청은 즉시 처리돼 심사 중·반려 줄은 없다
export function depositRows(items: InboundHistoryItem[]): DepRowView[] {
  return items.map((x) => {
    const ret = x.requestedQty - x.approvedQty
    return {
      id: x.inboundId,
      ...serverStock(x.ticker, x.name),
      date: F.short(x.processedAt.slice(0, 10)),
      req: x.requestedQty,
      got: x.approvedQty,
      status: ret > 0 ? '일부 반환' : '입고 완료',
      tone: ret > 0 ? 'part' : 'ok',
      ret: ret > 0 ? ret + '주' : '-',
      retOn: ret > 0
    }
  })
}

// 매도 내역 ---------------------------------------------------------------
export interface SellRowView extends StockCell {
  date: string
  qty: number
  amt: string
  status: string
  tone: 'done' | 'rej'
}

// items: 서버 매도 내역(체결·거부)
export function sellRows(items: SellOrderItem[]): { rows: SellRowView[]; sum: string } {
  const done = items.map((o): SellRowView => {
    const ok = o.status === 'EXECUTED'
    return { ...serverStock(o.ticker, o.name), date: F.short(o.processedAt.slice(0, 10)), qty: o.sellQty, amt: F.won(o.orderAmount), status: ok ? '체결' : '거부', tone: ok ? 'done' : 'rej' }
  })
  const sum = items.filter((o) => o.status === 'EXECUTED').reduce((a, o) => a + o.orderAmount, 0)
  return { rows: done, sum: F.won(sum) }
}

// 정산 상태 ---------------------------------------------------------------
export interface SettleStepView {
  label: string
  date: string
  note: string
  hasNote: boolean
  reached: boolean // 이 단계까지 진행됨(점·글자 진하게)
  current: boolean // 지금 단계(글자 굵게)
  line: boolean // 다음 단계로 이어지는 선
  lineOn: boolean
}

export interface SettleRowView {
  title: string
  sub: string
  amt: string
  steps: SettleStepView[]
}

const SETTLE_STEPS = ['주문', '체결', '원화 확정']

const step = (dates: string[], cur: number): SettleStepView[] =>
  SETTLE_STEPS.map((label, i) => ({
    label,
    date: dates[i] || '',
    // 원화 확정 단계에 닿았을 때만(가정산은 아직 아님)
    note: i === SETTLE_STEPS.length - 1 && cur === i ? '정산 완료 · 1년 유지 시작' : '',
    hasNote: i === SETTLE_STEPS.length - 1 && cur === i,
    reached: i <= cur,
    current: i === cur,
    line: i < SETTLE_STEPS.length - 1,
    lineOn: i < cur
  }))

// 마지막 단계 날짜에 '확정' / '예상'을 붙이고, 확정 전이면 금액 앞에 '예상'
const fin = (r: SettleRowView, conf: boolean): SettleRowView => {
  const st = r.steps.slice()
  const k = st.length - 1
  const d = st[k].date
  st[k] = { ...st[k], date: d ? (conf ? d + ' 확정' : '예상 ' + d) : '' }
  return { ...r, steps: st, amt: conf ? r.amt : '예상 ' + r.amt }
}

// items: 서버 정산 내역(같은 orderId로 매도 내역과 이어짐)
export function settleRows(items: SettlementItem[]): SettleRowView[] {
  return items.map((x) => {
    const conf = x.settlementStatus === 'FINALIZED'
    const sold = F.short(x.provisionalAt.slice(0, 10))
    const finalDay = F.short(x.finalAt.slice(0, 10))
    return fin(
      {
        title: sold + ' ' + x.name + ' ' + x.sellQty + '주 매도',
        sub: conf ? '정산 완료 · 원화 확정 ' + F.dot(x.finalAt.slice(0, 10)) : '체결 · 원화 확정 예정 (' + finalDay + ')',
        amt: '₩' + F.won(conf ? (x.finalAmount ?? x.provisionalAmount) : x.provisionalAmount),
        steps: step([sold, sold, finalDay], conf ? 2 : 1)
      },
      conf
    )
  })
}

// 국내 매매 ---------------------------------------------------------------
export interface DomRowView {
  date: string
  code: string
  name: string
  side: string
  sideTone: Tone
  qty: string
  px: string
  amt: string
}

export function domesticRows(items: DomesticTradeItem[]): { rows: DomRowView[]; sum: { buy: string; sell: string } } {
  const rows = items.map((r): DomRowView => {
    const buy = r.tradeType === 'BUY'
    return { date: F.short(r.executedAt.slice(0, 10)), code: r.stockCode, name: r.name ?? r.stockCode, side: buy ? '매수' : '매도', sideTone: buy ? 'up' : 'down', qty: r.qty + '주', px: F.won(r.price), amt: F.won(r.amount) }
  })
  const total = (type: string) => F.won(items.filter((r) => r.tradeType === type).reduce((a, r) => a + r.amount, 0))
  return { rows, sum: { buy: total('BUY'), sell: total('SELL') } }
}

// 인출 ----------------------------------------------------------------------
const WITHDRAW_STATUS: Record<WithdrawalHistoryItem['status'], string> = { REQUESTED: '심사 중', COMPLETED: '인출 완료', CANCELLED: '취소', FAILED: '실패' }

export function withdrawRequests(items: WithdrawalHistoryItem[]) {
  return items.map((o) => ({ id: o.withdrawalId, date: F.short(o.processedAt.slice(0, 10)), amt: '₩' + F.won(o.requestedAmount), to: o.destinationAccountNo, status: WITHDRAW_STATUS[o.status] }))
}

// 납입(매도 확정)건별 남은 원금과 인출 가능일 — 서버 인출 가능 금액(원금 유지 박스와 같은 값)
export function leftAmountRows(a: WithdrawalAvailability) {
  const biz = F.today()
  return a.leftAmounts.map((x) => ({
    paid: F.dot(x.finalAt.slice(0, 10)),
    amt: F.won(x.curAmount),
    wd: F.dot(x.maturesAt.slice(0, 10)),
    left: x.matured ? '인출 가능' : 'D-' + Math.max(0, F.days(biz, x.maturesAt.slice(0, 10)))
  }))
}

