import { useEffect, useRef, useState } from 'react'
import { fetchPriceHistory } from '../../api/stockPackage'
import type { PriceHistory } from '../../api/stockPackage'

// 받지 못한 종목은 'failed', 아직 받는 중이면 키가 없다
export type PriceHistoryEntry = PriceHistory | 'failed'

export const HISTORY_DAYS = 30 // 한 번에 받는 영업일 수: 30일 차트용이고 20일 미니 차트는 뒤쪽 20개를 쓴다

// 오늘의 종목 화면에서만 쓰는 종가 이력. 종목 코드별로 한 번만 받아 이 화면이 열려 있는 동안 캐시한다(필터·추천 기준을 바꿔도 이미 받은 종목은 다시 받지 않는다).
// useRecommendations에 넣지 않은 이유: 홈의 추천 박스도 그 훅을 써서, 거기까지 이력 요청이 늘어나지 않게 하려는 것이다
export function usePriceHistory(tickers: string[]): Record<string, PriceHistoryEntry> {
  const [store, setStore] = useState<Record<string, PriceHistoryEntry>>({})
  const pending = useRef<Set<string>>(new Set()) // 요청 중인 종목(같은 종목을 겹쳐 요청하지 않는다)
  const mounted = useRef(true)
  const key = tickers.join(',')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const missing = (key ? key.split(',') : []).filter((t) => !(t in store) && !pending.current.has(t))
    if (missing.length === 0) return
    missing.forEach((t) => pending.current.add(t))
    const finish = (got: Record<string, PriceHistoryEntry>) => {
      missing.forEach((t) => pending.current.delete(t))
      if (mounted.current) setStore((prev) => ({ ...prev, ...got }))
    }
    fetchPriceHistory(missing, HISTORY_DAYS).then(
      (list) => {
        const got: Record<string, PriceHistoryEntry> = Object.fromEntries(missing.map((t) => [t, 'failed' as const]))
        list.forEach((h) => {
          if (h.available && h.points.length > 0) got[h.ticker] = h
        })
        finish(got)
      },
      () => finish(Object.fromEntries(missing.map((t) => [t, 'failed' as const])))
    )
  }, [key, store])

  return store
}
