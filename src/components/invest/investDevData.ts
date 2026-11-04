// 주식 패키지 시연 설정에서만 쓰는 선택지. 이 화면 안에서만 유지하고 홈·내 계좌와 공유하지 않음

// 새 패키지 창 검사 결과를 실제 흐름 대신 보여 주는 상태. null이면 실제 흐름(서버 검사 결과)
// 서버 결과 자체(설명·지표)는 시연 값으로 바꾸지 않는다. 화면 상태(검사 전·검사 중·실패·이전 구성 기준)만 확인하는 용도
export type ChkDemo = 'before' | 'loading' | 'error' | 'stale'
export const CHK_DEMOS: [ChkDemo | null, string][] = [
  [null, '실제 흐름'],
  ['before', '검사 전'],
  ['loading', '검사 중'],
  ['error', '검사 실패'],
  ['stale', '이전 구성 기준']
]

// 다음 주문 한 번을 거부시키는 사유(원본 rejNext)
export type RejectReason = 'NOT_ELIGIBLE' | 'INSUFFICIENT_CASH' | 'INSUFFICIENT_QTY' | 'ACCOUNT_NOT_OPEN' | 'PRICE_UNAVAILABLE'
export const REJECT_REASONS: [RejectReason | null, string][] = [
  [null, '없음'],
  ['NOT_ELIGIBLE', 'NOT_ELIGIBLE'],
  ['INSUFFICIENT_CASH', 'INSUFFICIENT_CASH'],
  ['INSUFFICIENT_QTY', 'INSUFFICIENT_QTY'],
  ['ACCOUNT_NOT_OPEN', 'ACCOUNT_NOT_OPEN'],
  ['PRICE_UNAVAILABLE', 'PRICE_UNAVAILABLE']
]
