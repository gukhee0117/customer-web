import { apiClient } from './client'

export interface SettlementCompleted {
  batchId: number
  completedAt: string // 'YYYY-MM-DDTHH:mm:ss'
}

// 내 계좌의 정산 배치가 끝날 때마다 알려 주는 서버 푸시(SSE). 계좌가 없으면 서버가 4xx로 거부해 연결이 닫힌다
export function subscribeSettlementCompleted(onCompleted: (e: SettlementCompleted) => void): () => void {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '')
  const url = new URL(`${base}/api/customer/settlement/notifications`, window.location.origin)
  const events = new EventSource(url.toString(), { withCredentials: true })
  events.addEventListener('settlement-batch-completed', (e) => {
    try {
      onCompleted(JSON.parse((e as MessageEvent<string>).data) as SettlementCompleted)
    } catch {
      // 깨진 메시지는 건너뜀
    }
  })
  return () => events.close()
}
