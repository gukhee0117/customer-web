import { useEffect, useState } from 'react'
import { fetchQuotes, type Quote } from '../../api/stockPackage'

export function useNewsStockQuotes(tickers: string[]) {
  const key = JSON.stringify([...new Set(tickers)].sort())
  const [state, setState] = useState<{ key: string; quotes: Record<string, Quote>; pending: boolean } | null>(null)
  useEffect(() => {
    const requested: string[] = JSON.parse(key)
    const controller = new AbortController()
    let active = true
    setState({ key, quotes: {}, pending: requested.length > 0 })
    if (requested.length) {
      // Existing quote API accepts at most 20 tickers. One request per batch, not per answer bubble.
      const batches = []
      for (let i = 0; i < requested.length; i += 20) batches.push(requested.slice(i, i + 20))
      void Promise.all(batches.map(batch => fetchQuotes(batch, controller.signal))).then(rows => {
        if (!active || controller.signal.aborted) return
        const quotes = Object.fromEntries(rows.flat().filter(row => requested.includes(row.ticker)).map(row => [row.ticker, row]))
        setState({ key, quotes, pending: false })
      }).catch(() => { if (active && !controller.signal.aborted) setState({ key, quotes: {}, pending: false }) })
    }
    return () => { active = false; controller.abort() }
  }, [key])
  return state?.key === key ? state : { quotes: {}, pending: tickers.length > 0 }
}
