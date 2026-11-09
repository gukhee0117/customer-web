import { F } from '../../lib/calc'
import { getBusinessToday } from '../../lib/clock'
import { ASSUME, BASIC_DED, LIMIT, MY, calc, confirmDate, man, won, withdrawDate, ymd, zoneLabel, zoneIndex } from './landingCalc'

// 마크업의 data-l / data-n 자리에 처음 들어가는 글자 — 원본의 paintNums / paintLate가 채우던 값
// (날짜는 모두 getBusinessToday() 기준)
export interface LandingTexts {
  l: Record<string, string>
  n: { A: string; Aman: string; remain: string; confirm: string }
  fly8: string // S8 "이번 구간 예상 절세액" 금액
  lkT: string // S9 잠금 화면 시각(원본처럼 열었을 때의 실제 시각)
  ruler: LandingRuler
}

export interface LandingRuler {
  today: number
  zones: { left: number; width: number; label: string; on: boolean }[]
  months: { left: number; mid: number; label: string }[]
}

const DAY = 864e5
const utc = (y: number, m: number, d: number): number => Date.UTC(y, m, d)

// S7 눈금자: 1년 전체 길이에서 각 날짜의 위치(%) — 원본 rul7in 생성 식 그대로
function buildRuler(today: string): LandingRuler {
  const [y, mo, d] = today.split('-').map(Number)
  const Y0 = utc(y, 0, 1)
  const YL = (utc(y + 1, 0, 1) - Y0) / DAY
  const dpos = (t: number): number => ((t - Y0) / DAY / YL) * 100
  const mstart = (m: number): number => dpos(utc(y, m, 1))
  const zi = zoneIndex(today)
  const zones = ([[0, 5, '100%'], [5, 7, '80%'], [7, 12, '50%']] as const).map(([a, b, label], i) => ({
    left: mstart(a), width: mstart(b) - mstart(a), label, on: i + 1 === zi,
  }))
  const months = Array.from({ length: 12 }, (_, m) => ({ left: mstart(m), mid: (mstart(m) + mstart(m + 1)) / 2, label: m + 1 + '월' }))
  return { today: dpos(utc(y, mo - 1, d)), zones, months }
}

// S5~S9 마크업의 data-l 자리 글자 — 원본 paintLate()의 값. 금액(A)·수익률(r)이 바뀔 때마다 다시 만든다(날짜는 getBusinessToday() 기준)
export function lateTexts(A: number, r: number, wOverride?: number): Record<string, string> {
  const today = getBusinessToday()
  const c = calc(A, r, today, wOverride)
  const rm = Math.max(0, LIMIT - A)
  const r1 = Math.round(rm * 0.375), r2 = Math.round(rm * 0.5) // 450:600:150, 합 = 남은 한도
  return {
    A: won(A), Aman: man(A), G: won(c.G), basic: '−' + won(BASIC_DED),
    dedLab: `RIA 공제(${Math.round(c.w * 100)}%)`, ded: '−' + won(c.G * c.w),
    base: won(Math.max(0, c.G - BASIC_DED - c.G * c.w)),
    gen: won(c.general), ria: won(c.ria), saveMan: man(c.save), rate: Math.round(c.w * 100) + '%',
    zone: zoneLabel(today), dday: 'D-' + F.days(today, F.bandEnd(today)), remainMan: man(LIMIT - A),
    R1: won(r1), R2: won(r2), R3: won(rm - r1 - r2),
    disc: F.kday(F.bizAdd(today, -3)), // 3영업일 전 공시(예시)
  }
}

export function buildLandingTexts(): LandingTexts {
  const c = calc()
  const A = MY.A
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0')
  const l: Record<string, string> = {
    conf: ymd(confirmDate()),
    wd: ymd(withdrawDate()),
    assume: ASSUME,
    ...lateTexts(A, MY.r),
    hold: '', // 원본에서는 이 값을 채우는 코드가 주석 안에 들어가 있어 비어 있다
  }
  return {
    l,
    n: { A: won(A), Aman: man(A), remain: won(c.remain), confirm: ymd(confirmDate()) },
    fly8: won(c.save),
    lkT: `${hh}:${mm}`,
    ruler: buildRuler(getBusinessToday()),
  }
}
