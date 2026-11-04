import { RETURNS_DATA as RD, demo } from '../../data/returns'
import type { ProfileKey } from '../../data/returns'
import { F } from '../../lib/calc'
import type { InvestorStatus } from '../../api/investor'

// 내 정보 — 프로필·거래로 본 성향 박스가 쓰는 값. 고객·진단·계좌는 RD(홈과 같은 값), 시연 상태는 demo()에서 읽는다.

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

// 시연 성향 상태: ok(유효) · risky(거래가 성향보다 위험) · soon(만료 30일 이내) · expired(만료) · none(미진단)
export const assessState = (): string => demo().assess || 'ok'

export const profileKey = (): ProfileKey => RD.CUSTOMER.profile as ProfileKey

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
    img: pf.img ?? '',
    done: aSt !== 'none',
    soon: aSt === 'soon',
    noteOn: aSt === 'expired' || aSt === 'none',
    note: aSt === 'none' ? '아직 투자성향을 진단하지 않았어요. 진단하면 성향에 맞는 범위 안에서 추천을 받을 수 있어요.' : '투자성향 진단 유효기간(24개월)이 지났어요. 다시 진단하기 전까지는 추천과 주식 패키지 후보를 볼 수 없어요.',
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

const ORDER: ProfileKey[] = ['stable', 'stableSeek', 'neutral', 'active', 'aggressive']

// 거래로 본 성향(참고용): 최근 3개월 국내 매수 체결 기준. 체결 3건 미만이면 null(→ "거래가 쌓이면 보여드려요")
export const tradeView = (): TradeView | null => {
  const key = profileKey(), today = F.today(), from = F.addMonths(today, -3)
  const T = RD.DOMESTIC_TRADES.filter((t) => t.ok && t.date >= from && t.date <= today)
  if (T.length < 3) return null
  const tot = T.reduce((a, t) => a + t.amount, 0)
  let g = T.reduce((a, t) => a + (F.meta(t.code).grade ?? 0) * t.amount, 0) / tot
  const HS = RD.KR_HOLDINGS, ev = HS.reduce((a, h) => a + h.qty * RD.PX[h.code][0], 0) || 1
  const mxW = Math.max(0, ...HS.map((h) => h.qty * RD.PX[h.code][0])) / ev
  const days = new Set(T.map((t) => t.date)).size, first = T.map((t) => t.date).sort()[0]
  const perW = days / Math.max(1, F.days(first, today) / 7)
  let idx = g <= 1.5 ? 4 : g <= 2.5 ? 3 : g <= 3.5 ? 2 : g <= 4.5 ? 1 : 0
  if (mxW >= 0.35 && idx < 4) idx++
  if (assessState() === 'risky') {
    g = 1.4
    idx = 4
  }
  const tk = ORDER[idx], cur = labelOf(key, '')
  const rows: [string, string][] = [
    ['산 종목 위험등급 가중평균(최근 3개월 매수 금액 기준)', (Math.floor(g * 100 + 1e-9) / 100).toFixed(2) + '등급'],
    ['가장 큰 종목 비중', Math.round(mxW * 100) + '%'],
    ['거래 빈도', perW >= 1 ? '주 ' + Math.round(perW) + '회' : '주 1회 미만']
  ]
  return {
    head: '실제 거래는 ' + labelOf(tk, '') + '에 가까워요',
    rows: rows.map(([k, v]) => ({ k, v })),
    desc: tk === key ? '설문 결과(' + cur + ')와 비슷해요. 추천은 설문 결과 기준으로 해요.' : '설문 결과(' + cur + ')와 조금 달라요. 추천은 설문 결과 기준으로 해요. 투자 방식이 바뀌었다면 다시 진단해 보세요.'
  }
}
