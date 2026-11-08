import { apiClient } from './client'
import type { ApiResponse } from './client'

export interface NotificationSettings {
  push: boolean
  sms: boolean
  email: boolean
  settle: boolean
  band: boolean
  reply: boolean
  kiru: boolean
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const response = await apiClient.get<ApiResponse<NotificationSettings>>('/api/customer/notification-settings')
  return response.data.data
}

export async function updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  const response = await apiClient.put<ApiResponse<NotificationSettings>>('/api/customer/notification-settings', settings)
  return response.data.data
}