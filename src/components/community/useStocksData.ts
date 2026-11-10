import { useCallback, useEffect, useMemo, useState } from 'react'
import { getTickerRanking, getTickers } from '../../api/community'
import type { TickerRank } from '../../api/community'
import { fetchQuotes } from '../../api/stockPackage'
import { usePollTick } from '../common/usePollTick'
import { KR_ALL } from './communityData'
import { NO_QUOTE, PENDING_QUOTE } from './stocksContext'
import type { StockInfo, StockQuote, StocksValue } from './stocksContext'

const RANK_SIZE = 12
// 서버 시세 API는 종목을 한 번에 조회한다(Task 3 이후). 20개씩 나눠 동시에 받는다
const QUOTE_CHUNK = 20
const QUOTE_REFRESH_MS = 3000

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
  const domesticCodes = useMemo(() => new Set(current?.list.map(stock => stock.code) ?? []), [current])
  const rankCodes = current?.rank.map((r) => r.ticker)
  const codeKey = useMemo(
    () => [...new Set([...(rankCodes ?? []), ...extra])].filter((c) => domesticCodes.has(c)).sort().join(','),
    [rankCodes, extra, domesticCodes]
  )

  const tick = usePollTick(QUOTE_REFRESH_MS, current != null && !current.failed)

  useEffect(() => {
    if (!current || current.failed || !codeKey) return
    // tick이 바뀌면 이 효과가 다시 돌아 3초마다 받는다. 이전 요청은 alive로 버려 늦게 온 응답이 새 값을 덮지 않는다
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
        // 이미 받은 값은 그대로 두고, 한 번도 받지 못한 종목만 "확인 불가"로 둔다
        () => alive && setQuotes((old) => ({ ...Object.fromEntries(chunk.map((c) => [c, NO_QUOTE])), ...old }))
      )
    )
    return () => {
      alive = false
    }
    // ponytail: 선택·관심 종목이 바뀌면 보이는 종목 전체를 다시 받는다. 종목이 많아지면 새로 생긴 코드만 받도록 줄일 것
  }, [current, codeKey, tick])

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
      quote: (code) => quotes[code] ?? (domesticCodes.has(code) && current && !current.failed ? PENDING_QUOTE : NO_QUOTE),
      retry,
    }),
    [current, byCode, quotes, retry, domesticCodes]
  )
}
