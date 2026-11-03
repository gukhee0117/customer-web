import { apiClient } from './client'

export interface MeData {
  customerId: number
  loginId: string
  name: string
  expiresAt: string
}

interface ApiResponse<T> {
  message: string
  data: T
}

export async function initCsrf(): Promise<void> {
  await apiClient.get('/api/customer/csrf')
}

export async function login(loginId: string, password: string): Promise<MeData> {
  await initCsrf()
  const res = await apiClient.post<ApiResponse<MeData>>('/api/customer/auth/login', {
    loginId,
    password,
  })
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
