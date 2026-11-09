// 커뮤니티 박스: 홈에만 있는 값 (글·순위는 커뮤니티 서버 API)

export const DEFAULT_STOCK = '000660' // 처음 열리는 종목
export const DEFAULT_RECENT = ['000660', '005930', '373220'] // 드롭다운 '최근 본 종목'
export const RECENT_LIMIT = 3


export type ChatTabKey = 'live' | 'hot' | 'mine'
export const CHAT_TABS: [ChatTabKey, string][] = [['live', '실시간'], ['hot', '인기글'], ['mine', '내가 쓴 댓글']]

export type HotScope = 'stock' | 'all'
export const HOT_SCOPES: [HotScope, string][] = [['stock', '이 종목'], ['all', '전체 종목']]
export const HOT_LIMIT = 7 // 인기글에 보이는 개수

export const LIVE_POLL_MS = 5000 // 실시간 탭이 새 글을 확인하는 주기

export const CHAT_EMPTY = '조건에 맞는 글이 없어요.'
export const CHAT_LOADING = '글을 불러오는 중이에요'
export const CHAT_ERROR = '글을 불러오지 못했어요. 잠시 후 다시 확인해 주세요'
export const DISCLAIMER = '끼루 AI는 정보를 안내하며 투자 판단은 고객님께 있어요 · 금액은 다른 계좌의 해외주식 순매수가 없다고 가정한 예시예요'
