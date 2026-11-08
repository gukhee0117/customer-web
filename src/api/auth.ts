import { apiClient } from './client'
import type { ApiResponse } from './client'

export interface MeData {
  customerId: number
  loginId: string
  name: string
  expiresAt: string
}

export async function initCsrf(): Promise<void> {
  await apiClient.get('/api/customer/csrf')
}

export interface SignupChallenge {
  maskedEmail: string
  expiresAt: string
  resendAvailableAt: string
}

export async function login(loginId: string, password: string): Promise<MeData> {
  await initCsrf()
  const res = await apiClient.post<ApiResponse<MeData>>('/api/customer/auth/login', { loginId, password })
  await initCsrf()
  return res.data.data
}

export async function sendSignupCode(email: string): Promise<SignupChallenge> {
  await initCsrf()
  const res = await apiClient.post<ApiResponse<SignupChallenge>>('/api/customer/auth/signup/email', { email })
  return res.data.data
}

export async function verifySignupCode(code: string): Promise<void> {
  await apiClient.post('/api/customer/auth/signup/email/verify', { code })
}

export interface SignupBody {
  loginId: string
  password: string
  rrn: string // 숫자 13자리
  name: string
  birthDate: string // YYYY-MM-DD
  phone: string
  email: string
}

// 가입하면 서버가 바로 로그인 세션을 만든다. 성공 뒤에는 CSRF 쿠키가 지워지므로 다시 받아 둔다
export async function signup(body: SignupBody): Promise<MeData> {
  await initCsrf()
  const res = await apiClient.post<ApiResponse<MeData>>('/api/customer/auth/signup', body)
  await initCsrf()
  return res.data.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/api/customer/auth/logout')
  await initCsrf()
}

export async function extendSession(): Promise<MeData> {
  const res = await apiClient.post<ApiResponse<MeData>>('/api/customer/auth/extend')
  return res.data.data
}

export async function getMe(): Promise<MeData> {
  const res = await apiClient.get<ApiResponse<MeData>>('/api/customer/auth/me')
  return res.data.data
}
