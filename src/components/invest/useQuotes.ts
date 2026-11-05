import { useEffect, useState } from 'react'
import { fetchQuotes } from '../../api/stockPackage'

export interface QuoteState {
  loading: boolean
  price: Record<string, number | null> // 종목코드 → 현재가(받지 못했으면 null)
}

// 종목들의 현재가(서버). 종목 목록이 바뀌면 다시 받는다. enabled가 false면 받지 않는다
export function useQuotes(tickers: string[], enabled: boolean): QuoteState {
  const key = [...tickers].sort().join(',')
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
      () => alive && setRes({ key, price: Object.fromEntries(list.map((t) => [t, null])) })
    )
    return () => {
      alive = false
    }
  }, [key, enabled])

  return { loading: enabled && key !== '' && res.key !== key, price: res.key === key ? res.price : {} }
}
