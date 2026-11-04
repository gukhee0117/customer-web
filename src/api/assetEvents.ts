import { apiClient } from './client'

export type AssetConnection = 'connecting' | 'connected' | 'reconnecting'

const ERROR_REFRESH_COOLDOWN_MS = 30_000

export function subscribeAssetEvents(onChanged: () => void, onConnection: (status: AssetConnection) => void) {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '')
  const url = new URL(`${base}/api/customer/assets/events`, window.location.origin)
  const events = new EventSource(url.toString(), { withCredentials: true })
  let active = true
  let reconnecting = false
  let lastErrorRefreshAt = -Infinity
  onConnection('connecting')
  const refresh = () => { if (active) onChanged() }
  events.onopen = () => {
    if (!active) return
    onConnection('connected')
    // 최초 로드는 기존 요청이 담당하고 재연결 때 놓친 변경만 다시 확인한다.
    if (reconnecting) refresh()
    reconnecting = false
  }
  events.addEventListener('asset-changed', refresh)
  events.onerror = () => {
    if (!active) return
    reconnecting = true
    onConnection('reconnecting')
    const now = Date.now()
    if (now - lastErrorRefreshAt >= ERROR_REFRESH_COOLDOWN_MS) {
      lastErrorRefreshAt = now
      refresh() // 세션 만료 확인 요청도 반복 오류 시 30초에 한 번으로 제한한다.
    }
  }
  return () => {
    active = false
    events.removeEventListener('asset-changed', refresh)
    events.close()
  }
}
