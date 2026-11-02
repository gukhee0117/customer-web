import { apiClient } from './client'

// 내 자금 흐름 API (maria: /api/customer/fund-flow/**)
// 금액은 원 단위 숫자, 날짜는 'yyyy-MM-dd' 문자열로 내려옴. 로그인 세션(쿠키)이 필요해서 withCredentials를 켠다.
// TODO: 고객 로그인 연동 후 확인 — 세션 쿠키 방식이면 CORS(allowCredentials)도 서버에서 열려 있어야 함

export interface FundFlowSummary {
  asOfDate: string
  hasAccount: boolean
  soldForeignAmount: number | null
  krwInflowAmount: number | null
  domesticBuyAmount: number | null
  domesticBuyFeeAmount: number | null
  cashBalance: number | null
  reinvestRatio: number | null
  message: string
  basis: string
}

export interface FundFlowMonth {
  flowMonth: string
  foreignSellAmount: number | null
  krwInflowAmount: number | null
  domesticBuyAmount: number | null
  domesticSellAmount: number | null
  withdrawalAmount: number | null
  cashBalanceBegin: number | null
  cashBalanceEnd: number | null
  partial: boolean
}

export interface FundFlowMonthly {
  asOfDate: string
  months: FundFlowMonth[]
  basis: string
}

export interface FundFlowRelief {
  asOfDate: string
  hasAccount: boolean
  benefit: string | null
  statusCode: string | null
  statusLabel: string
  reliefAmount: number | null
  notice: string
}

export interface FundFlowBucket {
  label: string
  value: number
  share: number | null
}

export interface FundFlowAllocation {
  asOfDate: string
  hasAccount: boolean
  holdingsCost: number | null
  cashBalance: number | null
  totalValue: number | null
  buckets: FundFlowBucket[]
  sectors: FundFlowBucket[]
  basis: string
}

interface ApiResponse<T> {
  message: string
  data: T
}

const get = async <T>(path: string): Promise<T> => {
  const res = await apiClient.get<ApiResponse<T>>('/api/customer/fund-flow/' + path, { withCredentials: true })
  return res.data.data
}

export const fetchFundFlowSummary = () => get<FundFlowSummary>('summary')
export const fetchFundFlowMonthly = () => get<FundFlowMonthly>('monthly')
export const fetchFundFlowRelief = () => get<FundFlowRelief>('relief')
export const fetchFundFlowAllocation = () => get<FundFlowAllocation>('allocation')
