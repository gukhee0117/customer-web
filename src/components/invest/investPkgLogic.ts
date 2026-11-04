
export type PkgSort = 'ret' | 'new'

export interface PkgItemView {
  pid: number // 서버 상품 ID(없으면 0)
  code: string // 종목코드(6자리)
  name: string
  qty: number
  avg: number // 평균 매입가(보유가 없으면 0)
  price: number | null // 현재가(받지 못했으면 null)
  chg: number // 전일 대비 등락률 %(현재가가 없으면 0)
  val: number // 평가금액(현재가가 없으면 0)
  cost: number
  today: number
  target: number // 목표 비중 %
  grade: number | null // 위험등급(1 가장 높은 위험 ~ 6 가장 낮은 위험), 없으면 null
  out: boolean | null // 내 성향 범위 밖 여부, 판단할 수 없으면 null
  ack: string | null // 성향 밖 종목을 확인한 날짜('YYYY-MM-DD'), 없으면 null
  priced: boolean // 현재가가 있어 평가에 들어갔는지
  taxable: boolean // 팔 때 증권거래세 대상인지(코스피·코스닥 주식)
}

// 패키지 한 개의 평가 결과 — 서버가 준 보유·현재가로 serverPkgLogic에서 만든다
export interface PkgView {
  id: string
  made?: string // 새로 만든 패키지의 만든 날 'YYYY.MM.DD'(없으면 예시 데이터의 만든 날)
  name: string
  total: number | null // 만들 때 입력한 총 투자금액(없으면 null)
  seed: number
  created: number // 클수록 최근에 만든 패키지
  items: PkgItemView[]
  val: number
  cost: number // 보유 전체 원금(현재가 없는 종목 포함)
  evalCost: number // 현재가를 받은 종목의 원금 — 평가손익·수익률은 val과 같은 범위(이 값)로만 계산한다
  pnl: number
  ret: number
  today: number
  todayPct: number
  grade: string
  unpriced: number // 보유했는데 현재가를 받지 못해 평가에 빠진 종목 수
}

// 부호 문자열(0은 빈 문자열)
export const sign = (n: number): string => (n > 0 ? '+' : n < 0 ? '-' : '')

// 값 부호에 따른 색 클래스 키(상승 up · 하락 down · 보합 flat)
export const toneOf = (n: number): 'up' | 'down' | 'flat' => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat')

// 가중평균 위험등급: 평가금액 가중(아직 하나도 사지 않았으면 목표 비중 가중), 소수 셋째 자리 이하 버림(원본 wAvg). 등급이 없는 종목은 뺀다
export function weightedGrade(items: PkgItemView[]): string {
  const graded = items.filter((i) => i.grade != null)
  const byValue = graded.some((i) => i.val > 0)
  const w = (i: PkgItemView) => (byValue ? i.val : i.target)
  const total = graded.reduce((a, i) => a + w(i), 0)
  if (!total) return '-'
  const sum = graded.reduce((a, i) => a + (i.grade ?? 0) * w(i), 0)
  return (Math.floor((sum / total) * 100) / 100).toFixed(2)
}

export function sortViews(views: PkgView[], sort: PkgSort): PkgView[] {
  return views.slice().sort(sort === 'ret' ? (a, b) => b.ret - a.ret : (a, b) => b.created - a.created)
}

// 패키지 자산 박스 합계(원본 as)
export function totalsOf(views: PkgView[]) {
  const val = views.reduce((a, v) => a + v.val, 0)
  const cost = views.reduce((a, v) => a + v.cost, 0)
  const evalCost = views.reduce((a, v) => a + v.evalCost, 0)
  const unpriced = views.reduce((a, v) => a + v.unpriced, 0)
  const today = views.reduce((a, v) => a + v.today, 0)
  return {
    val,
    cost,
    unpriced, // 0보다 크면 현재가를 못 받은 종목이 있어 평가금액·손익은 일부 종목만 반영한 값
    pnl: val - evalCost,
    ret: evalCost ? ((val - evalCost) / evalCost) * 100 : 0,
    today,
    todayPct: val - today ? (today / (val - today)) * 100 : 0
  }
}

// RD.KR·KR_ETF에 없는 국내 종목의 [업종, 대표색, 이니셜](원본 EXT) — 새 패키지 창의 종목 라벨이 쓴다
export const EXT_STOCK: Record<string, [string, string, string]> = {
  '042700': ['반도체', '#0B3D91', 'H'],
  '058470': ['반도체', '#1F6FB2', 'L'],
  '240810': ['반도체', '#00599C', 'W'],
  '055550': ['금융', '#0046FF', 'S'],
  '033780': ['음식료', '#C8102E', 'K'],
  '017670': ['통신', '#EA002C', 'SK'],
  '012330': ['자동차', '#002C5F', 'M'],
  '204320': ['자동차', '#00467F', 'HL'],
  '018880': ['자동차', '#E2231A', 'H']
}

// 목록 행의 겹친 종목 아이콘 3개 [대표색, 이니셜] — 종목 이름의 첫 글자를 쓴다(종목별 대표색은 서버에 없다)
export function iconsOf(v: PkgView): [string, string][] {
  return v.items.slice(0, 3).map((it): [string, string] => ['var(--color-navy)', String(it.name || it.code)[0]])
}

// 패키지 상세 윗부분(P-2) 표시용 값
export interface PkgDetailInfo {
  made: string // 만든 날 'YYYY.MM.DD'
  outCount: number // 내 성향 범위를 벗어난 종목 수
}

export function detailOf(v: PkgView): PkgDetailInfo {
  return { made: v.made ?? '-', outCount: v.items.filter((i) => i.out === true).length }
}
