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

// 마이데이터 조회 동의 여부. 동의해야 타사 RIA 한도를 조회하고 계좌를 개설할 수 있다
export async function getMydataConsent(): Promise<boolean> {
  const response = await apiClient.get<ApiResponse<boolean>>('/api/customer/account/mydata-consent')
  return response.data.data
}

export async function setMydataConsent(agreed: boolean): Promise<boolean> {
  const response = await apiClient.put<ApiResponse<boolean>>('/api/customer/account/mydata-consent', { agreed })
  return response.data.data
}

export async function applyAccount(limitAmount: number, mydataConsent: boolean): Promise<AccountApplication> {
  const response = await apiClient.post<ApiResponse<AccountApplication>>(
    '/api/customer/account/applications', { limitAmount, mydataConsent },
  )
  return response.data.data
}
