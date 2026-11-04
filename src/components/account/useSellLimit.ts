import { getSellLimit } from '../../api/sellLimit'
import type { SellLimit } from '../../api/sellLimit'
import { useServerData } from './useServerData'
import type { ServerState } from './useServerData'

export type SellLimitState = ServerState<SellLimit>

const NO_LIMIT_CODES = ['ACCOUNT_STATE_NOT_ALLOWED', 'ACCOUNT_NOT_FOUND']

// 내 매도 한도 서버 값 — 계좌가 없거나 개설 전·해지면 none(한도 없음)
export const useSellLimit = () => useServerData(getSellLimit, NO_LIMIT_CODES)
