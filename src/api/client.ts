import axios from 'axios'

function getXsrfToken(): string | undefined {
  const row = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('XSRF-TOKEN='))
  return row ? decodeURIComponent(row.slice('XSRF-TOKEN='.length)) : undefined
}

// 서버 응답 공통 모양
export interface ApiResponse<T> {
  message: string
  data: T
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:10000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const token = getXsrfToken()
    if (token) config.headers.set('X-XSRF-TOKEN', token)
  }
  return config
})

// 서버 오류 응답({message, code})의 문구. 없으면 기본 문구
export function apiErrorMessage(e: unknown, fallback: string): string {
  const message = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof message === 'string' ? message : fallback
}
