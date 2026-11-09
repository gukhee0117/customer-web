import { C } from '../../data/returns'
import { F } from '../../lib/calc'
import { getBusinessToday } from '../../lib/clock'

// 랜딩 "내 숫자" 계산 — 원본 landing-journey.html의 calc 식을 그대로 옮긴 랜딩 전용 예시 공식.
// 한도·기본공제·세율·공제 구간은 src/data의 값과 같아서 가져다 쓰고,
// "오늘"은 new Date()가 아니라 getBusinessToday() 한 곳에서만 가져온다.
export const LIMIT = C.SELL_LIMIT
export const BASIC_DED = C.BASIC_DEDUCTION
export const TAX = C.TAX_RATE

export const ASSUME = '다른 계좌의 해외주식 순매수가 없다고 가정한 예시이며, 실제 세액은 개인 거래 내역에 따라 달라집니다.'

// 슬라이더·수익률 버튼이 바꾸는 값(처음엔 3,000만 원 · 수익률 50%)
export const MY = { A: 30000000, r: 0.5 }

// 매도금액 A, 수익률 r → 양도차익
export const gainOf = (A: number, r: number): number => (A * r) / (1 + r)

export interface LandingCalc {
  G: number
  w: number
  general: number
  ria: number
  save: number
  remain: number
}

export function calc(A: number = MY.A, r: number = MY.r, today: string = getBusinessToday(), wOverride?: number): LandingCalc {
  const G = gainOf(A, r)
  const w = wOverride ?? F.band(today).rate
  const general = Math.max(0, G - BASIC_DED) * TAX
  const ria = Math.max(0, G - BASIC_DED - G * w) * TAX
  return { G, w, general, ria, save: general - ria, remain: LIMIT - A }
}

export const won = (n: number): string => '₩' + Math.round(n).toLocaleString('ko-KR')
export const man = (n: number): string => Math.round(n / 10000).toLocaleString('ko-KR') + '만 원'
export const ymd = (d: string): string => F.dot(d)
export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v))

// ===== 날짜(모두 getBusinessToday() 기준, 'YYYY-MM-DD') =====
export const confirmDate = (): string => F.bizAdd(getBusinessToday(), 2) // 매도 체결 후 2영업일째 원화 확정
export const withdrawDate = (): string => F.addYears(confirmDate(), 1) // 확정일 + 1년
export const zoneLabel = (today: string): string => {
  const b = F.band(today)
  return b.from + '~' + b.to + '월'
}
export const zoneIndex = (today: string): number => C.DEDUCTION_BANDS.indexOf(F.band(today)) + 1 // 1·2·3 (1~5월 / 6~7월 / 8~12월)
