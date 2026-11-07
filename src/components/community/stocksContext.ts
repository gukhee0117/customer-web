import { createContext, useContext } from 'react'
import type { TickerRank } from '../../api/community'

export interface StockInfo {
  code: string
  name: string
  ini: string // 아이콘 글자
  color: string // 아이콘 배경색
}

// 시세를 못 받았으면 price·rate가 null(화면은 확인 불가). 아직 받는 중이면 pending. rate는 전일 종가 대비 %
export interface StockQuote {
  price: number | null
  rate: number | null
  pending: boolean
}

export interface StocksValue {
  status: 'loading' | 'live' | 'error'
  list: StockInfo[] // 국내 종목
  rank: TickerRank[] // 오늘 많이 이야기한 종목(서버 순위)
  stock: (code: string) => StockInfo | undefined
  quote: (code: string) => StockQuote
  retry: () => void
}

export const NO_QUOTE: StockQuote = { price: null, rate: null, pending: false }
export const PENDING_QUOTE: StockQuote = { price: null, rate: null, pending: true }

export const StocksContext = createContext<StocksValue>({
  status: 'loading',
  list: [],
  rank: [],
  stock: () => undefined,
  quote: () => NO_QUOTE,
  retry: () => {},
})

export const useStocks = () => useContext(StocksContext)

// 종목 이름. 서버 목록에 없으면 코드 그대로
export const stockName = (s: StocksValue, code: string): string => s.stock(code)?.name ?? code
