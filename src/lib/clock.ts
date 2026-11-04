import { apiClient } from '../api/client'
import type { ApiResponse } from '../api/client'
import { MOCK_BUSINESS_TODAY } from '../data/businessDate'

// 서버 업무일 — 관리자가 옮길 수 있는 업무시계의 날짜. 받기 전이거나 서버가 꺼져 있으면 목업 값을 쓴다
let serverToday: string | null = null

// 업무일('YYYY-MM-DD') — 화면의 "오늘"은 브라우저 시계가 아니라 이 함수 한 곳에서만 가져온다.
export const getBusinessToday = (): string => serverToday ?? MOCK_BUSINESS_TODAY

// 서버 업무일을 받아 둔다. 실패하면 이전 값을 그대로 둔다. 화면에 쓰이던 날짜와 달라졌으면 true
export async function syncBusinessToday(): Promise<boolean> {
  try {
    const res = await apiClient.get<ApiResponse<string>>('/api/customer/business-date', { timeout: 2000 })
    const today = res.data.data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return false
    const changed = getBusinessToday() !== today // 화면에 실제로 쓰이던 값과 비교(첫 호출이 실패해 목업을 쓰던 경우 포함)
    serverToday = today
    return changed
  } catch {
    return false
  }
}

// 다른 창에서 관리자가 업무시계를 옮기면, 이 창으로 돌아올 때 다시 받아 날짜가 달라졌으면 새로고침한다.
// 가입 중(/login)이거나 창(설문 등)이 열려 있으면 입력이 날아가지 않게 확인 자체를 미룬다(다음에 돌아올 때 다시 확인)
export function reloadOnBusinessDateChange(): void {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return
    if (window.location.pathname === '/login' || document.querySelector('[role=dialog]')) return
    if (await syncBusinessToday()) window.location.reload()
  })
}
