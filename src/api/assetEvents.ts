import { apiClient } from './client'

export type AssetConnection = 'connecting' | 'connected' | 'reconnecting'

export function subscribeAssetEvents(onChanged: () => void, onConnection: (status: AssetConnection) => void) {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '')
  const url = new URL(`${base}/api/customer/assets/events`, window.location.origin)
  const events = new EventSource(url.toString(), { withCredentials: true })
  let active = true
  onConnection('connecting')
  const refresh = () => { if (active) onChanged() }
  events.onopen = () => { if (active) onConnection('connected') }
  events.addEventListener('connected', refresh)
  events.addEventListener('asset-changed', refresh)
  events.onerror = () => {
    if (!active) return
    onConnection('reconnecting')
    refresh() // 401이면 기존 브리핑 조회의 만료 처리로 로그인 화면에 이동한다.
  }
  return () => {
    active = false
    events.removeEventListener('connected', refresh)
    events.removeEventListener('asset-changed', refresh)
    events.close()
  }
}
