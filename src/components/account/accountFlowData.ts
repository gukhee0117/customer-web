import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import type { FundFlowAllocation, FundFlowMonthly, FundFlowRelief, FundFlowSummary } from '../../api/fundFlow'
import { currentAdj } from './accountTaxData'
import type { Tone } from './accountData'

// 자금 흐름 탭 네 박스의 숫자 — 원본 renderVals의 fl 계산 그대로(값은 src/data·src/lib에서, 주식 패키지·계좌 현황과 같은 데이터)

const tone = (n: number): Tone => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat')

// 업종 이름을 데이터(RD.KR)에서 못 찾는 국내 패키지 종목 9개의 업종 — 원본 account 화면 안의 예시 값
// TODO: 백엔드 연결 시 종목 마스터(DOMESTIC_PRODUCT)에서 업종 받아오기
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

// ---- 돌아온 돈의 흐름 ----
export interface FlowStep {
  name: string
  amt: string
  note: string
  noteTone: Tone
}

// 서버 값(summary·monthly·allocation)이 있으면 그 값으로, 없으면(로그인 전·오류) 시연 데이터로 그린다
// 서버 모드의 '국내 보유'는 평가금액이 아니라 매입금액(보유수량 × 평균 매입가) 기준
export interface FlowLive {
  summary?: FundFlowSummary | null
  monthly?: FundFlowMonthly | null
  allocation?: FundFlowAllocation | null
}

const sumMonths = (m: FundFlowMonthly | null | undefined, k: 'domesticSellAmount' | 'withdrawalAmount') =>
  (m?.months ?? []).reduce((acc, x) => acc + (x[k] ?? 0), 0)

export function flowSteps(live?: FlowLive): { steps: FlowStep[]; cash: string; formula: string; headline: string | null } {
  const won = F.won
  const plain = (name: string, v: number, note: string): FlowStep => ({ name, amt: '₩' + won(v), note, noteTone: 'flat' })
  const s = live?.summary
  if (s) {
    const inflow = s.krwInflowAmount ?? 0
    const buy = s.domesticBuyAmount ?? 0
    const sold = sumMonths(live?.monthly, 'domesticSellAmount')
    const out = sumMonths(live?.monthly, 'withdrawalAmount')
    return {
      steps: [
        plain('해외주식 매도', s.soldForeignAmount ?? 0, '누적'),
        plain('원화 확정', inflow, '확정일부터 1년 유지'),
        plain('국내 매수', buy, '누적 원가'),
        plain('국내 보유 중', live?.allocation?.holdingsCost ?? 0, '매입금액 기준'),
        plain('인출', out, '누적')
      ],
      cash: won(s.cashBalance ?? 0),
      // 매수 수수료는 국내 매수(원가)에 들어 있지 않아 따로 뺀다 — 국내 매도는 수수료·세금을 뺀 금액
      formula: '원화 확정 ' + won(inflow) + ' − 국내 매수 ' + won(buy) + ' − 수수료 ' + won(s.domesticBuyFeeAmount ?? 0) + ' + 국내 매도 ' + won(sold) + ' − 인출 ' + won(out),
      headline: s.message
    }
  }
  const FL = RD.FLOW
  const DT = RD.DATES
  return {
    steps: [
      plain('해외주식 매도', FL.inflow, F.short(DT.filled) + ' 체결'),
      plain('원화 확정', FL.inflow, F.short(DT.confirmed) + ' · 1년 유지 시작'),
      plain('국내 매수', FL.buyCost, '누적 원가'),
      { name: '국내 운용 중', amt: '₩' + won(FL.evalAmt), note: '평가 · ' + (FL.pnl >= 0 ? '+' : '-') + won(Math.abs(FL.pnl)), noteTone: tone(FL.pnl) },
      plain('인출', FL.withdrawn, '인출 가능일 ' + F.dot(RD.WITHDRAW.availableDate))
    ],
    cash: won(FL.cash),
    formula: '원화 확정 ' + won(FL.inflow) + ' − 국내 매수 ' + won(FL.buyCost) + ' + 국내 매도 ' + won(FL.sold) + ' − 인출 ' + won(FL.withdrawn),
    headline: null
  }
}

// ---- 월별 흐름 ----
// 막대 네 종류(이름, 색 토큰) — 원본 SER 순서
export const MONTH_SERIES: { key: 'inflow' | 'buy' | 'sell' | 'out'; label: string; color: string }[] = [
  { key: 'inflow', label: '원화 유입', color: 'var(--color-navy)' },
  { key: 'buy', label: '국내 매수', color: 'var(--color-gold)' },
  { key: 'sell', label: '국내 매도', color: 'var(--color-muted)' },
  { key: 'out', label: '인출', color: 'var(--color-line-strong)' }
]

export interface MonthBar {
  color: string
  h: string // 막대 높이(퍼센트 또는 값이 0일 때 2px)
  v: string
  title: string
}

export interface MonthView {
  label: string
  inflow: string
  buy: string
  sell: string
  out: string
  bars: MonthBar[]
}

export function monthlyFlow(api?: FundFlowMonthly | null): MonthView[] {
  // 서버 값이 있으면 월별 4종을 그대로, 없으면 시연 데이터(국내 매도·인출은 시연 데이터에 없어 0)
  const monthly = api
    ? api.months.map((m) => ({
        month: m.flowMonth.slice(0, 7),
        inflow: m.krwInflowAmount ?? 0,
        buy: m.domesticBuyAmount ?? 0,
        sell: m.domesticSellAmount ?? 0,
        out: m.withdrawalAmount ?? 0
      }))
    : RD.FLOW.monthly.map((m) => ({ month: m.month, inflow: m.inflow, buy: m.buy, sell: 0, out: 0 }))
  const mx = Math.max(1, ...monthly.map((m) => Math.max(m.inflow, m.buy, m.sell, m.out)))
  return monthly.map((m) => {
    const v = { inflow: m.inflow, buy: m.buy, sell: m.sell, out: m.out }
    return {
      label: m.month.replace('-', '.'),
      inflow: F.won(v.inflow),
      buy: F.won(v.buy),
      sell: F.won(v.sell),
      out: F.won(v.out),
      // 숫자가 겹치지 않게 그 달에서 가장 큰 막대에만 값을 적고, 나머지는 마우스를 올리면(title) 보인다. 정확한 값은 아래 표에 있다
      bars: MONTH_SERIES.map((s) => ({
        color: s.color,
        h: v[s.key] ? ((v[s.key] / mx) * 88).toFixed(2) + '%' : '2px',
        v: v[s.key] && v[s.key] === Math.max(v.inflow, v.buy, v.sell, v.out) ? F.man(v[s.key]) : '',
        title: s.label + ' ' + F.won(v[s.key]) + '원'
      }))
    }
  })
}

// ---- 어디에 운용하고 있나 ----
export interface AllocItem {
  label: string
  color: string
  amt: string
  pct: string
}

export interface AllocView {
  basis: string
  donut: string
  total: string
  items: AllocItem[]
  sectors: { n: number; label: string; amt: string; pct: string }[]
}

const BUCKET_COLORS = ['var(--color-navy)', 'var(--color-gold)', 'var(--color-line-strong)']

// allocation이 있으면 서버의 매입금액 기준 값을, 없으면 시연 데이터(평가금액 기준)를 쓴다
export function allocValues(live?: FundFlowAllocation | null): AllocView {
  if (live) {
    const total = live.totalValue ?? 0
    let acc = 0
    const donut =
      'conic-gradient(' +
      live.buckets
        .map((b, i) => {
          const a0 = acc
          acc += (b.share ?? 0) * 100
          return BUCKET_COLORS[i % BUCKET_COLORS.length] + ' ' + a0.toFixed(2) + '% ' + acc.toFixed(2) + '%'
        })
        .join(', ') +
      ')'
    return {
      basis: '매입금액 기준',
      donut: total > 0 ? donut : 'var(--color-line-strong)',
      total: F.man(total),
      items: live.buckets.map((b, i) => ({ label: b.label, color: BUCKET_COLORS[i % BUCKET_COLORS.length], amt: F.won(b.value), pct: Math.round((b.share ?? 0) * 100) + '%' })),
      sectors: live.sectors.map((x, i) => ({ n: i + 1, label: x.label, amt: F.man(x.value), pct: Math.round((x.share ?? 0) * 100) + '%' }))
    }
  }
  const FL = RD.FLOW
  const isEtf = (c: string) => !!RD.KR_ETF[c]
  const rows = RD.KR_HOLDINGS.map((h) => ({ code: h.code, v: (RD.PX[h.code] || [0, 0])[0] * h.qty }))
  const etfV = rows.filter((r) => isEtf(r.code)).reduce((a, r) => a + r.v, 0)
  const krSum = rows.reduce((a, r) => a + r.v, 0)
  const stockV = krSum - etfV
  const allocT = stockV + etfV + FL.cash
  const AL: [string, number, string][] = [
    ['국내 주식', stockV, 'var(--color-navy)'],
    ['국내 ETF', etfV, 'var(--color-gold)'],
    ['예수금', FL.cash, 'var(--color-line-strong)']
  ]
  let acc = 0
  const donut =
    'conic-gradient(' +
    AL.map(([, v, c]) => {
      const a0 = acc
      acc += (v / allocT) * 100
      return c + ' ' + a0.toFixed(2) + '% ' + acc.toFixed(2) + '%'
    }).join(', ') +
    ')'

  const sectorOf = (c: string) => (isEtf(c) ? '배당 ETF' : RD.KR[c] ? RD.KR[c][0] : EXT_SECTOR[c] || '기타')
  const bySector: Record<string, number> = {}
  rows.forEach((r) => {
    const k = sectorOf(r.code)
    bySector[k] = (bySector[k] || 0) + r.v
  })
  const top = Object.entries(bySector)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3)

  return {
    basis: '평가금액 기준',
    donut,
    total: F.man(allocT),
    items: AL.map(([label, v, color]) => ({ label, color, amt: F.won(v), pct: Math.round((v / allocT) * 100) + '%' })),
    sectors: top.map(([label, v], i) => ({ n: i + 1, label, amt: F.man(v), pct: Math.round((v / FL.evalAmt) * 100) + '%' }))
  }
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
      note: relief.statusLabel + ' · ' + relief.notice
    }
  }
  const benX = RD.BENEFIT_STATE === 'IMPOSSIBLE'
  const cut = F.tax(0, RD.C.BUSINESS_DATE, currentAdj()).cut
  return {
    cut: F.won(benX ? 0 : cut),
    investLabel: '국내 운용',
    invest: F.won(RD.FLOW.evalAmt),
    ratioLabel: '감면 1원당 국내 운용 약',
    ratio: benX || !cut ? '-' : String(Math.round(RD.FLOW.evalAmt / cut)),
    note: '참고용이에요'
  }
}
