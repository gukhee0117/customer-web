import { RETURNS_DATA as RD, serverState } from '../../data/returns'
import type { ProfileKey } from '../../data/returns'
import { F } from '../../lib/calc'
import type { InvestorStatus } from '../../api/investor'

// 내 정보 — 프로필 박스가 쓰는 값. 고객·진단·계좌는 서버 값을 담아 둔 RD.serverState(홈과 같은 값)에서 읽는다.

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
