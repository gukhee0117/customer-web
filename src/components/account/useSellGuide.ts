import { getSellGuide } from '../../api/sellGuide'
import type { SellGuide } from '../../api/sellGuide'
import { useServerData } from './useServerData'
import type { ServerState } from './useServerData'

export type SellGuideState = ServerState<SellGuide>

const NO_GUIDE_CODES = ['ACCOUNT_STATE_NOT_ALLOWED', 'ACCOUNT_NOT_FOUND']

// 매도 가이드 서버 값 — 시세·추천 계산이 같이 돌아 무거우므로 페이지에서 한 번만 받아 쓰는 곳에 내려 준다
export const useSellGuide = () => useServerData(getSellGuide, NO_GUIDE_CODES)
