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
  // 시세 연동 전엔 null. 해외 평가액 0은 보유 없음, null은 시세 없음. 전일 대비 3개는 함께 null
  foreignHeldValuationAmount: number | null
  totalAssetAmount: number | null
  domesticDayChangeAmount: number | null
  domesticDayChangeRate: number | null // 백분율
  dayChangeBaseDate: string | null
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

export interface CustomerAssetHolding {
  ticker: string
  name: string
  sectorName: string | null // STOCK만
  status: 'HOLDING' | 'PARTIALLY_SOLD' | 'TRADE_RESTRICTED' | 'TRADE_SUSPENDED'
  qty: number
  sellableQty: number
  avgPurchasePrice: number
  purchaseAmount: number
  // 시세가 없으면 아래 5개가 null(0이 아니라 "모름") — 사유는 unavailableFields
  currentPrice: number | null
  evaluationAmount: number | null
  profit: number | null
  profitRate: number | null // 백분율
  riskGrade: number | null // 1 매우 높은 위험 ~ 6 매우 낮은 위험
  unavailableFields: string[]
}

export async function getAssetHoldings(): Promise<CustomerAssetHolding[]> {
  const res = await apiClient.get<ApiResponse<CustomerAssetHolding[]>>('/api/customer/assets/holdings')
  return res.data.data
}

export interface TaxBasisBand {
  validFrom: string // YYYY-MM-DD
  validTo: string
  weightRate: number // 0~1
  sellAmount: number
  gain: number
  externalNetBuy: number // 구간별 순매수 원금액(가중 전)
}

/** 호출마다 전체를 다시 계산한다 — 창을 열 때 한 번만 부르고, 스냅샷 기반 세액 박스 숫자와 섞어 비교하지 않는다. */
export interface CustomerTaxBasis {
  accountId: number
  benefit: 'POSSIBLE' | 'REDUCED' | 'IMPOSSIBLE' | null
  reliefExcluded: boolean // 혜택 취소 여부(adjustRatio 0만으로는 구분 못 함)
  basicDeduction: number
  generalTax: number
  weightedSell: number
  preAdjustDeduction: number
  weightedNetPurchase: number
  adjustRatio: number
  finalDeduction: number
  totalGain: number
  finalTax: number
  reliefAmount: number
  bands: TaxBasisBand[]
  calculatedAt: string
}

export function getCustomerTaxBasis() {
  return getData<CustomerTaxBasis>('/api/customer/tax/basis')
}
