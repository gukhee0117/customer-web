import { F } from '../../lib/calc'

// "거래 위험" 안내를 30일 동안 보지 않기 — 이 브라우저에 만료 날짜(업무일 기준)를 저장한다
const KEY = 'returns-risky-snooze'
const SNOOZE_DAYS = 30

export function isRiskySnoozed(): boolean {
  try {
    const until = localStorage.getItem(KEY)
    return !!until && F.today() <= until
  } catch {
    return false
  }
}

export function snoozeRisky(): void {
  try {
    localStorage.setItem(KEY, F.addDays(F.today(), SNOOZE_DAYS))
  } catch {
    // 저장소를 못 쓰면 이번만 숨김
  }
}
