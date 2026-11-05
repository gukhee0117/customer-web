import { apiClient } from './client'
import type { ApiResponse } from './client'

// 원 단위. remainingLimit은 타사 RIA 매도까지 합친 5천만 원 상한이 반영된 값이라 limitAmount − usedAmount와 다를 수 있다 — 화면에서 직접 빼지 않는다
export interface SellLimit {
  limitAmount: number
  usedAmount: number
  remainingLimit: number
}

export async function getSellLimit(): Promise<SellLimit> {
  const res = await apiClient.get<ApiResponse<SellLimit>>('/api/customer/sell-limit')
  return res.data.data
}
