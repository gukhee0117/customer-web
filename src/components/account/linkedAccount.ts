import type { GeneralAccount } from '../../api/withdrawal'
import type { ServerState } from './useServerData'

const PRODUCT_NAME = 'Returns 일반계좌' // 서버는 계좌번호만 줘서 상품명은 고정

// 연결 일반계좌 한 줄: 받는 중·실패·없음·서버 값(여러 개면 첫 계좌 외 N개)
export function linkedAccountText(state: ServerState<GeneralAccount[]>): string {
  if (state.status === 'loading') return '…'
  if (state.status === 'error') return '불러오지 못했어요'
  if (state.status === 'none' || state.data.length === 0) return '-'
  const [first, ...rest] = state.data
  return `${PRODUCT_NAME} ${first.accountNo}` + (rest.length > 0 ? ` 외 ${rest.length}개` : '')
}
