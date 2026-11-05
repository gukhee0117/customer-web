import { F } from '../../lib/calc'
import type { SellGuide, SellGuideProduct } from '../../api/sellGuide'

// 매도 신청 창의 문구와 숫자 — 보유 종목·추천 안은 서버 매도 가이드(sell-guide)

export const SELL_STEPS = ['매도 선택', '확인', '완료']

const NA = '확인 불가' // 시세·환율을 못 받으면 서버가 null을 준다(0이 아니라 "모름")

const manW = (n: number): string => (n >= 1e4 ? F.man(n) + ' 원' : F.won(n) + '원')

// ---- 왼쪽: 보유 해외주식 표 ----
export interface SellRowView {
  id: number // foreignProductId
  t: string
  name: string
  qty: number // 보유(lot 합)
  q: number // 매도 수량
  amtN: number | null // 시세가 없으면 null
  amt: string
  rate: string
  gain: number | null
  on: boolean
}

const holdingQty = (p: SellGuideProduct): number => p.lots.reduce((a, l) => a + l.availableQty, 0)

// sellQ: foreignProductId → 매도 수량. 서버가 준 순서(추천 먼저, 차익률 높은 순) 그대로
export function sellRowsView(products: SellGuideProduct[], sellQ: Record<number, number>): SellRowView[] {
  return products.map((p) => {
    const qty = holdingQty(p)
    const q = Math.min(qty, Math.max(0, sellQ[p.foreignProductId] || 0))
    const amtN = p.currentPriceKrw == null ? null : q * p.currentPriceKrw
    const rate = p.effectiveGainRate
    return {
      id: p.foreignProductId,
      t: p.ticker,
      name: p.productName,
      qty,
      q,
      amtN,
      amt: amtN == null ? NA : F.won(amtN),
      rate: rate == null ? NA : Math.round(rate * 100) + '%',
      gain: amtN == null || rate == null ? null : Math.round(amtN * rate),
      on: q > 0
    }
  })
}

export const clampQty = (v: number, max: number): number => Math.max(0, Math.min(max, v))

// ---- 아래 합산 줄 ----
export interface SellSum {
  total: number
  totalTxt: string
  left: string
  gain: string
  over: boolean
  overMsg: string
  navyW: string
  redW: string
  head: string
  foreign: string
}

// limit: 서버 남은 매도 한도(원). 못 받았으면 null — 한도 안내만 비운다.
// 선택한 종목 중 시세를 모르는 것이 있으면 합계·차익은 '확인 불가'(아는 것만 더하면 작게 보인다)
export function sellSum(rows: SellRowView[], products: SellGuideProduct[], limit: number | null, periodLabel: string | null): SellSum {
  const picked = rows.filter((r) => r.on)
  const unknown = picked.some((r) => r.amtN == null)
  const total = picked.reduce((a, r) => a + (r.amtN ?? 0), 0)
  const gainUnknown = picked.some((r) => r.gain == null)
  const gain = picked.reduce((a, r) => a + (r.gain ?? 0), 0)
  const cap = limit ?? 0
  const over = limit == null || unknown ? 0 : Math.max(0, total - cap)
  const scale = Math.max(total, cap) || 1
  const priced = products.every((p) => p.currentPriceKrw != null)
  const foreign = priced ? '₩' + F.won(products.reduce((a, p) => a + holdingQty(p) * (p.currentPriceKrw ?? 0), 0)) : NA
  return {
    total,
    totalTxt: unknown ? NA : '₩' + F.won(total), // 금액이면 ₩ 포함, 모르면 '확인 불가'
    left: limit == null || unknown ? '-' : '₩' + F.won(Math.max(0, cap - total)),
    gain: gainUnknown ? NA : '₩' + F.won(gain),
    over: over > 0,
    overMsg: '한도를 ' + manW(over) + ' 넘었어요. 넘은 금액은 거부될 수 있어요',
    navyW: ((Math.min(total, cap) / scale) * 100).toFixed(2) + '%',
    redW: ((over / scale) * 100).toFixed(2) + '%',
    head: (limit == null ? '남은 한도를 확인할 수 없어요' : '남은 한도 ' + F.man(limit) + ' 원') + (periodLabel ? ' · ' + periodLabel : ''),
    foreign
  }
}

// ---- 오른쪽: 한도를 꽉 채운 안(서버 추천) ----
export interface PlanView {
  rows: { n: number; id: number; t: string; qty: number; amt: string; rate: string; partial: boolean }[]
  total: string
  ded: string
  save: string
  qtys: Record<number, number> // 이 안으로 채우기: foreignProductId → 수량
}

// 추천 종목이 없으면 rows가 비고 합계는 '-'
export function planView(guide: SellGuide): PlanView {
  const rec = guide.products.filter((p) => p.recommendedQty > 0)
  const s = guide.summary
  return {
    rows: rec.map((p, i) => ({
      n: i + 1,
      id: p.foreignProductId,
      t: p.ticker,
      qty: p.recommendedQty,
      amt: F.man(p.expectedSellAmount),
      rate: p.effectiveGainRate == null ? NA : Math.round(p.effectiveGainRate * 100) + '%',
      partial: p.recommendedQty < holdingQty(p)
    })),
    total: s ? F.man(s.totalRecommendedSellAmount) : '-',
    ded: s ? F.man(s.totalWeightedGain) : '-',
    save: s ? F.man(s.estimatedReliefEffect) : '-',
    qtys: Object.fromEntries(rec.map((p) => [p.foreignProductId, p.recommendedQty]))
  }
}

// ---- 완료 ----
export const SELL_NEXT = ['주문이 체결되면 알림으로 알려드려요', '체결 후 2영업일 뒤 원화로 확정돼요', '확정일부터 1년 동안 원금을 유지해야 혜택이 지켜져요']
export const SELL_CONFIRM_NOTE = '체결 후 2영업일 뒤 원화로 확정돼요. 확정일부터 1년 동안 원금을 유지해야 혜택이 지켜져요.'
export const SELL_FOOT_NOTE = '매도 여부와 시점은 고객님이 결정해요.'

export const moreTitle = (picked: { t: string }[]): string => picked[0].t + (picked.length > 1 ? ' 외 ' + (picked.length - 1) + '종목' : '')

// 종목별 제출 결과(한 종목이 실패해도 나머지는 계속 보낸다)
export interface SellSubmitResult {
  t: string
  qty: number
  status: 'EXECUTED' | 'REJECTED' | 'FAILED'
  amount: number | null
  message: string | null // FAILED일 때 서버 문구
}
