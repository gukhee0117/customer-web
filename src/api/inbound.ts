import { apiClient } from './client'

interface ApiResponse<T> {
  message: string
  data: T
}

export interface ForeignProduct {
  foreignProductId: number
  ticker: string
  name: string
}

export interface InboundCandidate {
  sourceGeneralAccountId: number
  accountNo: string
  brokerName: string
  /** 기준일(2025.12.23) 적격 수량 — 현재 일반계좌 잔고 아님 */
  snapshotQty: number
  /** 입고 승인 누계 − 출고 누계 (net) */
  alreadyApprovedQty: number
  /** 예상 입고 가능 수량 = snapshotQty − alreadyApprovedQty */
  estimatedAvailableQty: number
}

export interface InboundCandidatesResult {
  foreignProductId: number
  ticker: string
  name: string
  candidates: InboundCandidate[]
}

export interface InboundSubmitRequest {
  foreignProductId: number
  sourceGeneralAccountId: number
  requestedQty: string
}

export interface InboundSubmitResponse {
  inboundId: number
  ticker: string
  name: string
  requestedQty: number
  approvedQty: number
  partialReason: string | null
}

export async function getForeignProducts(): Promise<ForeignProduct[]> {
  const res = await apiClient.get<ApiResponse<ForeignProduct[]>>(
    '/api/customer/foreign-products',
  )
  return res.data.data
}

export async function getInboundCandidates(
  foreignProductId: number,
): Promise<InboundCandidate[]> {
  const res = await apiClient.get<ApiResponse<InboundCandidatesResult>>(
    '/api/customer/inbounds/candidates',
    { params: { foreignProductId } },
  )
  return res.data.data.candidates
}

export async function submitInbound(
  req: InboundSubmitRequest,
): Promise<InboundSubmitResponse> {
  const res = await apiClient.post<ApiResponse<InboundSubmitResponse>>(
    '/api/customer/inbounds',
    req,
  )
  return res.data.data
}

export interface InboundHistoryItem {
  inboundId: number
  foreignProductId: number
  ticker: string
  name: string
  requestedQty: number
  approvedQty: number
  processedAt: string // 입고 처리 시각(신청 즉시 처리라 신청일과 같다)
}

// 최근 순. 100건까지만 받는다(서버 size 상한)
export async function getInboundHistory(): Promise<InboundHistoryItem[]> {
  const res = await apiClient.get<ApiResponse<{ content: InboundHistoryItem[] }>>('/api/customer/inbounds', { params: { page: 0, size: 100 } })
  return res.data.data.content
}

export interface InboundDetailLot {
  inboundDetailId: number
  sourceBroker: string
  approvedQty: number
  currentQty: number
  purchaseDate: string
  purchasePrice: number
  purchaseCurrency: string
}

export interface InboundDetail {
  inboundId: number
  requestedQty: number
  approvedQty: number
  processedAt: string
  details: InboundDetailLot[]
}

export async function getInboundDetail(inboundId: number): Promise<InboundDetail> {
  const res = await apiClient.get<ApiResponse<InboundDetail>>(`/api/customer/inbounds/${inboundId}`)
  return res.data.data
}
