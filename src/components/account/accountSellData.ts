import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'

// 매도 신청 창의 문구와 숫자 — 원본 renderVals의 sRows·sum·plan·kk 계산 그대로(값은 src/data·src/lib에서)

export const SELL_STEPS = ['매도 선택', '확인', '완료']

// 절세액 예상 범위 배수 — 원본 account 화면 안의 예시 값(주가·환율 1,000번 시뮬레이션, 10번 중 8번)
// TODO: 백엔드 연결 시 시뮬레이션 결과로 교체
const RANGE_SAVE: [number, number] = [0.85, 1.14]

const rng = (v: number, r: [number, number]): string => F.man(v * r[0]) + '~' + F.man(v * r[1]) + ' 원'
// 1,234만 5천 → '1,234만 5천'
const manK = (n: number): string => {
  const m = Math.floor(n / 1e4)
  const k = Math.round((n - m * 1e4) / 1e3)
  return (m ? m.toLocaleString('ko-KR') + '만' : '') + (k ? ' ' + k + '천' : '')
}
const manW = (n: number): string => (n >= 1e4 ? F.man(n) + ' 원' : F.won(n) + '원')

// ---- 왼쪽: 보유 해외주식 표 ----
export interface SellRowView {
  t: string
  name: string
  qty: number // 보유
  q: number // 매도 수량
  amtN: number
  amt: string
  rate: string
  gain: number
  on: boolean
}

// sellQ: 종목 → 매도 수량. 차익률 높은 순
export function sellRowsView(sellQ: Record<string, number>): SellRowView[] {
  return RD.C.HOLDINGS.slice()
    .sort((x, y) => y.rate - x.rate)
    .map((h) => {
      const q = Math.min(h.qty, Math.max(0, sellQ[h.t] || 0))
      const amtN = q * h.price
      return { t: h.t, name: h.name, qty: h.qty, q, amtN, amt: F.won(amtN), rate: Math.round(h.rate * 100) + '%', gain: Math.round(amtN * h.rate), on: q > 0 }
    })
}

export const clampQty = (v: number, max: number): number => Math.max(0, Math.min(max, v))
export const holdingQty = (t: string): number => RD.C.HOLDINGS.find((h) => h.t === t)?.qty ?? 0

// ---- 아래 합산 줄 ----
export interface SellSum {
  total: number
  totalTxt: string
  left: string
  gain: string
  ded: string
  save: string
  over: boolean
  overMsg: string
  navyW: string
  redW: string
  head: string
  foreign: string
}

// limit: 서버 남은 매도 한도(원). 못 받았으면 null — 한도 안내만 비우고 합계는 그대로 계산한다
export function sellSum(rows: SellRowView[], limit: number | null): SellSum {
  const C = RD.C
  const biz = C.BUSINESS_DATE
  const cap = limit ?? 0
  const bRate = F.band(biz).rate
  const bEnd = F.bandEnd(biz)
  const tb = F.tax(0, biz)
  const total = rows.reduce((a, r) => a + r.amtN, 0)
  const gain = rows.reduce((a, r) => a + r.gain, 0)
  const over = limit == null ? 0 : Math.max(0, total - cap)
  const ded = Math.round(gain * (total ? Math.min(1, cap / total) : 0) * bRate)
  const g = C.SOLD.gain + gain
  const save =
    Math.round(Math.max(0, g - C.BASIC_DEDUCTION) * C.TAX_RATE) - Math.round(Math.max(0, g - C.BASIC_DEDUCTION - tb.ded - ded) * C.TAX_RATE) - tb.cut
  const scale = Math.max(total, cap) || 1
  return {
    total,
    totalTxt: F.won(total),
    left: limit == null ? '-' : F.won(Math.max(0, cap - total)),
    gain: F.won(gain),
    ded: F.won(ded),
    save: F.won(Math.max(0, save)),
    over: over > 0,
    overMsg: '한도를 ' + manW(over) + ' 넘었어요. 넘은 금액은 일반 해외주식처럼 과세돼요',
    navyW: ((Math.min(total, cap) / scale) * 100).toFixed(2) + '%',
    redW: ((over / scale) * 100).toFixed(2) + '%',
    head: (limit == null ? '남은 한도를 확인할 수 없어요' : '남은 한도 ' + F.man(limit) + ' 원') + ' · 지금 ' + Math.round(bRate * 100) + '% 구간 · ' + +bEnd.slice(5, 7) + '/' + +bEnd.slice(8) + ' 마감(D-' + F.days(biz, bEnd) + ')',
    foreign: F.won(RD.ASSETS.foreignHeld)
  }
}

// ---- 오른쪽: 한도를 꽉 채운 안 ----
export interface PlanView {
  rows: { n: number; t: string; qty: number; amt: string; rate: string; partial: boolean }[]
  total: string
  ded: string
  save: string
  range: string
  qtys: Record<string, number> // 이 안으로 채우기: 종목 → 수량
}

export function planView(exclude: string[] | null): PlanView {
  const biz = RD.C.BUSINESS_DATE
  const gp = exclude ? F.plan({ biz, exclude }) : F.plan({ biz })
  return {
    rows: gp.rows.map((r, i) => ({ n: i + 1, t: r.t, qty: r.qty, amt: F.man(r.amount), rate: Math.round(r.rate * 100) + '%', partial: r.partial })),
    total: F.man(gp.total),
    ded: F.man(gp.ded),
    save: exclude ? manK(gp.save) : F.man(gp.save),
    range: rng(gp.save, RANGE_SAVE),
    qtys: Object.fromEntries(RD.C.HOLDINGS.map((h) => [h.t, gp.rows.find((r) => r.t === h.t)?.qty ?? 0]))
  }
}

// ---- 끼루 조건: 종목 이름·티커 + 빼기 말만 알아들음(계산은 F.plan) ----
const KK_NAMES: Record<string, RegExp> = { TSLA: /TSLA|테슬라/i, AAPL: /AAPL|애플/i, NVDA: /NVDA|엔비디아/i, MSFT: /MSFT|마이크로소프트|마소/i }
const KK_VERB = /남기|빼|제외|말고|안 팔|팔지/

export function kkParse(q: string): string[] | null {
  const ex = Object.keys(KK_NAMES).filter((k) => KK_NAMES[k].test(q))
  return KK_VERB.test(q) && ex.length ? ex : null
}

export const KK_PLACEHOLDER = '예: NVDA는 남기고 싶어'
export const KK_FAIL = '조건을 알아듣지 못했어요. "NVDA는 남기고 싶어"처럼 남기고 싶은 종목을 말해 주세요.'

export function kkReply(ex: string[]): string {
  const p = F.plan({ biz: RD.C.BUSINESS_DATE, exclude: ex })
  const nm = ex.join('·')
  return nm + (/[LMNR]$/.test(nm) ? '을' : '를') + ' 빼고 다시 계산했어요. ' + p.rows.map((r) => r.t + ' ' + r.qty + '주').join(' + ') + '로 ' + F.man(p.total) + ' 원을 쓰면 예상 공제 약 ' + F.man(p.ded) + ' 원, 예상 절세 약 ' + manK(p.save) + ' 원이에요.'
}

// ---- 완료 ----
export const SELL_NEXT = ['주문이 체결되면 알림으로 알려드려요', '체결 후 2영업일 뒤 원화로 확정돼요', '확정일부터 1년 동안 원금을 유지해야 혜택이 지켜져요']
export const SELL_CONFIRM_NOTE = '체결 후 2영업일 뒤 원화로 확정돼요. 확정일부터 1년 동안 원금을 유지해야 혜택이 지켜져요.'
export const SELL_FOOT_NOTE = '매도 여부와 시점은 고객님이 결정해요.'

export const moreTitle = (picked: { t: string }[]): string => picked[0].t + (picked.length > 1 ? ' 외 ' + (picked.length - 1) + '종목' : '')

// ---- 접수 후 내역 새 줄 ----
export interface AddedSell {
  t: string
  name: string
  qty: number
  amt: number
}
export interface AddedSettle {
  title: string
  amt: number
}
