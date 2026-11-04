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

/** 확정 매도분 + 보유분 가정 매도를 합쳐 기본공제를 한 번 적용한 전체 예상 결과. */
export interface CustomerExpectedTaxBriefing {
  generalTax: number
  riaTax: number
  reliefAmount: number
  /** 예상 조회 시점의 확정 매도분 감면액. 일일 집계 값과 시점이 다를 수 있다. */
  finalizedReliefAmount: number
  /** 전체 감면액 - 확정 매도분 감면액. 손실 상계 등으로 음수가 될 수 있다. */
  additionalReliefAmount: number
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
