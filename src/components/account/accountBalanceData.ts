import { F } from '../../lib/calc'
import type { Tone } from './accountData'
import type { CustomerAssetHolding } from '../../api/briefing'
import type { SellGuideProduct } from '../../api/sellGuide'

export type BalTab = 'kr' | 'fr'
export type SortKey = 'val' | 'pnl' | 'ret'
export interface KrSort {
  k: SortKey
  d: 1 | -1 // -1 내림차순(▼), 1 오름차순(▲)
}

export const DEFAULT_SORT: KrSort = { k: 'val', d: -1 }
export const RISK_TIP = '1 매우 높은 위험 ~ 6 매우 낮은 위험 · 리턴증권 자체 산정'

// 표에 보이는 위험 등급 짧은 이름(원본 그대로)
const RISK_SHORT: Record<number, string> = { 1: '매우 높음', 2: '높음', 3: '다소 높음', 4: '보통', 5: '낮음', 6: '매우 낮음' }

const tone = (n: number): Tone => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat')
const sg = (n: number): string => (n > 0 ? '+' : n < 0 ? '-' : '')

const NA = '확인 불가' // 서버에 시세가 없을 때(null은 0이 아니라 "모름")

export interface KrRow {
  code: string
  name: string
  qty: number
  sell: number
  sellLess: boolean // 매도 가능이 보유보다 적으면 강조(거래제한·정지 포함)
  avg: string
  px: string
  val: string
  v: number | null
  pnlN: number | null
  retN: number | null
  pnl: string
  ret: string
  pnlTone: Tone
  risk: string
}

export interface KrBalance {
  rows: KrRow[]
  sum: string
  tot: { val: string; pnl: string; ret: string; tone: Tone }
}

// 국내 주식 탭 — 서버 보유 종목. 시세가 없는 종목은 평가·손익·수익률이 null이라 '확인 불가'
export function krBalance(items: CustomerAssetHolding[], sort: KrSort): KrBalance {
  const all = items.map((h): KrRow => {
    const v = h.evaluationAmount
    const pnlN = h.profit
    const retN = h.profitRate
    return {
      code: h.ticker,
      name: h.name,
      qty: h.qty,
      sell: h.sellableQty,
      sellLess: h.sellableQty < h.qty,
      avg: F.won(h.avgPurchasePrice),
      px: h.currentPrice == null ? NA : F.won(h.currentPrice),
      val: v == null ? NA : F.won(v),
      v,
      pnlN,
      retN,
      pnl: pnlN == null ? NA : sg(pnlN) + F.won(Math.abs(pnlN)),
      ret: retN == null ? NA : F.pct(retN),
      pnlTone: pnlN == null ? 'flat' : tone(pnlN),
      risk: h.riskGrade == null ? '-' : h.riskGrade + ' ' + RISK_SHORT[h.riskGrade]
    }
  })
  const field = { val: 'v', pnl: 'pnlN', ret: 'retN' } as const
  // 값이 없는 종목은 정렬 방향과 상관없이 맨 아래
  const rows = all.slice().sort((x, y) => {
    const a = x[field[sort.k]]
    const b = y[field[sort.k]]
    if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1
    return (a - b) * sort.d
  })
  // 한 종목이라도 시세가 없으면 합계는 틀린 숫자가 되므로 통째로 '확인 불가'
  const complete = all.every((r) => r.v != null && r.pnlN != null)
  if (!complete) return { rows, sum: NA, tot: { val: NA, pnl: NA, ret: NA, tone: 'flat' } }
  const val = all.reduce((a, r) => a + (r.v ?? 0), 0)
  const cost = items.reduce((a, h) => a + h.purchaseAmount, 0)
  const pnl = all.reduce((a, r) => a + (r.pnlN ?? 0), 0)
  return {
    rows,
    sum: F.won(val),
    tot: { val: F.won(val), pnl: sg(pnl) + F.won(Math.abs(pnl)), ret: F.pct(cost ? (pnl / cost) * 100 : 0), tone: tone(pnl) }
  }
}

export interface FrRow {
  id: number
  t: string
  name: string
  qty: number
  px: string
  val: string
  rate: string
}

// 입고 해외주식 탭 — 서버 매도 가이드의 보유 종목(lot 합). 시세를 못 받은 종목은 현재가·평가·차익률이 '확인 불가'이고,
// 하나라도 모르면 합계도 '확인 불가'(아는 것만 더하면 작게 보인다)
export function frBalance(products: SellGuideProduct[]): { rows: FrRow[]; sum: string } {
  const rows = products.map((p): FrRow => {
    const qty = p.lots.reduce((a, l) => a + l.availableQty, 0)
    const price = p.currentPriceKrw
    return {
      id: p.foreignProductId,
      t: p.ticker,
      name: p.productName,
      qty,
      px: price == null ? NA : F.won(price),
      val: price == null ? NA : F.won(price * qty),
      rate: p.effectiveGainRate == null ? NA : F.pct(p.effectiveGainRate * 100).replace('.00', '')
    }
  })
  const priced = products.every((p) => p.currentPriceKrw != null)
  const sum = priced ? F.won(products.reduce((a, p) => a + p.lots.reduce((x, l) => x + l.availableQty, 0) * (p.currentPriceKrw ?? 0), 0)) : NA
  return { rows, sum }
}
