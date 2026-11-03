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

export interface InboundSubmitRequest {
  foreignProductId: number
  sourceGeneralAccountId: number
  /** 소수 4자리 검증된 수량 — 정밀도 보존을 위해 string 전송 */
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
  const res = await apiClient.get<ApiResponse<InboundCandidate[]>>(
    '/api/customer/inbounds/candidates',
    { params: { foreignProductId } },
  )
  return res.data.data
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
