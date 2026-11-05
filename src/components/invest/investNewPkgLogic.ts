import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { PROFILE_KEY } from '../../api/stockPackage'
import type { CandidateItem, CheckRequestItem, CheckResult, OrderFees, Tendency } from '../../api/stockPackage'
import { pctInt } from './investAddLogic'
import { GRADE_WORD } from './investHoldingData'
import { EXT_STOCK } from './investPkgLogic'
import { rateOf } from './investOrderLogic'
import type { QuoteState } from './useQuotes'

// ───── 새 패키지 만들기 창 ─────
// 종목 후보·성향 비교·검사는 서버(maria) 값을 쓴다. 투자 권유가 아닌 정보 제공이라 종목·비중·이유를 제안하는 부분은 없다.
// 살 금액 단계의 현재가·요율도 서버 값이고, 실제 체결 금액은 주문할 때 서버가 다시 계산한다

export const NM_STEPS = ['이름', '후보 찾기', '목표 비중', '만들기']
export type NmStep = 0 | 1 | 2 | 3

// 담은 종목의 서버 정보(종목코드 기준). 화면 데이터(RD)에 없는 종목도 이름·등급을 보여주기 위해 들고 있는다
export interface PickedProduct {
  id: number // domesticProductId
  code: string
  name: string
  type: 'STOCK' | 'FUND'
  sector: string
  grade: number | null
  vol: number | null // 연 변동성(%)
  out: boolean | null // 내 성향 범위 밖 여부(판단할 수 없으면 null)
}

export const pickedFrom = (c: CandidateItem): PickedProduct => ({
  id: c.domesticProductId,
  code: c.ticker,
  name: c.name,
  type: c.type,
  sector: c.sectorName || (c.type === 'FUND' ? '펀드' : ''),
  grade: c.riskGrade,
  vol: c.volatilityPercent,
  out: c.outOfProfile
})

export interface NmChk {
  phase: 'loading' | 'done' | 'error'
  snap?: string // 검사한 때의 구성(JSON)
  result?: CheckResult
}

export interface NewPkgState {
  step: NmStep
  name: string
  w: Record<string, string> // 종목 → 목표 비중 입력값
  picked: Record<string, PickedProduct> // 종목 → 서버 정보
  amt: string // 살 금액(숫자만)
  ask: string // 주소(?ask=)로 들어온 말: 후보 찾기 단계에서 한 번 조건으로 바꿔 본다
  q2: string // 종목 검색어
  chk: NmChk | null
  ack: Record<string, string> // 내 성향보다 위험한 종목을 확인하고 담은 시각
}

const blankNm = (): NewPkgState => ({ step: 0, name: '', w: {}, picked: {}, amt: '', ask: '', q2: '', chk: null, ack: {} })

// 주소(?new=1&ask=…)로 열 때의 처음 상태: 말이 있으면 바로 후보 찾기 단계로 가서 그 말을 조건으로 바꿔 본다
export const nmFromUrl = (askParam: string | null): NewPkgState => {
  const ask = (askParam || '').trim().slice(0, 60)
  return { ...blankNm(), step: ask ? 1 : 0, name: ask.slice(0, 20), ask }
}

export const openNewPkg = (): NewPkgState => blankNm()

// ───── 종목 이름·모양 ─────

// RD.SN에 없는 국내 종목 이름(원본 XN)
const XN: Record<string, string> = {
  '042700': '한미반도체',
  '058470': '리노공업',
  '240810': '원익IPS',
  '055550': '신한지주',
  '033780': 'KT&G',
  '017670': 'SK텔레콤',
  '012330': '현대모비스',
  '204320': 'HL만도',
  '018880': '한온시스템'
}
export const nameOf = (c: string, picked: Record<string, PickedProduct> = {}): string => picked[c]?.name || RD.SN[c] || XN[c] || c

export interface NmLab {
  code: string
  kn: boolean // 종목 라벨 컴포넌트로 보이는 종목(RD.KR·KR_ETF)
  name: string
  sector: string
  ic: string
  ini: string
}

export function labOf(c: string, picked: Record<string, PickedProduct> = {}): NmLab {
  const k = RD.KR[c] || RD.KR_ETF[c]
  const x = EXT_STOCK[c]
  const p = picked[c]
  if (p && !k) return { code: c, kn: false, name: p.name, sector: p.sector, ic: '#9AA4B2', ini: p.name.slice(0, 1) }
  return { code: c, kn: !!k, name: nameOf(c, picked), sector: k ? k[0] : x ? x[0] : '', ic: k ? k[1] : x ? x[1] : '#9AA4B2', ini: k ? k[2] : x ? x[2] : String(nameOf(c, picked))[0] }
}

// 위험 열 글자: '3 다소 높음'(등급이 없으면 '-')
export const gradeLabel = (grade: number | null | undefined): string => (grade == null ? '-' : grade + ' ' + GRADE_WORD[grade])

// 내 투자성향: 서버 값이 있으면 서버 값, 없으면(로그인 전 등) 화면 예시 값
export const profileOf = (t: Tendency | null) => {
  if (t && t.survey.available && t.survey.investorType && t.survey.allowedMinGrade != null) {
    return { prof: PROFILE_KEY[t.survey.investorType] ?? 'neutral', profL: t.survey.label ?? '', maxG: t.survey.allowedMinGrade + '등급까지', server: true }
  }
  const prof = RD.CUSTOMER.profile
  const allowL = F.allowedLabel(prof)
  return { prof, profL: RD.PROFILES[prof]?.label ?? '', maxG: (allowL.match(/\d+/) || ['-'])[0] + '등급까지', server: false }
}

// ───── 목표 비중 단계 ─────

export interface NmRow extends NmLab {
  v: string
  risk: string
  warn: boolean // 내 성향 밖
}

export const rowsOf = (w: Record<string, string>, picked: Record<string, PickedProduct>): NmRow[] =>
  Object.keys(w).map((c) => ({ ...labOf(c, picked), v: w[c], risk: gradeLabel(picked[c]?.grade ?? F.meta(c).grade), warn: picked[c]?.out === true }))

export const sumOf = (w: Record<string, string>): number => Object.keys(w).reduce((a, c) => a + pctInt(w[c]), 0)

// ───── 검사(서버 계산) ─────

export type CkPhase = 'before' | 'loading' | 'stale' | 'full' | 'error'

// 검사 단계: 구성이 바뀌면 이전 결과는 '이전 구성 기준'이 된다
export function phaseOf(chk: NmChk | null, w: Record<string, string>): CkPhase {
  if (!chk) return 'before'
  if (chk.phase === 'loading') return 'loading'
  if (chk.phase === 'error') return 'error'
  return chk.snap !== JSON.stringify(w) ? 'stale' : 'full'
}

// 서버에 보낼 구성(종목 id + 비중 %). 서버 정보가 없는 종목이 있으면 null
export function checkItemsOf(w: Record<string, string>, picked: Record<string, PickedProduct>): CheckRequestItem[] | null {
  const items: CheckRequestItem[] = []
  for (const c of Object.keys(w)) {
    const p = picked[c]
    if (!p) return null
    items.push({ domesticProductId: p.id, weight: pctInt(w[c]) })
  }
  return items
}

// ───── 살 금액 단계 ─────

export interface NmBuyRow {
  code: string
  name: string
  q: number
  a: number
  amt: string
}

export interface NmBuyCalc {
  amt: number
  rows: NmBuyRow[]
  fee: number
  total: number
  err: string
  ok: boolean
}

// 살 금액 × 목표 비중 ÷ 현재가를 내림해 종목별 주 수를 정한다. 현재가·요율은 서버 값이다
export function buyCalc(w: Record<string, string>, amtStr: string, cash: number, picked: Record<string, PickedProduct>, quotes: QuoteState, fees: OrderFees | null): NmBuyCalc {
  const amt = pctInt(amtStr)
  const rate = fees?.commissionRatePercent ?? 0
  const rows = Object.keys(w).map((c) => {
    const px = quotes.price[c] ?? 0
    const q = px ? Math.floor((amt * pctInt(w[c])) / 100 / px) : 0
    return { code: c, name: nameOf(c, picked), q, a: q * px, amt: F.won(q * px) }
  })
  const noPrice = Object.keys(w).filter((c) => !quotes.price[c])
  const fee = rows.reduce((a, r) => a + rateOf(r.a, rate), 0)
  const total = rows.reduce((a, r) => a + r.a, 0) + fee
  const err = quotes.loading || !fees
    ? '현재가를 불러오는 중이에요'
    : noPrice.length
      ? '현재가를 받지 못한 종목이 있어요(' + noPrice.map((c) => nameOf(c, picked)).join(', ') + '). 잠시 뒤 다시 시도하거나 [만들기만 하기]로 만들 수 있어요'
      : total > cash
        ? '주문 가능 금액(₩' + F.won(cash) + ')을 넘었어요'
        : ''
  return { amt, rows, fee, total, err, ok: total > 0 && !err }
}

// 확인한 시각 표시 'MM.DD HH:mm' — 날짜는 업무일, 시·분은 지금 시각
export function ackClock(): string {
  const d = new Date()
  return F.short(F.today()) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
