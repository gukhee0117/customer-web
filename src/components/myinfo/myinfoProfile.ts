import { RETURNS_DATA as RD, serverState } from '../../data/returns'
import type { ProfileKey } from '../../data/returns'
import { F } from '../../lib/calc'
import type { InvestorStatus } from '../../api/investor'
import type { Tendency } from '../../api/stockPackage'

// 내 정보 — 프로필·거래로 본 성향 박스가 쓰는 값. 고객·진단·계좌는 서버 값을 담아 둔 RD.serverState(홈과 같은 값)에서 읽는다.

export interface AssessHistItem {
  date: string
  score: number
  profile: string
}

export interface ProfileView {
  label: string
  img: string
  done: boolean
  soon: boolean
  dLeft: number // 유효기간 마지막 날까지 남은 날(만료일을 모르면 999)
  noteOn: boolean
  note: string
  noteBtn: string
  date: string
  next: string
  score: number | null // 진단 이력이 없으면 null
  allowed: string
  warnOn: boolean
  warn: string
  warnRed: boolean
  hist: { date: string; label: string; score: number; cur: boolean }[]
}

const labelOf = (key: string, fallback: string): string => RD.PROFILES[key]?.label ?? fallback

// 서버 진단 상태: ok(유효) · expired(만료) · none(미진단)
export const assessState = (): string => serverState().assess || 'ok'

// 서버 투자성향. 미진단이면 기본 아바타 키('private')
export const profileKey = (): ProfileKey | 'private' => RD.CUSTOMER.profile

export const profileView = (stored: AssessHistItem[] | null, status: InvestorStatus | null): ProfileView => {
  const key = profileKey(), pf = RD.PROFILES[key], aSt = assessState()
  const hist = stored ?? []
  const last = hist[0]
  // 진단일·유효기간은 서버 값(없으면 이력의 최신 진단). 점수·이력은 서버 프로필의 assessmentHistory
  const date = status?.assessedAt ? status.assessedAt.slice(0, 10) : last?.date ?? ''
  const validUntil = status?.expiresAt ? F.addDays(status.expiresAt.slice(0, 10), -1) : date ? F.addDays(F.addMonths(date, 24), -1) : ''
  const dLeft = validUntil ? F.days(F.today(), validUntil) : 999
  return {
    label: aSt === 'none' ? '미진단' : pf.label,
    img: pf.img ?? 'assets/kkiru-avatar-private.png',
    done: aSt !== 'none',
    soon: aSt === 'ok' && dLeft >= 0 && dLeft <= 30,
    dLeft,
    noteOn: aSt === 'expired' || aSt === 'none',
    note: aSt === 'none' ? '아직 투자성향을 진단하지 않았어요. 진단하면 성향에 맞는 범위 안에서 추천을 받을 수 있어요.' : '투자성향 진단 유효기간(24개월)이 지났어요. 다시 진단하면 성향에 맞는 주식 패키지 후보 등 다양한 서비스를 계속 이용할 수 있어요.',
    noteBtn: aSt === 'none' ? '진단하기' : '다시 진단하기',
    date: date ? F.dot(date) : '',
    next: validUntil ? F.dot(validUntil) : '',
    score: last?.score ?? null,
    allowed: F.allowedLabel(key),
    warnOn: dLeft <= 90,
    warn: dLeft < 0 ? '유효기간이 지났어요 · 다시 진단해 주세요' : '유효기간 D-' + dLeft,
    warnRed: dLeft < 0,
    hist: hist.slice(0, 3).map((h, i) => ({ date: F.dot(h.date), label: labelOf(h.profile, pf.label), score: h.score, cur: i === 0 }))
  }
}

export interface TradeView {
  head: string
  rows: { k: string; v: string }[]
  desc: string
}

// 위험 → 안전 순서. 허용 최소 등급은 서버 InvestorRiskRange와 같은 표(RD.ALLOWED_GRADE)를 쓴다
const ORDER: ProfileKey[] = ['aggressive', 'active', 'neutral', 'stableSeek', 'stable']

// 거래 위험: 서버가 준 평균 매수 등급이 설문 성향이 허용하는 가장 위험한 등급(allowedMinGrade)보다 더 위험할 때(등급 숫자가 더 작을 때).
// 서버가 성향을 판정하지는 않으므로, 이 안내는 "다시 진단해 보시겠어요?"를 권하는 용도로만 쓴다(추천은 설문 투자성향 범위 안에서 하고, 거래 경향 기준으로도 볼 수 있다)
export const isTradeRisky = (t: Tendency | null): boolean =>
  !!t && t.survey.available && t.survey.allowedMinGrade != null && t.trading.available && t.trading.avgBuyGrade != null && t.trading.avgBuyGrade < t.survey.allowedMinGrade

// 거래로 본 경향(참고용). 서버 /stock-packages/tendency 값으로 만든다. 체결된 매수가 서버 기준(5건)보다 적으면 null(→ "거래가 쌓이면 보여드려요")
// 성향을 판정하지 않고, 평균 매수 등급을 담을 수 있는 가장 안전한 성향 범위를 사실로만 알려 준다
export const tradeViewOf = (t: Tendency): TradeView | null => {
  const tr = t.trading
  if (!tr.available || tr.avgBuyGrade == null) return null
  const g = tr.avgBuyGrade
  const range = [...ORDER].reverse().find((k) => RD.ALLOWED_GRADE[k].min <= g) ?? ORDER[0]
  const rows: [string, string][] = [['산 종목 위험등급 가중평균(매수 금액 기준)', g.toFixed(2) + '등급']]
  const out = t.comparison.available ? t.comparison.outOfRangeBuySharePercent : null
  if (out != null) rows.push(['설문 허용 범위 밖 종목 매수 비중', out + '%'])
  if (tr.topSector) rows.push(['매수 비중이 가장 큰 업종', tr.topSector.name + ' ' + tr.topSector.weight + '%'])
  if (tr.ordersPerMonth != null) rows.push(['월 평균 주문', tr.ordersPerMonth + '건'])
  const label = labelOf(range, '')
  const min = RD.ALLOWED_GRADE[range].min
  return {
    head: '평균 매수 등급은 ' + label + ' 범위(' + min + '등급부터)에 해당해요',
    rows: rows.map(([k, v]) => ({ k, v })),
    desc: '거래로 본 경향은 참고 정보이고 공식 투자성향이 아니에요.'
  }
}
