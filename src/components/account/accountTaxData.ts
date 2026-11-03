import type { DocType } from '../../api/documents'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'

// 매도 한도·세액·원금 유지·증빙서류 박스의 숫자 — 원본 renderVals 계산 그대로(값은 src/data·src/lib에서)

// 남은 한도까지 팔 때 감면액의 예상 범위 배수 — 원본 account 화면 안의 예시 값
// TODO: 백엔드 연결 시 주가·환율 시뮬레이션 결과(1,000번)로 교체
const RANGE_CUT: [number, number] = [0.962, 1.035]

// 매도 체결 종목 수 — 증빙서류 설명 문구용(원본 account 화면 안의 예시 값)
// TODO: 백엔드 연결 시 매도 내역 건수로 교체
const SOLD_COUNT = 5

// 시연 설정의 '조정비율(다른 계좌 순매수)' 1.00 / 0.90 — 원본은 이 화면 안에서만 바꾸고(혜택 상태를 바꾸면 해제), 없으면 혜택 상태에서 정해진 값
let adjOverride: number | null = null
export const setAdjOverride = (v: number | null): void => {
  adjOverride = v
}
export const currentAdj = (): number => adjOverride ?? RD.BENEFIT.adj

const rng = (v: number, r: [number, number]): string => F.man(v * r[0]) + '~' + F.man(v * r[1]) + ' 원'

export interface LimitValues {
  remain: string
  limitMan: string
  usedPct: string
  used: string
  soldShort: string
  bandLabel: string
  bandEnd: string
  bandD: number
  guideLine: string
}

export function limitValues(): LimitValues {
  const biz = RD.C.BUSINESS_DATE
  const b = F.band(biz)
  const e = F.bandEnd(biz)
  const plan = F.plan({ biz })
  return {
    remain: F.man(F.remaining()),
    limitMan: F.man(RD.C.SELL_LIMIT),
    usedPct: (RD.C.SOLD.amount / RD.C.SELL_LIMIT) * 100 + '%',
    used: F.man(RD.C.SOLD.amount),
    soldShort: F.short(RD.SOLD.filled),
    bandLabel: b.from + '~' + b.to + '월 ' + Math.round(b.rate * 100) + '%',
    bandEnd: F.short(e),
    bandD: F.days(biz, e),
    guideLine: '남은 한도 ' + F.man(F.remaining()) + ' 원을 다 쓰면 예상 공제 ' + F.man(plan.ded) + ' 원 · 예상 절세 약 ' + F.man(plan.save) + ' 원'
  }
}

export interface TaxValues {
  bizShort: string
  benX: boolean
  benXMsg: string
  cut: string
  rangeOn: boolean
  range: string
  general: string
  ria: string
  guide: string
  adjOn: boolean
  adjMsg: string
}

export function taxValues(): TaxValues {
  const biz = RD.C.BUSINESS_DATE
  const adj = currentAdj()
  const benX = RD.BENEFIT_STATE === 'IMPOSSIBLE'
  const t0 = F.tax(0, biz, adj)
  const tG = F.tax(F.plan({ biz }).gain, biz, adj)
  return {
    bizShort: F.short(biz),
    benX,
    benXMsg: benX && RD.BENEFIT.cancelledAt ? F.dot(RD.BENEFIT.cancelledAt) + ' 조기인출로 이 계좌의 세제 혜택이 취소됐어요' : '',
    cut: F.won(benX ? 0 : t0.cut),
    rangeOn: !benX,
    range: rng(tG.cut, RANGE_CUT),
    general: F.won(t0.general),
    ria: F.won(benX ? t0.general : t0.ria),
    guide: F.won(benX ? 0 : tG.cut),
    adjOn: adj < 1,
    adjMsg: '다른 계좌의 해외주식 순매수로 공제가 ' + Math.round((1 - adj) * 100) + '% 줄었어요'
  }
}

export interface CalcRow {
  n: number
  name: string
  formula: string
  value: string
  last: boolean
}

// 세액 계산 근거 창의 5단계 + 예상 범위
export function calcRows(): CalcRow[] {
  const C = RD.C
  const biz = C.BUSINESS_DATE
  const adj = currentAdj()
  const won = F.won
  const t0 = F.tax(0, biz, adj)
  const tG = F.tax(F.plan({ biz }).gain, biz, adj)
  const rate = F.band(C.SOLD.filled).rate
  const pct = Math.round(rate * 100)
  const wSell = C.SOLD.amount * rate
  const wGain = C.SOLD.gain * rate
  const otherBuy = Math.round((1 - adj) * wSell)
  const ded = Math.round(wGain * adj)
  const base = Math.max(0, C.SOLD.gain - C.BASIC_DEDUCTION - ded)
  const sb = F.band(C.SOLD.filled)
  const rows: [string, string[], string][] = [
    ['구간 가중치 적용', [F.short(C.SOLD.filled) + ' 매도 체결 → ' + sb.from + '~' + sb.to + '월 구간'], pct + '%'],
    ['RIA 매도 가중합산', ['매도 ' + won(C.SOLD.amount) + ' × ' + pct + '% = ' + won(wSell), '양도소득 가중 ' + won(C.SOLD.gain) + ' × ' + pct + '% = ' + won(wGain)], won(wSell)],
    ['다른 계좌 해외주식 순매수 가중합산', [otherBuy ? '다른 계좌 순매수 가중 합계' : '다른 계좌의 해외주식 순매수가 없어요'], won(otherBuy) + '원'],
    ['조정비율', ['1 − ' + won(otherBuy) + ' ÷ ' + won(wSell) + ' = ' + adj.toFixed(2)], adj.toFixed(2)],
    ['최종 공제액과 세액', ['공제 ' + won(wGain) + ' × ' + adj.toFixed(2) + ' = ' + won(ded), '과세표준 (' + won(C.SOLD.gain) + ' − ' + won(C.BASIC_DEDUCTION) + ' − ' + won(ded) + ') = ' + won(base) + ' × 22% = ' + won(t0.ria)], won(t0.ria) + '원'],
    ['예상 범위', ['남은 보유 종목(' + C.HOLDINGS.map((h) => h.t).join('·') + ')의 주가와 환율을 과거 변동성으로 1,000번 시뮬레이션 → 10번 중 8번 들어가는 범위'], rng(tG.cut, RANGE_CUT)]
  ]
  return rows.map(([name, f, value], i) => ({ n: i + 1, name, formula: f.join(' · '), value, last: i === rows.length - 1 }))
}

export interface HoldValues {
  wdDate: string
  wdD: number
  soldConf: string
  pct: string
  paidAmt: string
  wdNow: string
}

export function holdValues(): HoldValues {
  const biz = RD.C.BUSINESS_DATE
  const pct = Math.max(0, Math.min(100, (F.days(RD.SOLD.confirmed, biz) / F.days(RD.SOLD.confirmed, RD.WITHDRAW.availableDate)) * 100))
  return {
    wdDate: F.dot(RD.WITHDRAW.availableDate),
    wdD: F.withdrawDday(biz),
    soldConf: F.dot(RD.SOLD.confirmed),
    pct: pct.toFixed(2) + '%',
    paidAmt: F.won(RD.WITHDRAW.paidIn),
    wdNow: F.won(F.withdrawableNow())
  }
}

// 증빙서류 — 발급 기록은 [날짜, 서류 이름]
export type IssueRecord = [date: string, name: string]

export const HOLD_TIP = '1년 전에 원금을 인출하면 이 계좌의 세제 혜택이 모두 취소돼요'

export function initialIssued(): IssueRecord[] {
  const conf1 = F.short(F.bizAdd(RD.DATES.confirmed, 1))
  return [
    [F.short(F.ago(1)), 'RIA 매도내역서'],
    [conf1, 'RIA 매도내역서'],
    [conf1, 'RIA 외 거래내역서']
  ]
}

export interface DocItem {
  name: string
  desc: string
  ready: boolean
  docType: DocType // 서버 서류 종류
}

export function docItems(): DocItem[] {
  return [
    {
      name: 'RIA 매도내역서',
      desc: F.short(RD.SOLD.filled) + ' 매도 ' + SOLD_COUNT + '종목의 체결·원화 확정 내역',
      ready: true,
      docType: 'TAX_RELIEF_CERT'
    },
    { name: 'RIA 외 거래내역서', desc: '다른 계좌 해외주식 순매수 확인용', ready: true, docType: 'NET_PURCHASE_STATEMENT' }
  ]
}

// 서류 이름 → 서버 서류 종류(발급 기록 줄은 이름만 갖고 있음)
export function docTypeOf(name: string): DocType | undefined {
  return docItems().find((d) => d.name === name)?.docType
}
