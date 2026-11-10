import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import type { FundFlowAllocation, FundFlowMonthly, FundFlowRelief, FundFlowSummary, FundFlowTransactionType, FundFlowTransactions } from '../../api/fundFlow'
import type { WithdrawScheduleState } from './useWithdrawSchedule'
import type { Tone } from './accountData'

// 자금 흐름 탭 박스들의 숫자 — 서버 값이 있으면 서버 값으로, 없으면(로그인 전·오류) 시연 데이터(src/data·src/lib)로 계산한다

const tone = (n: number): Tone => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat')

// 업종 이름을 데이터(RD.KR)에서 못 찾는 국내 패키지 종목 9개의 업종 — 원본 account 화면 안의 예시 값
// [현행 유지] 종목 마스터(DOMESTIC_PRODUCT)에 업종을 내려 주는 고객 API가 없어 예시 값을 쓴다
const EXT_SECTOR: Record<string, string> = {
  '042700': '반도체',
  '058470': '반도체',
  '240810': '반도체',
  '055550': '금융',
  '033780': '음식료',
  '017670': '통신',
  '012330': '자동차',
  '204320': '자동차',
  '018880': '자동차'
}

// 서버 값(summary·monthly·allocation·transactions)이 있으면 그 값으로, 없으면 시연 데이터로 그린다
// 서버 모드의 '국내 보유'는 평가금액이 아니라 매입금액(보유수량 × 평균 매입가) 기준
export interface FlowLive {
  summary?: FundFlowSummary | null
  monthly?: FundFlowMonthly | null
  allocation?: FundFlowAllocation | null
  transactions?: FundFlowTransactions | null
}

const sumMonths = (m: FundFlowMonthly | null | undefined, k: 'domesticSellAmount' | 'withdrawalAmount') =>
  (m?.months ?? []).reduce((acc, x) => acc + (x[k] ?? 0), 0)

// 금액이 있는데 반올림하면 0%인 조각은 '1% 미만'으로 보여준다
const pctText = (ratio: number) => (ratio > 0 && ratio < 0.005 ? '1% 미만' : Math.round(ratio * 100) + '%')

const bucketValue = (a: FundFlowAllocation, label: string) => a.buckets.find((b) => b.label === label)?.value ?? 0

// ---- 돌아온 돈 요약 ----
export interface FlowStep {
  name: string
  amt: string
  note: string
  noteTone: Tone
}

export interface SummarySeg {
  key: string
  label: string
  color: string
  amt: string
  pct: string
  grow: number // 막대 안 비중(0이면 그리지 않음)
}

export interface SummaryView {
  pct: number // 국내 주식+ETF 매입금액 ÷ (국내 주식+ETF+예수금+인출 누적)
  segs: SummarySeg[]
  investedNone: boolean
  cash: string
  basis: string
  formula: string // 헤드라인 N% 계산식
  steps: FlowStep[]
  cashFormula: string // 계좌 예수금 계산식
  cashLabel: string
}

const SEG_COLOR = {
  stock: 'var(--color-navy)',
  fund: 'var(--color-gold)',
  cash: 'var(--color-line-strong)',
  out: 'var(--color-muted)'
}

export function summaryCard(live?: FlowLive): SummaryView {
  const won = F.won
  const plain = (name: string, v: number, note: string): FlowStep => ({ name, amt: '₩' + won(v), note, noteTone: 'flat' })
  const s = live?.summary
  const al = live?.allocation
  let stock: number
  let fund: number
  let cash: number
  let out: number
  let steps: FlowStep[]
  let cashFormula: string
  let basis: string
  if (s && al) {
    const inflow = s.krwInflowAmount ?? 0
    const buy = s.domesticBuyAmount ?? 0
    const sold = sumMonths(live?.monthly, 'domesticSellAmount')
    out = sumMonths(live?.monthly, 'withdrawalAmount')
    stock = bucketValue(al, '국내 주식')
    fund = bucketValue(al, 'ETF·펀드')
    cash = s.cashBalance ?? 0
    steps = [
      plain('해외주식 매도', s.soldForeignAmount ?? 0, '누적'),
      plain('원화 확정', inflow, '확정일부터 1년 유지'),
      plain('국내 매수', buy, '누적 원가'),
      plain('국내 보유 중', al.holdingsCost ?? 0, '매입금액 기준'),
      plain('인출', out, '누적')
    ]
    // 매수 수수료는 국내 매수(원가)에 들어 있지 않아 따로 뺀다 — 국내 매도는 수수료·세금을 뺀 금액
    cashFormula = '원화 확정 ' + won(inflow) + ' − 국내 매수 ' + won(buy) + ' − 수수료 ' + won(s.domesticBuyFeeAmount ?? 0) + ' + 국내 매도 ' + won(sold) + ' − 인출 ' + won(out)
    basis = '매입금액 기준'
  } else {
    const FL = RD.FLOW
    const DT = RD.DATES
    const split = demoHoldings()
    stock = split.stockV
    fund = split.etfV
    cash = FL.cash
    out = FL.withdrawn
    steps = [
      plain('해외주식 매도', FL.inflow, F.short(DT.filled) + ' 체결'),
      plain('원화 확정', FL.inflow, F.short(DT.confirmed) + ' · 1년 유지 시작'),
      plain('국내 매수', FL.buyCost, '누적 원가'),
      { name: '국내 운용 중', amt: '₩' + won(FL.evalAmt), note: '평가 · ' + (FL.pnl >= 0 ? '+' : '-') + won(Math.abs(FL.pnl)), noteTone: tone(FL.pnl) },
      plain('인출', FL.withdrawn, '인출 가능일 ' + F.dot(RD.WITHDRAW.availableDate))
    ]
    cashFormula = '원화 확정 ' + won(FL.inflow) + ' − 국내 매수 ' + won(FL.buyCost) + ' + 국내 매도 ' + won(FL.sold) + ' − 인출 ' + won(FL.withdrawn)
    basis = '평가금액 기준'
  }
  const denom = stock + fund + cash + out
  const share = (v: number) => (denom > 0 ? v / denom : 0)
  const all: SummarySeg[] = [
    { key: 'stock', label: '국내 주식', color: SEG_COLOR.stock, amt: won(stock), pct: pctText(share(stock)), grow: stock },
    { key: 'fund', label: 'ETF·펀드', color: SEG_COLOR.fund, amt: won(fund), pct: pctText(share(fund)), grow: fund },
    { key: 'cash', label: '예수금 · 투자 대기', color: SEG_COLOR.cash, amt: won(cash), pct: pctText(share(cash)), grow: cash },
    { key: 'out', label: '인출', color: SEG_COLOR.out, amt: won(out), pct: pctText(share(out)), grow: out }
  ]
  return {
    pct: Math.round(share(stock + fund) * 100),
    segs: all.filter((x) => x.grow > 0),
    investedNone: stock + fund <= 0,
    cash: won(cash),
    basis,
    formula: '(국내 주식 ' + won(stock) + ' + ETF·펀드 ' + won(fund) + ') ÷ (국내 주식 + ETF·펀드 + 예수금 ' + won(cash) + ' + 인출 누적 ' + won(out) + ')',
    steps,
    cashFormula,
    cashLabel: s ? '계좌 예수금' : '주문 가능 예수금'
  }
}

// 시연 데이터: 국내 보유의 주식/ETF 평가금액
function demoHoldings() {
  const isEtf = (c: string) => !!RD.KR_ETF[c]
  const rows = RD.KR_HOLDINGS.map((h) => ({ code: h.code, v: (RD.PX[h.code] || [0, 0])[0] * h.qty }))
  const etfV = rows.filter((r) => isEtf(r.code)).reduce((a, r) => a + r.v, 0)
  const stockV = rows.reduce((a, r) => a + r.v, 0) - etfV
  return { isEtf, rows, etfV, stockV }
}

// ---- 인출 가능 일정 ----
export interface ScheduleRow {
  key: string
  label: string // "4.28 납입"
  amt: string // 그날 납입 합계
  withdrawn: string | null // 인출된 금액이 있을 때만
  startPct: number // 막대 시작(축 안 위치 %)
  widthPct: number // 막대 길이(납입일 ~ 인출 가능일, 1년)
  fillPct: number // 막대 중 업무일까지 지난 부분 %
  endLabel: string // 인출 가능일
  matured: boolean
  fullyWithdrawn: boolean
}

export interface ScheduleView {
  mode: 'loading' | 'notOpened' | 'error' | 'ready'
  now: string // 지금 인출 가능 금액 (없으면 '-')
  nextDate: string // 다음 인출 가능일 (없으면 '-')
  dday: string // "D-123" / "" / "인출 가능"
  holding: string // 1년 유지 중인 납입금 합계
  rows: ScheduleRow[] // 납입일 오름차순
  ticks: { pct: number; label: string }[] // 3개월 간격 눈금
  todayPct: number
  today: string // 업무일 표시
  demo: boolean
}

const EMPTY_SCHEDULE: ScheduleView = { mode: 'loading', now: '-', nextDate: '-', dday: '', holding: '-', rows: [], ticks: [], todayPct: 0, today: '', demo: false }

const monthStart = (d: string) => d.slice(0, 7) + '-01'
const addMonthsISO = (d: string, n: number) => {
  const x = new Date(d + 'T00:00:00Z')
  x.setUTCMonth(x.getUTCMonth() + n)
  return x.toISOString().slice(0, 10)
}

interface LotInput {
  paidDate: string
  maturityDate: string
  paidAmount: number
  withdrawnAmount: number
  remainingAmount: number
  matured: boolean
}

function buildRows(lots: LotInput[], today: string) {
  if (lots.length === 0) return { rows: [] as ScheduleRow[], ticks: [] as { pct: number; label: string }[], todayPct: 0 }
  const start = monthStart(lots.reduce((m, l) => (l.paidDate < m ? l.paidDate : m), lots[0].paidDate))
  const lastMat = lots.reduce((m, l) => (l.maturityDate > m ? l.maturityDate : m), lots[0].maturityDate)
  const end = lastMat > today ? lastMat : today
  const span = Math.max(1, F.days(start, end))
  const pos = (d: string) => Math.min(100, Math.max(0, (F.days(start, d) / span) * 100))
  const rows = lots.map((l) => {
    const total = Math.max(1, F.days(l.paidDate, l.maturityDate))
    const elapsed = Math.min(1, Math.max(0, F.days(l.paidDate, today) / total))
    const md = l.paidDate.split('-')
    return {
      key: l.paidDate,
      label: Number(md[1]) + '.' + Number(md[2]) + ' 납입',
      amt: '₩' + F.won(l.paidAmount),
      withdrawn: l.withdrawnAmount > 0 ? '인출 ₩' + F.won(l.withdrawnAmount) : null,
      startPct: pos(l.paidDate),
      widthPct: Math.max(0.5, pos(l.maturityDate) - pos(l.paidDate)),
      fillPct: l.matured ? 100 : elapsed * 100,
      endLabel: F.dot(l.maturityDate),
      matured: l.matured,
      fullyWithdrawn: l.remainingAmount <= 0 && l.withdrawnAmount > 0
    }
  })
  const ticks: { pct: number; label: string }[] = []
  for (let t = start; t <= end; t = addMonthsISO(t, 3)) ticks.push({ pct: pos(t), label: t.slice(2, 4) + '.' + t.slice(5, 7) })
  // 업무일 표시와 겹치는 눈금 글씨는 뺀다
  const todayPct = pos(today)
  return { rows, ticks: ticks.filter((t) => Math.abs(t.pct - todayPct) > 7), todayPct }
}

// 서버 값(schedule·availability)이 있으면 그 값으로, 없으면(로그인 전) 시연 데이터(RD.WITHDRAW는 읽기만 한다)로 그린다
export function scheduleView(st: WithdrawScheduleState): ScheduleView {
  if (st.source === 'loading') return EMPTY_SCHEDULE
  if (st.source === 'notOpened') return { ...EMPTY_SCHEDULE, mode: 'notOpened' }
  // 조회 실패는 시연 값으로 대신하지 않는다(실제 금액처럼 보이면 안 됨)
  if (st.source === 'error') return { ...EMPTY_SCHEDULE, mode: 'error' }
  if (st.source === 'live' && st.schedule && st.availability) {
    const today = st.schedule.businessDate
    const av = st.availability
    const next = av.leftAmounts.filter((l) => !l.matured).map((l) => l.maturesAt.slice(0, 10)).sort()[0]
    const g = buildRows(st.schedule.lots, today)
    return {
      mode: 'ready',
      now: '₩' + F.won(av.withdrawableWithoutPenalty),
      nextDate: next ? F.dot(next) : '-',
      dday: next ? 'D-' + Math.max(0, F.days(today, next)) : av.leftAmounts.length > 0 ? '모두 인출 가능' : '',
      holding: '₩' + F.won(av.immaturePrincipalAmount),
      rows: g.rows,
      ticks: g.ticks,
      todayPct: g.todayPct,
      today: F.dot(today),
      demo: false
    }
  }
  // 시연 데이터: 납입 1건
  const today = RD.C.BUSINESS_DATE
  const w = RD.WITHDRAW
  const g = buildRows([{ paidDate: w.paidDate, maturityDate: w.availableDate, paidAmount: w.paidIn, withdrawnAmount: 0, remainingAmount: w.paidIn, matured: w.availableDate <= today }], today)
  return {
    mode: 'ready',
    now: '₩' + F.won(F.withdrawableNow()),
    nextDate: F.dot(w.availableDate),
    dday: 'D-' + Math.max(0, F.days(today, w.availableDate)),
    holding: '₩' + F.won(w.paidIn),
    rows: g.rows,
    ticks: g.ticks,
    todayPct: g.todayPct,
    today: F.dot(today),
    demo: true
  }
}

// ---- 자금 이동 내역 ----
export const TX_LABEL: Record<FundFlowTransactionType, string> = {
  KRW_CONFIRMED: '원화 확정',
  DOMESTIC_SELL: '국내 매도',
  DOMESTIC_BUY: '국내 매수',
  WITHDRAWAL: '인출'
}

export interface TxDetailView {
  name: string
  qty: string
  px: string
  amt: string
  fee: string
}

export interface TxView {
  key: string
  date: string // MM.DD
  type: FundFlowTransactionType
  label: string
  amt: string // +/- 부호가 붙은 금액
  cashAfter: string
  items: string // "KB금융 3주 · 삼성전자 2주"
  details: TxDetailView[]
}

export interface TxMonth {
  key: string // yyyy-MM
  label: string // 2026.11
  summary: string // 원화 확정 +N · 매수 −N · 매도 +N · 인출 −N (0인 항목은 생략)
  items: TxView[]
}

export interface TxGroups {
  recent: TxMonth[] // 처음부터 보이는 최근 3개월(최신순)
  older: TxMonth[] // "이전 내역 더 보기"로 여는 나머지
  olderCount: number
}

const signed = (n: number) => (n < 0 ? '−' : '+') + F.won(Math.abs(n))
const RECENT_MONTHS = 3

interface TxRaw {
  iso: string
  type: FundFlowTransactionType
  amount: number // 예수금 변동액
  cashAfter: number
  details: { name: string; qty: number; amount: number; feeAmount: number }[]
  title: string | null
}

function rawTransactions(live?: FlowLive): { raw: TxRaw[]; asOf: string } {
  const t = live?.transactions
  if (live?.summary && t) {
    return {
      asOf: t.asOfDate,
      raw: t.items.map((x) => ({
        iso: x.date,
        type: x.type,
        amount: x.amount,
        cashAfter: x.cashAfter,
        title: x.title,
        details: x.details.map((d) => ({ name: d.name, qty: d.qty ?? 0, amount: d.amount ?? 0, feeAmount: d.feeAmount ?? 0 }))
      }))
    }
  }
  // 시연 데이터: 원화 확정 1건 + 국내 매수 여러 건(시연 데이터에는 종목별 내역이 없어 대표 문구만 있다)
  let cash = 0
  const rows = [
    { iso: RD.DATES.confirmed, type: 'KRW_CONFIRMED' as const, amount: RD.FLOW.inflow, title: null as string | null },
    ...RD.DOMESTIC_BUYS.map((b) => ({ iso: b.date, type: 'DOMESTIC_BUY' as const, amount: -(b.amount as number), title: b.text as string | null }))
  ]
  return {
    asOf: RD.C.BUSINESS_DATE,
    raw: rows.map((r) => {
      cash += r.amount
      return { ...r, cashAfter: cash, details: [] }
    })
  }
}

// 월별로 묶는다(최신순). 월 머리줄 소계는 요약 카드와 같은 기준이다:
// 원화 확정·인출은 금액, 국내 매수는 체결금액(수수료 제외 = 요약의 '국내 매수'), 국내 매도는 수수료·거래세를 뺀 순액(= 요약의 '국내 매도')
export function transactionGroups(live?: FlowLive): TxGroups {
  const { raw, asOf } = rawTransactions(live)
  const byMonth = new Map<string, TxRaw[]>()
  for (const r of raw) {
    const k = r.iso.slice(0, 7)
    byMonth.set(k, [...(byMonth.get(k) ?? []), r])
  }
  const months: TxMonth[] = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => {
      const sum = (type: FundFlowTransactionType) => list.filter((x) => x.type === type).reduce((a, x) => a + (type === 'DOMESTIC_BUY' ? x.details.reduce((s, d) => s + d.amount, 0) || Math.abs(x.amount) : Math.abs(x.amount)), 0)
      const parts = [
        ['원화 확정 +', sum('KRW_CONFIRMED')],
        ['매수 −', sum('DOMESTIC_BUY')],
        ['매도 +', sum('DOMESTIC_SELL')],
        ['인출 −', sum('WITHDRAWAL')]
      ] as const
      const items: TxView[] = [...list].reverse().map((x, i) => ({
        key: x.iso + x.type + i,
        date: x.iso.slice(5).replace('-', '.'),
        type: x.type,
        label: TX_LABEL[x.type],
        amt: signed(x.amount),
        cashAfter: F.won(x.cashAfter),
        items: x.details.length > 0 ? x.details.map((d) => d.name + ' ' + F.won(d.qty) + '주').join(' · ') : (x.title ?? ''),
        details: x.details.map((d) => ({ name: d.name, qty: F.won(d.qty) + '주', px: d.qty > 0 ? F.won(d.amount / d.qty) : '-', amt: F.won(d.amount), fee: F.won(d.feeAmount) }))
      }))
      return {
        key,
        label: key.replace('-', '.'),
        summary: parts.filter(([, v]) => v > 0).map(([l, v]) => l + F.won(v)).join(' · '),
        items
      }
    })
  // 처음엔 업무일이 속한 달부터 3개월(예: 11월이면 9·10·11월)만. 그 기간에 거래가 없으면 가장 최근 달은 보여준다
  const from = addMonthsISO(monthStart(asOf), -(RECENT_MONTHS - 1)).slice(0, 7)
  let recent = months.filter((m) => m.key >= from)
  if (recent.length === 0 && months.length > 0) recent = [months[0]]
  const older = months.filter((m) => !recent.includes(m))
  return { recent, older, olderCount: older.reduce((a, m) => a + m.items.length, 0) }
}

// ---- 국내 투자 구성 ----
export interface CompItem {
  label: string
  color: string
  amt: string
  pct: string
}

export interface CompView {
  empty: boolean // 국내 투자가 0
  basis: string
  donut: string
  total: string
  items: CompItem[]
}

// 업종 상위 3 → 기타 업종 → ETF·펀드 순. 색은 기존 도넛 토큰(남색 계열)과 ETF=금색
const COMP_COLORS = ['var(--color-navy)', 'var(--color-donut-2)', 'var(--color-donut-3)']
const COMP_OTHER = 'var(--color-donut-4)'
const COMP_FUND = 'var(--color-gold)'

function compFrom(basis: string, sectors: { label: string; value: number }[], stockTotal: number, fundTotal: number): CompView {
  const total = stockTotal + fundTotal
  if (total <= 0) return { empty: true, basis, donut: '', total: '0', items: [] }
  const top = sectors.slice(0, 3)
  const topSum = top.reduce((a, x) => a + x.value, 0)
  const other = Math.max(0, stockTotal - topSum)
  const parts: { label: string; value: number; color: string }[] = [
    ...top.map((x, i) => ({ label: x.label, value: x.value, color: COMP_COLORS[i] })),
    { label: '기타 업종', value: other, color: COMP_OTHER },
    { label: 'ETF·펀드', value: fundTotal, color: COMP_FUND }
  ].filter((x) => x.value > 0.5)
  let acc = 0
  const donut =
    'conic-gradient(' +
    parts
      .map((x) => {
        const a0 = acc
        acc += (x.value / total) * 100
        return x.color + ' ' + a0.toFixed(2) + '% ' + acc.toFixed(2) + '%'
      })
      .join(', ') +
    ')'
  return {
    empty: false,
    basis,
    donut,
    total: F.man(total),
    items: parts.map((x) => ({ label: x.label, color: x.color, amt: F.won(x.value), pct: pctText(x.value / total) }))
  }
}

// allocation이 있으면 서버의 매입금액 기준 값을, 없으면 시연 데이터(평가금액 기준)를 쓴다
export function compositionView(live?: FundFlowAllocation | null): CompView {
  if (live) {
    return compFrom('매입금액 기준', live.sectors.map((x) => ({ label: x.label, value: x.value })), bucketValue(live, '국내 주식'), bucketValue(live, 'ETF·펀드'))
  }
  const { isEtf, rows, etfV, stockV } = demoHoldings()
  const sectorOf = (c: string) => (RD.KR[c] ? RD.KR[c][0] : EXT_SECTOR[c] || '기타')
  const bySector: Record<string, number> = {}
  rows
    .filter((r) => !isEtf(r.code))
    .forEach((r) => {
      const k = sectorOf(r.code)
      bySector[k] = (bySector[k] || 0) + r.v
    })
  const sectors = Object.entries(bySector)
    .sort((x, y) => y[1] - x[1])
    .map(([label, value]) => ({ label, value }))
  return compFrom('평가금액 기준', sectors, stockV, etfV)
}

// ---- 감면과 국내 운용 ----
// 서버 값(예상 감면액·국내 매수 누적)이 있으면 '감면 1원당 국내 매수'를, 없으면 시연 데이터로 '국내 운용'을 계산한다
export function cutVsInvest(live?: { summary?: FundFlowSummary | null; relief?: FundFlowRelief | null }): {
  cut: string
  investLabel: string
  invest: string
  ratioLabel: string
  ratio: string
  note: string
} {
  const relief = live?.relief
  if (relief && live?.summary) {
    const cut = relief.reliefAmount ?? 0
    const buy = live.summary.domesticBuyAmount ?? 0
    return {
      cut: F.won(cut),
      investLabel: '국내 매수 누적',
      invest: F.won(buy),
      ratioLabel: '감면 1원당 국내 매수 약',
      ratio: cut > 0 ? (buy / cut).toFixed(1) : '-',
      note: relief.statusLabel
    }
  }
  const cut = F.tax(0, RD.C.BUSINESS_DATE, 1).cut
  return {
    cut: F.won(cut),
    investLabel: '국내 운용',
    invest: F.won(RD.FLOW.evalAmt),
    ratioLabel: '감면 1원당 국내 운용 약',
    ratio: !cut ? '-' : String(Math.round(RD.FLOW.evalAmt / cut)),
    note: '참고용이에요'
  }
}
