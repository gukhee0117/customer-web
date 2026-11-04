import { apiClient } from './client'

interface ApiResponse<T> {
  message: string
  data: T
}

export interface GeneralAccount {
  generalAccountId: number
  accountNo: string
}

export interface WithdrawalLeftAmount {
  finalAt: string
  maturesAt: string
  curAmount: number
  /** 서버 BusinessClockService 기준 판정값 — 프론트에서 재계산 금지 */
  matured: boolean
}

export interface WithdrawalAvailability {
  cashAmount: number
  provisionalAmount: number
  requestableAmount: number
  earningsAmount: number
  withdrawableWithoutPenalty: number
  immaturePrincipalAmount: number
  asOf: string
  leftAmounts: WithdrawalLeftAmount[]
}

export interface WithdrawalSubmitRequest {
  requestedAmount: number
  destinationGeneralAccountId: number
  earlyWithdrawalAgreed: boolean
}

export async function getGeneralAccounts(): Promise<GeneralAccount[]> {
  const res = await apiClient.get<ApiResponse<GeneralAccount[]>>(
    '/api/customer/general-accounts',
  )
  return res.data.data
}

export async function getWithdrawalAvailability(): Promise<WithdrawalAvailability> {
  const res = await apiClient.get<ApiResponse<WithdrawalAvailability>>(
    '/api/customer/withdrawals/availability',
  )
  return res.data.data
}

export async function submitWithdrawal(
  req: WithdrawalSubmitRequest,
): Promise<void> {
  await apiClient.post('/api/customer/withdrawals', req)
}
