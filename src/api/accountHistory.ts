import { apiClient } from './client'
import type { ApiResponse } from './client'

export interface SettlementItem {
  orderId: number
  ticker: string
  name: string
  sellQty: number
  provisionalAmount: number
  provisionalAt: string
  finalAmount: number | null // 확정 전 null
  finalAt: string // 가정산이어도 확정 예정일이 채워진다 — 확정 여부는 settlementStatus로 본다
  settlementStatus: 'PROVISIONAL' | 'FINALIZED'
}

export interface SellOrderItem {
  orderId: number
  inboundDetailId: number | null // 거부 건은 null일 수 있다
  ticker: string
  name: string
  sellQty: number
  orderAmount: number // 표시용 근사 금액 — 실제 정산금액은 정산 내역
  status: 'EXECUTED' | 'REJECTED'
  processedAt: string
}

export interface DomesticTradeItem {
  executedAt: string
  stockCode: string
  name: string | null // 종목 마스터에 없으면 null
  tradeType: string // BUY / SELL
  qty: number
  price: number
  amount: number
}

// ponytail: 첫 100건만 받는다(서버 size 상한) — 더 보려면 page 이어 받기
async function firstPage<T>(path: string): Promise<T[]> {
  const res = await apiClient.get<ApiResponse<{ content: T[] }>>(`/api/customer/${path}`, { params: { page: 0, size: 100 } })
  return res.data.data.content
}

export const getSettlements = () => firstPage<SettlementItem>('settlements')
export const getSellOrders = () => firstPage<SellOrderItem>('sell-orders')
export const getDomesticTrades = () => firstPage<DomesticTradeItem>('domestic-trades')
