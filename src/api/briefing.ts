import { apiClient, type ApiResponse } from './client'

export interface CustomerTaxBriefing {
  accountId: number
  current: {
    generalTax: number
    riaTax: number
    reliefAmount: number
  }
  expected: null
  calculatedAt: string
}

/** 아직 팔지 않은 보유분만 가정 매도한 결과. 현재 감면액 대비 추가분이 아니다. */
export interface CustomerExpectedTaxBriefing {
  generalTax: number
  riaTax: number
  reliefAmount: number
  additionalReliefAmount: null
  expectedFinalAt: string
  /** 잔량이 있는 입고 lot 수. 종목 수가 아니며 0일 때만 빈 보유분 판단에 사용한다. */
  holdingCount: number
}

export interface CustomerAssetBriefing {
  accountId: number
  cashAmount: number
  investmentCostAmount: number
  cumulativeInflowAmount: number
  investmentRatio: number | null
  domesticValuationAmount: number | null
  valuationProfit: number | null
  valuationReturnRate: number | null
  valuationPriceFrom: string | null
  valuationPriceTo: string | null
  packageDeviation: unknown | null
  monthlyPurchases: { month: string; buyAmount: number }[]
  unavailableFields: string[]
  calculatedAt: string
}

async function getData<T>(path: string): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(path)
  return response.data.data
}

export function getCustomerTaxBriefing() {
  return getData<CustomerTaxBriefing>('/api/customer/tax/briefing')
}

export function getCustomerExpectedTaxBriefing() {
  return getData<CustomerExpectedTaxBriefing>('/api/customer/tax/briefing/expected-relief')
}

export function getCustomerAssetBriefing() {
  return getData<CustomerAssetBriefing>('/api/customer/assets/briefing')
}
