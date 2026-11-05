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

export interface SellGuideLot {
  inboundDetailId: number
  availableQty: number
  purchasePriceKrw: number
  gainRate: number | null // 시세를 못 받으면 null
  recommendedQty: number
}

// 시세·환율을 못 받은 종목은 currentPriceKrw·effectiveGainRate가 null이고 추천에서 빠진다
export interface SellGuideProduct {
  foreignProductId: number
  ticker: string
  productName: string
  currency: string
  currentPriceKrw: number | null
  effectiveGainRate: number | null // 0~1
  recommendedQty: number
  expectedSellAmount: number
  expectedGain: number
  weightedGain: number
  recommended: boolean
  lots: SellGuideLot[]
}

export interface SellGuide {
  remainingLimit: number
  currentWeight: number
  periodLabel: string
  expectedSettlementDate: string
  warnings: string[]
  products: SellGuideProduct[] // 추천 종목 먼저, 차익률 높은 순
  summary: SellGuideSummary | null // 추천 종목이 하나도 없으면 null
}

export async function getSellGuide(): Promise<SellGuide> {
  const res = await apiClient.get<ApiResponse<SellGuide>>('/api/customer/sell-guide')
  return res.data.data
}

export interface SellOrderResult {
  status: 'EXECUTED' | 'REJECTED' // REJECTED는 한도 초과
  totalQty: number
  totalAmount: number
}

// 종목 하나 + 총수량. lot 선택은 서버가 FIFO로 한다. 여러 종목은 종목마다 따로 부른다
export async function placeSellOrder(foreignProductId: number, sellQty: number): Promise<SellOrderResult> {
  const res = await apiClient.post<ApiResponse<SellOrderResult>>('/api/customer/sell-orders', { foreignProductId, sellQty })
  return res.data.data
}
