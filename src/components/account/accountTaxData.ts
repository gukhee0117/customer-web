import type { CustomerTaxBasis, TaxBasisBand } from '../../api/briefing'
import type { DocType } from '../../api/documents'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'

// 매도 한도·세액·원금 유지·증빙서류 박스의 숫자 — 원본 renderVals 계산 그대로(값은 src/data·src/lib에서)


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

export interface CalcRow {
  n: number
  name: string
  formula: string
  value: string
  last: boolean
}

// 구간 이름 — 월 경계면 '6~7월', 아니면 날짜
function bandLabel(b: TaxBasisBand): string {
  const next = new Date(b.validTo)
  next.setDate(next.getDate() + 1)
  if (b.validFrom.endsWith('-01') && next.getDate() === 1) return Number(b.validFrom.slice(5, 7)) + '~' + Number(b.validTo.slice(5, 7)) + '월'
  return F.short(b.validFrom) + '~' + F.short(b.validTo)
}

const pctTxt = (r: number): string => Math.round(r * 100) + '%'

// 세액 계산 근거 창 — 서버 계산 값을 5단계 + 절감액 표로. 혜택 취소면 일반 과세 안내만
export function basisRows(b: CustomerTaxBasis): { notice: string | null; rows: CalcRow[] } {
  const won = F.won
  const done = (rows: [string, string[], string][]) => rows.map(([name, f, value], i): CalcRow => ({ n: i + 1, name, formula: f.join(' · '), value, last: i === rows.length - 1 }))
  if (b.reliefExcluded || b.benefit === 'IMPOSSIBLE') {
    return { notice: '이 계좌는 세제 혜택이 취소돼 일반 과세로 계산해요', rows: done([['일반 세액', ['(총 양도소득 ' + won(b.totalGain) + ' − 기본공제 ' + won(b.basicDeduction) + ') × 22%'], won(b.generalTax) + '원']]) }
  }
  const weighted = (r: TaxBasisBand) => bandLabel(r) + ' ' + pctTxt(r.weightRate)
  const noExternal = b.bands.every((x) => x.externalNetBuy === 0)
  const base = Math.max(0, b.totalGain - b.basicDeduction - b.finalDeduction)
  return {
    notice: null,
    rows: done([
      ['구간 가중치 적용', b.bands.map(weighted), b.bands.length + '개 구간'],
      ['RIA 매도 가중합산', [...b.bands.map((x) => bandLabel(x) + ' 매도 ' + won(x.sellAmount) + ' × ' + pctTxt(x.weightRate)), '양도소득 가중 합 ' + won(b.preAdjustDeduction)], won(b.weightedSell)],
      [
        '다른 계좌 해외주식 순매수 가중합산',
        noExternal ? ['다른 계좌의 해외주식 순매수가 없어요'] : b.bands.map((x) => bandLabel(x) + ' 순매수 ' + won(x.externalNetBuy) + ' × ' + pctTxt(x.weightRate)),
        won(b.weightedNetPurchase) + '원'
      ],
      ['조정비율', ['1 − ' + won(b.weightedNetPurchase) + ' ÷ ' + won(b.weightedSell) + ' = ' + (b.adjustRatio * 100).toFixed(2) + '%'], (b.adjustRatio * 100).toFixed(2) + '%'],
      ['최종 공제액과 세액', ['공제 ' + won(b.preAdjustDeduction) + ' × ' + (b.adjustRatio * 100).toFixed(2) + '% = ' + won(b.finalDeduction), '과세표준 (' + won(b.totalGain) + ' − ' + won(b.basicDeduction) + ' − ' + won(b.finalDeduction) + ') = ' + won(base) + ' × 22% = ' + won(b.finalTax)], won(b.finalTax) + '원'],
      ['절감액', ['일반 과세 ' + won(b.generalTax) + ' − RIA 세액 ' + won(b.finalTax)], won(b.reliefAmount) + '원']
    ])
  }
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

// 서버 발급 기록 → 화면 줄(최근 것이 앞). 서버 날짜는 'YYYY-MM-DDTHH:mm:ss'
export function issuedRecords(list: { docType: DocType; issuedAt: string }[]): IssueRecord[] {
  return [...list]
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .flatMap((d) => {
      const name = docItems().find((x) => x.docType === d.docType)?.name
      return name ? [[F.short(d.issuedAt.slice(0, 10)), name] as IssueRecord] : []
    })
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
      name: 'RIA 과세특례 증빙서',
      desc: '양도소득세 확정신고 첨부용 · 구간별 매도·공제액·세액',
      ready: true,
      docType: 'TAX_RELIEF_CERT'
    },
    { name: 'RIA 외 계좌 순매수 내역서', desc: '다른 계좌 해외주식 순매수 확인용', ready: true, docType: 'NET_PURCHASE_STATEMENT' }
  ]
}

// 서류 이름 → 서버 서류 종류(발급 기록 줄은 이름만 갖고 있음)
export function docTypeOf(name: string): DocType | undefined {
  return docItems().find((d) => d.name === name)?.docType
}
