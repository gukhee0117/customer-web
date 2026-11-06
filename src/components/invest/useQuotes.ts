import { useEffect, useState } from 'react'
import { fetchQuotes } from '../../api/stockPackage'
import { usePollTick } from '../common/usePollTick'

export interface QuoteState {
  loading: boolean
  price: Record<string, number | null> // 종목코드 → 현재가(받지 못했으면 null)
}

// 종목들의 현재가(서버). 5초마다, 종목 목록이 바뀌면 다시 받는다. enabled가 false면 받지 않는다
export function useQuotes(tickers: string[], enabled: boolean): QuoteState {
  const key = [...tickers].sort().join(',')
  const tick = usePollTick(5000, enabled && key !== '')
  const [res, setRes] = useState<{ key: string; price: Record<string, number | null> }>({ key: '', price: {} })

  useEffect(() => {
    if (!enabled || !key) return
    let alive = true
    const list = key.split(',')
    const chunks: string[][] = []
    for (let i = 0; i < list.length; i += 20) chunks.push(list.slice(i, i + 20))
    Promise.all(chunks.map((c) => fetchQuotes(c))).then(
      (parts) => {
        if (!alive) return
        const price: Record<string, number | null> = {}
        parts.flat().forEach((q) => {
          price[q.ticker] = q.available ? q.price : null
        })
        setRes({ key, price })
      },
      // 이미 받은 값이 있으면 일시 실패로 지우지 않는다
      () => alive && setRes((old) => (old.key === key ? old : { key, price: Object.fromEntries(list.map((t) => [t, null])) }))
    )
    return () => {
      alive = false
    }
  }, [key, enabled, tick])

  return { loading: enabled && key !== '' && res.key !== key, price: res.key === key ? res.price : {} }
}
