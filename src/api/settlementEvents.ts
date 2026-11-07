import { apiClient } from './client'

export interface SettlementCompleted {
  batchId: number
  completedAt: string // 'YYYY-MM-DDTHH:mm:ss'
}

const RETRY_MS = 30_000

// 내 계좌의 정산 배치가 끝날 때마다 알려 주는 서버 푸시(SSE). 계좌가 없으면 서버가 4xx로 거부해 연결이 닫히고
// 브라우저는 다시 연결하지 않으므로, 닫힌 채로 있으면 30초마다 직접 다시 연결한다(그 사이 계좌가 열려도 받게)
export function subscribeSettlementCompleted(onCompleted: (e: SettlementCompleted) => void): () => void {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '')
  const url = new URL(`${base}/api/customer/settlement/notifications`, window.location.origin).toString()
  let events: EventSource | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let active = true
  const connect = () => {
    events = new EventSource(url, { withCredentials: true })
    events.addEventListener('settlement-batch-completed', (e) => {
      try {
        onCompleted(JSON.parse((e as MessageEvent<string>).data) as SettlementCompleted)
      } catch {
        // 깨진 메시지는 건너뜀
      }
    })
    events.onerror = () => {
      if (!active || events?.readyState !== EventSource.CLOSED) return // 연결 중이면 브라우저가 알아서 다시 연결한다
      events.close()
      retry = setTimeout(connect, RETRY_MS)
    }
  }
  connect()
  return () => {
    active = false
    clearTimeout(retry)
    events?.close()
  }
}
