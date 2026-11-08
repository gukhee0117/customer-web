import { useEffect, useState } from 'react'
import { fetchQuotes, fetchRecommendations } from '../../api/stockPackage'
import type { CandidateItem, RecommendBasis, RecommendFilter, RecommendItem, RecommendList } from '../../api/stockPackage'
import { failState } from './useNewPkgData'
import type { LoadState } from './useNewPkgData'

// 추천 종목의 현재가와 전일 대비(%). 시세를 받지 못했으면 null
export interface RecQuote {
  price: number
  chg: number
}

export interface RecommendationsRes {
  state: LoadState
  data: RecommendList | null
  quotes: Record<string, RecQuote | null> // 종목코드 → 시세(아직 받는 중이면 키 없음)
}

// 성향별 추천(서버)과 그 종목들의 현재가. 필터·개수가 바뀌면 다시 받는다
export function useRecommendations(filter: RecommendFilter, limit: number, basis: RecommendBasis): RecommendationsRes {
  const key = filter + ':' + limit + ':' + basis
  const [res, setRes] = useState<{ key: string; state: LoadState; data: RecommendList | null }>({ key: '', state: 'loading', data: null })
  const [q, setQ] = useState<{ key: string; quotes: Record<string, RecQuote | null> }>({ key: '', quotes: {} })

  useEffect(() => {
    let alive = true
    fetchRecommendations(filter, limit, basis).then(
      (data) => alive && setRes({ key, state: 'ready', data }),
      (err: unknown) => alive && setRes({ key, state: failState(err), data: null })
    )
    return () => {
      alive = false
    }
  }, [key, filter, limit, basis])

  const tickers = res.key === key && res.data ? res.data.items.map((i) => i.ticker) : []
  const tkey = tickers.join(',')
  useEffect(() => {
    if (!tkey) return
    let alive = true
    fetchQuotes(tkey.split(',')).then(
      (list) => {
        if (!alive) return
        const quotes: Record<string, RecQuote | null> = {}
        list.forEach((x) => {
          quotes[x.ticker] =
            x.available && x.price != null && x.previousClose ? { price: x.price, chg: ((x.price - x.previousClose) / x.previousClose) * 100 } : null
        })
        setQ({ key: tkey, quotes })
      },
      () => alive && setQ({ key: tkey, quotes: Object.fromEntries(tkey.split(',').map((t) => [t, null])) })
    )
    return () => {
      alive = false
    }
  }, [tkey])

  if (res.key !== key) return { state: 'loading', data: null, quotes: {} }
  return { state: res.state, data: res.data, quotes: q.key === tkey ? q.quotes : {} }
}

// 추천 종목을 패키지에 담는 흐름(후보 보기와 같은 담기 창)이 받는 모양으로 바꾼다. 설문 기준은 성향 범위 안 상품만 오고, 거래 기준은 범위 밖(outOfProfile)이 섞일 수 있어 담을 때 확인을 거친다
export const recToCandidate = (r: RecommendItem): CandidateItem => ({ ...r, selectable: true, unselectableReason: null })

// 설문 허용 등급 문구: 6등급이면 "6등급", 아니면 "5~6등급"처럼. 허용 등급이 없으면 빈 문구. 홈·오늘의 종목 화면이 함께 쓴다
export const allowedText = (min: number | null): string => (min == null ? '' : min === 6 ? '6등급' : min + '~6등급')
