import type { PickedProduct } from './investNewPkgLogic'

// ───── 종목 추가 창 ─────
// 종목 후보는 서버(후보 보기)에서 받아온다. 후보는 조건으로 거른 사실 정보만이고, 추천·이유·순위는 없다

export interface AddState {
  q: string // 검색어
  pick: string | null // 담으려고 고른 종목(종목코드)
  pct: string // 목표 비중 입력
  adj: Record<string, string> | null // 합계가 100%를 넘을 때 종목별 비중 다시 맞추기
  info: Record<string, PickedProduct> // 이 창에서 고른 종목의 서버 정보(종목코드 기준)
}

export const emptyAdd = (): AddState => ({ q: '', pick: null, pct: '', adj: null, info: {} })

// 숫자만, 최대 3자리
export const cleanPct = (v: string): string => v.replace(/\D/g, '').slice(0, 3)
export const pctInt = (v: string | undefined): number => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0
