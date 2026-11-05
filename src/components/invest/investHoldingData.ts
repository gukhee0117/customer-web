// 위험등급 글자: 1 매우 높음 ~ 6 매우 낮음(서버 등급 번호를 화면 글자로)
export const GRADE_WORD: Record<number, string> = { 1: '매우 높음', 2: '높음', 3: '다소 높음', 4: '보통', 5: '낮음', 6: '매우 낮음' }

// ───── 주문 내역 ─────

export interface OrderView {
  id: string
  pkg: string
  time: string // 'MM.DD HH:mm'
  code: string
  side: 'buy' | 'sell'
  qty: number
  price: number
  status: 'done' | 'reject'
  name?: string // 서버 종목 이름(없으면 코드로 보여줌)
  reason?: string | null // 거부 사유 문장(서버가 준 사실 문장)
}
