import { F } from '../../lib/calc'
import type { OrderFees } from '../../api/stockPackage'
import { splitPercent } from './investChartLogic'
import type { PkgView } from './investPkgLogic'

// ───── 주문 창(매수·매도) 예상 금액 계산 ─────
// 예상 값일 뿐이고 체결가·수수료·세금은 체결할 때 서버가 같은 규칙으로 다시 계산한다.
// 현재가는 서버가 내려준 값(보유 API)이고, 요율은 서버의 tax_rule 값(order-fees)이다

export type TradeSide = 'buy' | 'sell'
export type QtyMode = 'qty' | 'amt'

export interface TradeState {
  code: string
  side: TradeSide
  qtyMode: QtyMode
  input: string // 숫자만(최대 11자리)
}

export const openTradeState = (code: string, side: TradeSide): TradeState => ({ code, side, qtyMode: 'qty', input: '' })

// 입력 글자에서 숫자만, 최대 11자리
export const cleanInput = (v: string): string => v.replace(/\D/g, '').slice(0, 11)

const pInt = (v: string): number => parseInt(v.replace(/\D/g, ''), 10) || 0

// 요율(%)을 금액에 곱해 원 미만을 버린다. 요율은 소수 넷째 자리까지라 정수로 바꿔 계산해 부동소수점 오차를 피한다
export const rateOf = (amount: number, ratePercent: number): number => Math.floor((amount * Math.round(ratePercent * 10000)) / 1000000)

// 요율 글자: 0.004 → '0.004%'
export const ratePct = (ratePercent: number): string => String(Number(ratePercent.toFixed(4))) + '%'

export interface TradeCalc {
  price: number
  chg: number
  buy: boolean
  sellable: number
  maxBuy: number
  qty: number
  amount: number
  fee: number
  tax: number
  total: number
  err: string
  ok: boolean
  weightBefore: number
  weightAfter: number
  target: number
  cashAfter: number
  typed: number // 입력한 숫자(천 단위 표시용)
}

// 살 수 있는 최대 주 수: 체결금액 + 수수료가 주문 가능 금액 안인 가장 큰 수
function maxBuyOf(cash: number, price: number, fees: OrderFees): number {
  if (!price || cash <= 0) return 0
  let q = Math.floor(cash / price)
  while (q > 0 && q * price + rateOf(q * price, fees.commissionRatePercent) > cash) q--
  return q
}

export function tradeCalc(t: TradeState, pkg: PkgView, cash: number, fees: OrderFees): TradeCalc {
  const buy = t.side === 'buy'
  const items = pkg.items
  const idx = items.findIndex((i) => i.code === t.code)
  const it = idx >= 0 ? items[idx] : null
  const price = it?.price ?? 0
  const chg = it?.chg ?? 0
  const sellable = it?.qty ?? 0
  const n0 = pInt(t.input)
  const qty = t.qtyMode === 'qty' ? n0 : price ? Math.floor(n0 / price) : 0
  const amount = qty * price
  const fee = rateOf(amount, fees.commissionRatePercent)
  const tax = !buy && it?.taxable ? rateOf(amount, fees.securitiesTaxRatePercent) : 0
  const total = buy ? amount + fee : amount - fee - tax
  const maxBuy = maxBuyOf(cash, price, fees)
  const noPrice = !price && qty > 0 ? '현재가를 받지 못해 지금은 주문할 수 없어요' : ''
  const err =
    noPrice ||
    (!qty ? '' : buy ? (amount + fee > cash ? '주문 가능 금액을 넘었어요 · 최대 ' + maxBuy + '주까지 살 수 있어요' : '') : qty > sellable ? '매도 가능 수량을 넘었어요 · 최대 ' + sellable + '주까지 팔 수 있어요' : '')
  // 주문 후 이 종목 비중
  const dv = qty * price * (buy ? 1 : -1)
  const after = items.map((i) => (i.code === t.code ? Math.max(0, i.val + dv) : i.val))
  const wA = splitPercent(after)
  const wB = splitPercent(items.map((i) => i.val))
  return {
    price,
    chg,
    buy,
    sellable,
    maxBuy,
    qty,
    amount,
    fee,
    tax,
    total,
    err,
    ok: qty > 0 && !err && price > 0,
    weightBefore: idx >= 0 ? wB[idx] : 0,
    weightAfter: idx >= 0 ? wA[idx] || 0 : 0,
    target: it?.target ?? 0,
    cashAfter: buy ? cash - total : cash + total,
    typed: n0
  }
}

// 빠른 선택(10% · 25% · 50% · 최대)이 채우는 입력값
export const QUICK: [number, string][] = [
  [10, '10%'],
  [25, '25%'],
  [50, '50%'],
  [100, '최대']
]

export function quickInput(t: TradeState, c: TradeCalc, percent: number): string {
  const base = c.buy ? c.maxBuy : c.sellable
  const q = Math.floor((base * percent) / 100)
  return t.qtyMode === 'qty' ? String(q) : String(q * c.price)
}

// ───── 패키지 한 번에 사기 ─────

export interface BulkRow {
  code: string
  name: string
  pid: number
  target: number
  qty: number // 살 주 수(목표 비중대로 계산, 1주 미만은 0)
  amount: number
  priced: boolean
}

export interface BulkCalc {
  amt: number
  rows: BulkRow[]
  sum: number
  fee: number
  total: number
  left: number // 남는 금액
  err: string
  ok: boolean
  count: number // 주문 건수(살 주 수가 1 이상인 종목)
}

// 살 금액 × 목표 비중 ÷ 현재가를 내림해 종목별 주 수를 정한다
export function bulkCalc(pkg: PkgView, input: string, cash: number, fees: OrderFees): BulkCalc {
  const amt = pInt(input)
  const rows = pkg.items
    .filter((it) => it.target > 0)
    .map((it): BulkRow => {
      const price = it.price ?? 0
      const qty = price ? Math.floor((amt * it.target) / 100 / price) : 0
      return { code: it.code, name: it.name, pid: it.pid, target: it.target, qty, amount: qty * price, priced: price > 0 }
    })
  const sum = rows.reduce((a, r) => a + r.amount, 0)
  const fee = rows.reduce((a, r) => a + rateOf(r.amount, fees.commissionRatePercent), 0)
  const total = sum + fee
  const unpriced = rows.filter((r) => !r.priced)
  const err = unpriced.length ? '현재가를 받지 못한 종목이 있어요(' + unpriced.map((r) => r.name).join(', ') + ')' : total > cash ? '주문 가능 금액(₩' + F.won(cash) + ')을 넘었어요' : ''
  return { amt, rows, sum, fee, total, left: Math.max(0, amt - sum), err, ok: total > 0 && !err, count: rows.filter((r) => r.qty > 0).length }
}

// "주문 가능 전부": 수수료까지 합쳐 주문 가능 금액을 넘지 않는 가장 큰 살 금액(종목별 절사 때문에 실제 합계는 더 작을 수 있다)
export const bulkAll = (cash: number, fees: OrderFees): string => String(Math.max(0, Math.floor(cash / (1 + fees.commissionRatePercent / 100))))
