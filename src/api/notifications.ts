import { apiClient } from './client'
import type { ApiResponse } from './client'

export interface CustomerNotification {
  notificationId: number
  notificationType: string
  title: string
  content: string
  readAt: string | null
  createdAt: string
}

export async function fetchCustomerNotifications(): Promise<CustomerNotification[]> {
  const response = await apiClient.get<ApiResponse<CustomerNotification[]>>('/api/customer/notifications')
  return response.data.data
}

export async function markCustomerNotificationsRead(notificationIds: number[]): Promise<void> {
  await apiClient.patch('/api/customer/notifications/read', { notificationIds })
}

export function subscribeCustomerNotifications(onChanged: () => void, onConnected: () => void): () => void {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '')
  const url = new URL(`${base}/api/customer/notifications/stream`, window.location.origin).toString()
  let active = true
  let retry: ReturnType<typeof setTimeout> | undefined
  let events: EventSource
  const connect = () => {
    events = new EventSource(url, { withCredentials: true })
    events.addEventListener('notification-changed', () => { if (active) onChanged() })
    events.addEventListener('connected', () => { if (active) onConnected() })
    events.onerror = () => {
      if (!active || events.readyState !== EventSource.CLOSED) return
      events.close()
      retry = setTimeout(connect, 30_000)
    }
  }
  connect()
  return () => { active = false; clearTimeout(retry); events.close() }
}
