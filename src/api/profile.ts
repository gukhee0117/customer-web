import { apiClient } from './client'
import type { ApiResponse } from './client'

export interface Profile {
  name: string
  birthDate: string // YYYY-MM-DD
  phone: string // 010-1234-5678 (원문, 마스킹은 화면에서)
  email: string | null
  nickname: string | null // 조회만 한다(서버가 가입 때 붙임, 시드 고객 중엔 없을 수 있음)
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
