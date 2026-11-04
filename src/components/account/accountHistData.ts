import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import type { Tone } from './accountData'
import type { AddedIn } from './accountApplyData'
import type { AddedSell, AddedSettle } from './accountSellData'

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

// 매도 체결 5종목(체결일 = DATES.filled): [티커, 이름, 아이콘 색, 수량, 매도 금액, 양도차익] — 합계 38,000,000 / 14,000,000
// TODO: 백엔드 연결 시 SELL_ORDER·KRW_EXCHANGE에서 받아오기
const SOLD_ROWS: [t: string, name: string, color: string, qty: number, amt: number, gain: number][] = [
  ['AMZN', '아마존', 'var(--stock-amzn)', 30, 9000000, 3100000],
  ['GOOGL', '알파벳', 'var(--stock-googl)', 30, 8400000, 3000000],
  ['META', '메타', 'var(--stock-meta)', 10, 7800000, 2900000],
  ['AVGO', '브로드컴', 'var(--stock-avgo)', 24, 7200000, 2800000],
  ['NFLX', '넷플릭스', 'var(--stock-nflx)', 4, 5600000, 2200000]
]

// 입고(3-way MIN): [티커, 신청, 2025.12.23 기준 보유, 현재 보유]
// TODO: 백엔드 연결 시 INBOUND·INBOUND_MIN에서 받아오기
const DEP_ROWS: [t: string, req: number, base: number, now: number][] = [
  ['AMZN', 30, 30, 30],
  ['GOOGL', 30, 30, 30],
  ['META', 10, 10, 10],
  ['AVGO', 24, 24, 24],
  ['NFLX', 4, 4, 4],
  ['TSLA', 12, 10, 12],
  ['AAPL', 20, 20, 20],
  ['NVDA', 8, 8, 8],
  ['MSFT', 5, 5, 5]
]
// 입고 반려 예시: [티커, 신청 수량, 사유]
const DEP_REJ: [t: string, req: number, why: string] = ['MSFT', 5, '키움증권에서 출고가 확인되지 않았어요. 키움증권에서 출고 신청을 먼저 해 주세요.']

// StockLabel에 있는 해외 종목은 StockLabel로, 없는 종목은 색 원 + 티커 + 이름으로 표시
const LABELED = ['TSLA', 'AAPL', 'NVDA', 'MSFT']

export interface StockCell {
  t: string
  name: string
  color: string
  ini: string
  labeled: boolean
}

const soldInfo = () => Object.fromEntries(SOLD_ROWS.map((r) => [r[0], r]))

const stockCell = (t: string): StockCell => {
  const so = soldInfo()[t]
  const fi = RD.C.HOLDINGS.find((h) => h.t === t)
  return { t, name: so ? so[1] : fi ? fi.name : t, color: so ? so[2] : 'var(--color-muted)', ini: t[0], labeled: LABELED.includes(t) }
}

// 입고 내역 ---------------------------------------------------------------
export type DepTone = 'rej' | 'review' | 'part' | 'ok'

export interface DepRowView extends StockCell {
  date: string
  req: number
  base: number
  now: number
  rej: boolean
  rejMsg: string
  gotTxt: string
  minTxt: string
  status: string
  tone: DepTone
  ret: string
  retOn: boolean
  knownDetail: boolean
}

// added: 방금 접수한 입고 신청(심사 중) — 가장 위에 보임
export function depositRows(added: AddedIn[] = []): DepRowView[] {
  const dep = RD.DATES.deposit
  const bizShort = F.short(RD.C.BUSINESS_DATE)
  const review = added.map((a) => ({ t: a.t, req: a.req, base: a.base, now: a.now, rej: false, review: false, knownDetail: false, date: bizShort }))
  const rej = {
    t: DEP_REJ[0],
    req: DEP_REJ[1],
    base: 0,
    now: 0,
    rej: true,
    review: false,
    knownDetail: true,
    date: F.short(F.bizAdd(dep, -1))
  }
  const rest = DEP_ROWS.map(([t, req, base, now]) => ({ t, req, base, now, rej: false, review: false, knownDetail: true, date: F.short(F.bizAdd(dep, -2)) }))
  return [...review, rej, ...rest].map((x): DepRowView => {
    const got = Math.min(x.req, x.base, x.now)
    const ret = x.rej ? 0 : x.req - got
    return {
      ...stockCell(x.t),
      date: x.date,
      req: x.req,
      base: x.base,
      now: x.now,
      rej: x.rej,
      rejMsg: DEP_REJ[2],
      gotTxt: x.rej || x.review ? '-' : got + '주',
      minTxt: '→ 가장 작은 수량 ' + got + '주 입고' + (x.review ? ' 예정' : ''),
      status: x.rej ? '반려' : x.review ? '심사 중' : ret ? '일부 반환' : '입고 완료',
      tone: x.rej ? 'rej' : x.review ? 'review' : ret ? 'part' : 'ok',
      ret: !x.review && ret ? ret + '주' : '-',
      retOn: !x.review && !!ret,
      knownDetail: x.knownDetail,
    }
  })
}

// 매도 내역 ---------------------------------------------------------------
export interface SellRowView extends StockCell {
  date: string
  qty: number
  amt: string
  gain: string
  review: boolean // 방금 접수한 매도 신청(심사 중) — 차익·상태가 다르게 보임
}

// added: 방금 접수한 매도 신청(심사 중) — 가장 위에 보임
export function sellRows(added: AddedSell[] = []): { rows: SellRowView[]; rate: string; sum: { amt: string; gain: string } } {
  const date = F.short(RD.SOLD.filled)
  const bizShort = F.short(RD.C.BUSINESS_DATE)
  const review = added.map((a): SellRowView => ({ t: a.t, name: a.name, color: 'var(--stock-' + a.t.toLowerCase() + ')', ini: a.t[0], labeled: false, date: bizShort, qty: a.qty, amt: F.won(a.amt), gain: '-', review: true }))
  return {
    rows: [...review, ...SOLD_ROWS.map(([t, , , qty, amt, gain]): SellRowView => ({ ...stockCell(t), date, qty, amt: F.won(amt), gain: F.won(gain), review: false }))],
    rate: Math.round(RD.SOLD.bandRate * 100) + '%',
    sum: { amt: F.won(SOLD_ROWS.reduce((a, r) => a + r[4], 0)), gain: F.won(SOLD_ROWS.reduce((a, r) => a + r[5], 0)) }
  }
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

// added: 방금 접수한 매도 신청(심사 중, 체결 전) — 가장 위에 보임
export function settleRows(added: AddedSettle[] = []): { rows: SettleRowView[]; soldConf: string; wdDate: string } {
  const D = RD
  const TD = D.TRADE_DEMO
  const step = (labels: string[], dates: string[], cur: number): SettleStepView[] =>
    labels.map((label, i) => ({
      label,
      date: dates[i] || '',
      note: i === labels.length - 1 ? TD.stepNote : '',
      hasNote: i === labels.length - 1,
      reached: i <= cur,
      current: i === cur,
      line: i < labels.length - 1,
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
  const bizShort = F.short(RD.C.BUSINESS_DATE)
  const rows: SettleRowView[] = added.map((a) =>
    fin({ title: bizShort + ' ' + a.title + ' 매도 신청', sub: '심사 중 · 체결 전', amt: '₩' + F.won(a.amt), steps: step(RD.TRADE_DEMO.steps, [bizShort, '', ''], 0) }, false)
  )
  if (TD.on) {
    rows.push(
      fin(
        { title: F.short(TD.date) + ' ' + TD.text + ' 매도', sub: TD.status, amt: '₩' + F.won(TD.amount), steps: step(TD.steps, [F.short(TD.date), F.short(TD.date), F.short(TD.confirmDate)], TD.cur) },
        TD.confirmDate <= F.today()
      )
    )
  }
  rows.push(
    fin(
      {
        title: F.short(D.SOLD.filled) + ' 해외주식 ' + SOLD_ROWS.length + '종목 매도',
        sub: '정산 완료 · 원화 확정 ' + F.dot(D.SOLD.confirmed),
        amt: '₩' + F.won(D.SOLD.amount),
        steps: step(TD.steps, [F.short(D.SOLD.filled), F.short(D.SOLD.filled), F.short(D.SOLD.confirmed)], 2)
      },
      true
    )
  )
  return { rows, soldConf: F.dot(D.SOLD.confirmed), wdDate: F.dot(D.WITHDRAW.availableDate) }
}

// 국내 매매 ---------------------------------------------------------------
export interface DomRowView {
  date: string
  code: string
  side: string
  sideTone: Tone
  qty: string
  px: string
  fee: string
  amt: string
  pkg: string
  inPkg: boolean
  status: string
  ok: boolean
  rejMsg: string
}

export function domesticRows(): { rows: DomRowView[]; sum: { buy: string; sell: string } } {
  const rows = RD.DOMESTIC_TRADES.map((r): DomRowView => {
    const ok = r.ok
    return {
      date: F.short(r.date),
      code: r.code,
      side: r.side === 'buy' ? '매수' : '매도',
      sideTone: r.side === 'buy' ? 'up' : 'down',
      qty: ok ? r.qty + '주' : '-',
      px: ok ? F.won(r.px) : '-',
      fee: ok ? F.won(r.fee) : '-',
      amt: ok ? F.won(r.amount) : '-',
      pkg: r.pkg || (ok ? '패키지 밖' : '-'),
      inPkg: !!r.pkg,
      status: ok ? '체결 완료' : '거부',
      ok,
      rejMsg: r.why || ''
    }
  })
  return { rows, sum: { buy: F.won(RD.FLOW.buyCost), sell: F.won(RD.FLOW.sold) } }
}

// 인출 ----------------------------------------------------------------------
// added: 방금 접수한 인출 신청(심사 중) — 가장 위에 보임
export function withdrawRequests(added: { amt: number }[]) {
  const to = RD.LINKED.name + ' ' + RD.LINKED.no
  const date = F.short(RD.C.BUSINESS_DATE)
  return added.map((o) => ({ date, amt: '₩' + F.won(o.amt), to, status: '심사 중' }))
}

export function withdrawValues() {
  const biz = RD.C.BUSINESS_DATE
  return {
    wdDate: F.dot(RD.WITHDRAW.availableDate),
    wdD: F.withdrawDday(biz),
    paidDate: F.dot(RD.WITHDRAW.paidDate),
    paidAmt: F.won(RD.WITHDRAW.paidIn),
    wdNow: F.won(F.withdrawableNow())
  }
}

export const DEPOSIT_BASE_DOT = () => F.dot(RD.FIXED.DEPOSIT_BASE)
