import { apiClient } from './client'
import type { ApiResponse } from './client'

export interface Profile {
  name: string
  birthDate: string // YYYY-MM-DD
  phone: string // 010-1234-5678 (원문, 마스킹은 화면에서)
  email: string | null
  nickname: string | null // 조회만 한다(서버가 가입 때 붙임, 시드 고객 중엔 없을 수 있음)
  totalScore: number | null // 최근 진단 점수(진단 전이면 null)
  investorTypePublic: boolean // 커뮤니티 글에 내 성향 이름을 보여 주는가
  assessmentHistory: { assessedAt: string; totalScore: number; investorType: string }[]
  account: ProfileAccount | null // RIA 계좌 없으면 null
}

export interface ProfileAccount {
  accountNo: string
  status: 'APPLIED' | 'OPENED' | 'REJECTED' | 'CLOSURE_REQUESTED' | 'CLOSED'
  openedAt: string | null // 개설 전이면 null
  appliedAt: string
}

export async function getProfile(): Promise<Profile> {
  const res = await apiClient.get<ApiResponse<Profile>>('/api/customer/profile')
  return res.data.data
}

// 보낸 것만 바뀐다. 이름·생년월일은 서버가 받지 않는다
export async function updateProfile(body: { phone?: string; email?: string }): Promise<Profile> {
  const res = await apiClient.patch<ApiResponse<Profile>>('/api/customer/profile', body)
  return res.data.data
}

// 현재 비밀번호가 틀리면 400(code CUSTOMER_PASSWORD_MISMATCH). 세션·CSRF 쿠키는 그대로다
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/api/customer/auth/password', { currentPassword, newPassword })
}

// 성향 공개 저장. 켜고 끈 값이 그대로 저장된다
export async function setInvestorTypePublic(value: boolean): Promise<void> {
  await apiClient.put('/api/customer/profile/investor-type-public', { investorTypePublic: value })
}
