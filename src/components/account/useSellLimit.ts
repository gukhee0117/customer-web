import { getSellLimit } from '../../api/sellLimit'
import type { SellLimit } from '../../api/sellLimit'
import { NO_DATA_CODES, useServerData } from './useServerData'
import type { ServerState } from './useServerData'

export type SellLimitState = ServerState<SellLimit>

// 내 매도 한도 서버 값 — 계좌가 없거나 개설 전·해지면 none(한도 없음)
export const useSellLimit = () => useServerData(getSellLimit, NO_DATA_CODES)
