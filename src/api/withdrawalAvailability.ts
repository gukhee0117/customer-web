import { apiClient } from './client'
import type { ApiResponse } from './client'

// 인출 가능 금액 — 원 단위. leftAmounts는 납입(매도 확정)건별 남은 원금이고, maturesAt(확정일 + 1년)이 지나야 불이익 없이 인출할 수 있다
export interface WithdrawalLeftAmount {
  finalAt: string
  maturesAt: string
  curAmount: number
  matured: boolean
}

export interface WithdrawalAvailability {
  cashAmount: number
  provisionalAmount: number
  requestableAmount: number
  earningsAmount: number
  withdrawableWithoutPenalty: number // 지금 불이익 없이 인출 가능한 금액
  immaturePrincipalAmount: number // 아직 1년이 안 지난 원금
  asOf: string
  leftAmounts: WithdrawalLeftAmount[]
}

export async function getWithdrawalAvailability(): Promise<WithdrawalAvailability> {
  const res = await apiClient.get<ApiResponse<WithdrawalAvailability>>('/api/customer/withdrawals/availability')
  return res.data.data
}
