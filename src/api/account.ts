import { apiClient } from './client'
import type { ApiResponse } from './client'
import type { ProfileAccount } from './profile'

export interface AccountApplication {
  accountId: number
  status: ProfileAccount['status']
  accountNo: string | null
  limitAmount: number
}

export async function getAccountAvailableLimit(): Promise<number> {
  const response = await apiClient.get<ApiResponse<number>>('/api/customer/account/available-limit')
  return response.data.data
}

export async function applyAccount(limitAmount: number): Promise<AccountApplication> {
  const response = await apiClient.post<ApiResponse<AccountApplication>>(
    '/api/customer/account/applications', { limitAmount },
  )
  return response.data.data
}
