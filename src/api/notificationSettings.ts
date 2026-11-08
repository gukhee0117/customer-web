import { apiClient } from './client'
import type { ApiResponse } from './client'

export interface NotificationSettings {
  push: boolean
  sms: boolean
  email: boolean
  settle: boolean
  band: boolean
}

export interface EmailVerification { verified: boolean; maskedEmail: string | null }
export interface EmailChallenge { maskedEmail: string; expiresAt: string; resendAvailableAt: string }
const verificationPath = '/api/customer/notification-email/verification'
export async function fetchEmailVerification(): Promise<EmailVerification> {
  return (await apiClient.get<ApiResponse<EmailVerification>>(verificationPath)).data.data
}
export async function sendEmailVerification(): Promise<EmailChallenge> {
  return (await apiClient.post<ApiResponse<EmailChallenge>>(verificationPath)).data.data
}
export async function confirmEmailVerification(code: string): Promise<EmailVerification> {
  return (await apiClient.post<ApiResponse<EmailVerification>>(verificationPath + '/confirm', { code })).data.data
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const response = await apiClient.get<ApiResponse<NotificationSettings>>('/api/customer/notification-settings')
  return response.data.data
}

export async function updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  const response = await apiClient.put<ApiResponse<NotificationSettings>>('/api/customer/notification-settings', settings)
  return response.data.data
}
