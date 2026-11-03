import axios from 'axios'

function getXsrfToken(): string | undefined {
  const row = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('XSRF-TOKEN='))
  return row ? decodeURIComponent(row.slice('XSRF-TOKEN='.length)) : undefined
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
