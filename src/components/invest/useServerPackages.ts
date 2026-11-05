import { useCallback, useEffect, useState } from 'react'
import { fetchAllHoldings, fetchAllOrders, fetchOrderFees, fetchPackage, fetchPackages } from '../../api/stockPackage'
import type { OrderFees, PackageDetail } from '../../api/stockPackage'
import type { OrderView } from './investHoldingData'
import type { PkgView } from './investPkgLogic'
import { ordersFromServer, viewsFromServer } from './serverPkgLogic'
import { failState } from './useNewPkgData'
import type { LoadState } from './useNewPkgData'

export interface ServerPackages {
  state: LoadState
  views: PkgView[]
  orders: OrderView[]
  cash: number // 주문 가능 금액(예수금에서 가정산을 뺀 값). 계좌가 없으면 0
  reload: () => void
}

// 내 패키지(목록·담은 종목·보유·현재가)와 주문 내역을 서버에서 받아 온다.
// 현재가(KIS)는 보유 API가 한 번에 받아 오므로 패키지가 여러 개여도 시세 조회는 종목 합집합만큼이다.
export function useServerPackages(): ServerPackages {
  const [res, setRes] = useState<Omit<ServerPackages, 'reload'>>({ state: 'loading', views: [], orders: [], cash: 0 })
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const summaries = await fetchPackages()
        const [details, holdings, orders] = await Promise.all([
          Promise.all(summaries.map((s): Promise<PackageDetail> => fetchPackage(s.stockPackageId))),
          fetchAllHoldings(),
          fetchAllOrders()
        ])
        if (!alive) return
        setRes({
          state: 'ready',
          views: viewsFromServer(summaries, details, holdings),
          orders: ordersFromServer(orders),
          cash: holdings.find((h) => h.buyingPower != null)?.buyingPower ?? 0
        })
      } catch (err) {
        if (alive) setRes({ state: failState(err), views: [], orders: [], cash: 0 })
      }
    })()
    return () => {
      alive = false
    }
  }, [tick])

  return { ...res, reload }
}

// 오늘 기준 수수료율·증권거래세율(서버). 받기 전이거나 못 받으면 null
export function useOrderFees(): OrderFees | null {
  const [fees, setFees] = useState<OrderFees | null>(null)
  useEffect(() => {
    let alive = true
    fetchOrderFees().then(
      (f) => alive && setFees(f),
      () => undefined
    )
    return () => {
      alive = false
    }
  }, [])
  return fees
}
