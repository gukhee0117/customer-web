import { apiClient } from './client'
import type { ApiResponse } from './client'

// 매도 가이드 — 남은 한도 안에서 공제가 가장 커지는 매도 조합(예상치). 시세·환율 조회가 실패하면 그 통화 종목은 추천에서 빠지고 warnings에 사유가 온다
export interface SellGuideSummary {
  totalRecommendedSellAmount: number
  totalWeightedGain: number
  estimatedTaxWithRelief: number
  estimatedTaxWithoutRelief: number
  estimatedReliefEffect: number // 추천대로 팔 때 감면 효과(원). 감면 제외 계좌는 0
  taxNote: string
}

export interface SellGuide {
  remainingLimit: number
  currentWeight: number
  periodLabel: string
  expectedSettlementDate: string
  warnings: string[]
  summary: SellGuideSummary | null // 추천 종목이 하나도 없으면 null
}

export async function getSellGuide(): Promise<SellGuide> {
  const res = await apiClient.get<ApiResponse<SellGuide>>('/api/customer/sell-guide')
  return res.data.data
}
