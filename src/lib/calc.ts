import { ALLOWED_GRADE, BUY_POS, C, ETF, FIXED, GRADE_NAMES, META, OFF, PROFILE_SCORE, RETURNS_DATA as D } from '../data/returns'
import type { BizDates, DeductionBand, ProfileKey, StockMeta } from '../data/returns'
import { getBusinessToday } from './clock'

// 세액·날짜 계산 — 원본 returns-data.js의 날짜 헬퍼 + F를 옮긴 것.
// "오늘"은 F.today() → getBusinessToday() 한 곳. new Date()/Date.now()로 오늘을 만들지 않는다.

// ===== 날짜 계산(UTC 문자열 'YYYY-MM-DD') =====
const p2 = (n: number): string => String(n).padStart(2, '0')
const ms = (d: string): number => {
  const [y, m, dd] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, dd)
}
const iso = (t: number): string => {
  const x = new Date(t)
  return x.getUTCFullYear() + '-' + p2(x.getUTCMonth() + 1) + '-' + p2(x.getUTCDate())
}
export const addDays = (d: string, n: number): string => iso(ms(d) + n * 864e5)
export const isBiz = (d: string): boolean => {
  const w = new Date(ms(d)).getUTCDay()
  return w !== 0 && w !== 6
}
// 영업일 더하기·빼기 — 목업은 주말만 건너뜀(공휴일 달력은 실제 앱에서 반영)
export const bizAdd = (d: string, n: number): string => {
  let x = d, k = Math.abs(n)
  const st = n < 0 ? -1 : 1
  while (k > 0) {
    x = addDays(x, st)
    if (isBiz(x)) k--
  }
  return x
}
export const addMonths = (d: string, n: number): string => {
  const [y, m, dd] = d.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + n, 1))
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  return t.getUTCFullYear() + '-' + p2(t.getUTCMonth() + 1) + '-' + p2(Math.min(dd, last))
}
export const addYears = (d: string, n: number): string => addMonths(d, n * 12)
const capEnd = (d: string): string => d > FIXED.JOIN_END ? FIXED.JOIN_END : d // 가입 마감 뒤에는 업무일을 12-31로 보고 계산

// 기준 영업일: 토·일이면 직전 금요일
export const bizDay = (d: string): string => {
  while (!isBiz(d)) d = addDays(d, -1)
  return d
}
// 데이터 기준일: 기준 영업일(12-31 넘으면 12-31). 계산한 개설일이 출시일보다 앞서면 출시일 다음 영업일로 당김
export const anchor = (): string => {
  let a = bizDay(F.today())
  const first = bizAdd(FIXED.LAUNCH, 1)
  if (bizAdd(a, -OFF.opened) < first) a = bizAdd(first, OFF.opened)
  return a
}
export const dates = (): BizDates => {
  const a = anchor(), filled = bizAdd(a, -OFF.filled), confirmed = bizAdd(filled, 2), assessed = bizAdd(a, -OFF.assessed)
  const start = bizAdd(confirmed, 1), end = bizAdd(a, -1)
  let n = 1, x = start
  while (x < end) {
    x = bizAdd(x, 1)
    n++
  }
  return {
    anchor: a, opened: bizAdd(a, -OFF.opened), assessed, assessValid: addDays(addMonths(assessed, 24), -1),
    deposit: bizAdd(a, -OFF.deposit), filled, confirmed, settled: confirmed, withdrawAvail: addYears(confirmed, 1),
    buys: BUY_POS.map((f) => bizAdd(start, Math.round(f * (n - 1)))),
    reviewApplied: bizAdd(bizAdd(a, -OFF.opened), -1),
    newEtfSince: bizAdd(a, -12), // 신규2차전지 ETF 설정일(11.02)
    benefitCancel: bizAdd(a, 10) // 혜택 취소 시연(12.02 조기인출)
  }
}

export interface TaxResult {
  gain: number
  ded: number
  general: number
  ria: number
  cut: number
}

export interface PlanOptions {
  biz?: string
  exclude?: string[]
  asc?: boolean
  cap?: number
}

export interface PlanRow {
  t: string
  name: string
  qty: number
  amount: number
  rate: number
  partial: boolean
}

export interface PlanResult {
  rows: PlanRow[]
  total: number
  gain: number
  ded: number
  save: number
}

export const F = {
  // ===== 업무일 =====
  today: (): string => capEnd(getBusinessToday()),
  // 기준 영업일(토·일 → 직전 금요일). 상단 '업무일'은 F.today() 그대로
  biz: (): string => bizDay(F.today()),
  bizDay,
  anchor, bizAdd, addDays, addMonths, isBiz,
  prevBiz: (d?: string): string => bizAdd(d || F.biz(), -1),
  days: (a: string, b: string): number => Math.round((ms(b) - ms(a)) / 864e5),
  addYears,
  // 기준 문구: "MM.DD 기준 · (전 영업일) MM.DD까지 반영"
  asOf: (d?: string): string => {
    d = d || F.biz()
    return F.short(d) + ' 기준 · ' + F.short(bizAdd(d, -1)) + '까지 반영'
  },
  ago: (k: number): string => bizAdd(anchor(), -k), // 기준일로부터 k영업일 전
  band: (d: string): DeductionBand => {
    const m = Number(d.split('-')[1])
    return C.DEDUCTION_BANDS.find((b) => m >= b.from && m <= b.to)! // 1~12월 전 구간이 정의돼 있음
  },
  bandEnd: (d: string): string => {
    const b = F.band(d), y = +d.slice(0, 4), last = new Date(Date.UTC(y, b.to, 0)).getUTCDate()
    return y + '-' + String(b.to).padStart(2, '0') + '-' + String(last).padStart(2, '0')
  },
  won: (n: number): string => Math.round(n).toLocaleString('ko-KR'),
  man: (n: number): string => Math.round(n / 1e4).toLocaleString('ko-KR') + '만',
  dot: (d: string): string => d.replace(/-/g, '.'),
  short: (d: string): string => d.slice(5).replace('-', '.'),
  kday: (d: string): string => {
    const [, m, dd] = d.split('-').map(Number)
    return m + '월 ' + dd + '일'
  },
  pct: (n: number): string => (n >= 0 ? '+' : '') + n.toFixed(2) + '%',
  upc: (n: number): string => n > 0 ? '#F04452' : n < 0 ? '#3182F6' : '#6B7280',
  // 남은 매도 한도 — 진행 중 매도 예시가 켜지면 AAPL 5주(150만 원) 차감
  remaining: (): number => C.SELL_LIMIT - C.SOLD.amount - D.ACCOUNT.otherBrokerSold,
  holdDays: (d?: string): number => Math.max(0, F.days(D.SOLD.confirmed, d || F.today())),
  // 인출: 지금 인출 가능 = 국내 운용 자산 − 납입 누적(수익 초과분)
  withdrawableNow: (): number => Math.max(0, D.ASSETS.domestic - D.WITHDRAW.paidIn),
  withdrawDday: (biz?: string): number => F.days(biz || F.today(), D.WITHDRAW.availableDate),
  // ===== 성향·위험등급 =====
  profileOf: (score: number): ProfileKey => {
    const b = PROFILE_SCORE.bands.find(([min]) => score > min)
    return b ? b[1] : PROFILE_SCORE.floor
  },
  // 위험등급은 계산하지 않고 데이터(META/ETF)의 값을 그대로 돌려준다
  meta: (code: string): StockMeta => META[code] || ETF[code] || { grade: null, gradeBasis: '', riaOk: false, riaWhy: '국내 상장 종목이 아니에요' },
  gradeName: (g: number): string => GRADE_NAMES[g] || '',
  allowedLabel: (profile: string): string => {
    const a = ALLOWED_GRADE[profile] || ALLOWED_GRADE.stable
    return a.min === a.max ? a.min + '등급' : a.min + '~' + a.max + '등급'
  },
  // 적합 여부: 등급 숫자가 성향 허용 최소값 이상이면 적합
  suitable: (grade: number | null, profile: string): boolean => grade != null && grade >= (ALLOWED_GRADE[profile] || ALLOWED_GRADE.stable).min,
  // 패키지 위험등급 = 구성 종목 중 가장 위험한(숫자가 가장 작은) 등급. items: [{ code }] 또는 [{ c }] 또는 코드 배열
  pkgGrade: (items?: (string | { code?: string; c?: string })[]): number | null => {
    const g = (items || []).map((it) => F.meta(typeof it === 'string' ? it : (it.code || it.c || '')).grade).filter((x): x is number => x != null)
    return g.length ? Math.min(...g) : null
  },
  // ===== 세액 =====
  // 공제액 = 양도차익 × 공제율(매도 체결일 구간) × 조정비율 / 일반 = max(0, 차익 − 250만) × 22% / RIA = max(0, 차익 − 250만 − 공제액) × 22% / 감면 = 일반 − RIA
  tax: (planGain?: number, biz?: string, adj?: number): TaxResult => {
    const pg = planGain || 0, ad = adj == null ? 1 : adj, bz = biz || F.today()
    const g = C.SOLD.gain + pg
    const ded = Math.round(C.SOLD.gain * F.band(C.SOLD.filled).rate * ad) + Math.round(pg * F.band(bz).rate * ad)
    const general = Math.round(Math.max(0, g - C.BASIC_DEDUCTION) * C.TAX_RATE)
    const ria = Math.round(Math.max(0, g - C.BASIC_DEDUCTION - ded) * C.TAX_RATE)
    return { gain: g, ded, general, ria, cut: general - ria }
  },
  // 남은 한도까지 차익률 높은 순으로 매도하는 안(기본: TSLA 10 + AAPL 20 + NVDA 3 / 진행 중 매도 예시: TSLA 10 + AAPL 15 + NVDA 3)
  plan: (o?: PlanOptions): PlanResult => {
    const opt = o || {}, biz = opt.biz || F.today(), rate = F.band(biz).rate
    const hs = C.HOLDINGS.filter((h) => !(opt.exclude || []).includes(h.t)).slice().sort((a, b) => opt.asc ? a.rate - b.rate : b.rate - a.rate)
    let left = Math.min(opt.cap || Infinity, F.remaining())
    const rows: PlanRow[] = []
    hs.forEach((h) => {
      const q = Math.min(h.qty, Math.floor(left / h.price))
      if (q > 0) {
        rows.push({ t: h.t, name: h.name, qty: q, amount: q * h.price, rate: h.rate, partial: q < h.qty })
        left -= q * h.price
      }
    })
    const total = rows.reduce((s, r) => s + r.amount, 0), gain = rows.reduce((s, r) => s + Math.round(r.amount * r.rate), 0)
    return { rows, total, gain, ded: Math.round(gain * rate), save: F.tax(gain, biz).cut - F.tax(0, biz).cut }
  }
}
