import { useCallback, useEffect, useMemo, useState } from 'react'
import { getTickerRanking, getTickers } from '../../api/community'
import type { TickerRank } from '../../api/community'
import { fetchQuotes } from '../../api/stockPackage'
import { KR_ALL } from './communityData'
import { NO_QUOTE, PENDING_QUOTE } from './stocksContext'
import type { StockInfo, StockQuote, StocksValue } from './stocksContext'

const RANK_SIZE = 12
// 서버 시세 API는 종목을 하나씩 조회해 느리다(12종목에 약 27초). 작게 나눠 동시에 받아 먼저 온 것부터 보인다
const QUOTE_CHUNK = 4
export const DOMESTIC_CODE = /^[0-9A-Z]{6}$/

// 목업에 색이 있던 종목은 그 색, 나머지는 중립 색 + 이름 첫 글자
const toStock = (code: string, name: string): StockInfo => {
  const known = KR_ALL[code]
  return { code, name, ini: known ? known[2] : name.slice(0, 1), color: known ? known[1] : 'var(--color-gray-600)' }
}

interface Loaded {
  tries: number // 어느 시도의 결과인지(다시 시도할 때 구분)
  list: StockInfo[]
  rank: TickerRank[]
  failed: boolean
}

// 종목 목록·순위(서버)와 현재가·등락률(주식 패키지 시세 API). extra는 화면에 보이는 종목(선택·관심·최근 본)
export function useStocksData(extra: string[]): StocksValue {
  const [tries, setTries] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})

  useEffect(() => {
    let alive = true
    Promise.all([getTickers(), getTickerRanking(RANK_SIZE)]).then(
      ([tickers, rank]) => {
        if (!alive) return
        const list = tickers.filter((t) => t.market === 'DOMESTIC').map((t) => toStock(t.ticker, t.name))
        setLoaded({ tries, list, rank, failed: false })
      },
      () => alive && setLoaded({ tries, list: [], rank: [], failed: true })
    )
    return () => {
      alive = false
    }
  }, [tries])

  const current = loaded && loaded.tries === tries ? loaded : null
  const rankCodes = current?.rank.map((r) => r.ticker)
  const codeKey = useMemo(
    () => [...new Set([...(rankCodes ?? []), ...extra])].filter((c) => DOMESTIC_CODE.test(c)).sort().join(','),
    [rankCodes, extra]
  )

  useEffect(() => {
    if (!current || current.failed || !codeKey) return
    let alive = true
    const codes = codeKey.split(',')
    const chunks: string[][] = []
    for (let i = 0; i < codes.length; i += QUOTE_CHUNK) chunks.push(codes.slice(i, i + QUOTE_CHUNK))
    chunks.forEach((chunk) =>
      fetchQuotes(chunk).then(
        (parts) => {
          if (!alive) return
          const next: Record<string, StockQuote> = {}
          parts.forEach((q) => {
            const price = q.available ? q.price : null
            const prev = q.previousClose
            next[q.ticker] = { price, rate: price != null && prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null, pending: false }
          })
          setQuotes((old) => ({ ...old, ...next }))
        },
        () => alive && setQuotes((old) => ({ ...old, ...Object.fromEntries(chunk.map((c) => [c, NO_QUOTE])) }))
      )
    )
    return () => {
      alive = false
    }
    // ponytail: 선택·관심 종목이 바뀌면 보이는 종목 전체를 다시 받는다. 종목이 많아지면 새로 생긴 코드만 받도록 줄일 것
  }, [current, codeKey])

  const retry = useCallback(() => {
    setTries((n) => n + 1)
  }, [])
  const byCode = useMemo(() => new Map((current?.list ?? []).map((s) => [s.code, s])), [current])

  return useMemo(
    () => ({
      status: !current ? 'loading' : current.failed ? 'error' : 'live',
      list: current?.list ?? [],
      rank: current?.rank ?? [],
      stock: (code) => byCode.get(code),
      quote: (code) => quotes[code] ?? (DOMESTIC_CODE.test(code) && current && !current.failed ? PENDING_QUOTE : NO_QUOTE),
      retry,
    }),
    [current, byCode, quotes, retry]
  )
}
