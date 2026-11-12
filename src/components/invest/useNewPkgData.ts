import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { fetchTendency, fetchThemes, searchCandidates } from '../../api/stockPackage'
import type { CandidateItem, CandidateList, CandidateRequest, Tendency } from '../../api/stockPackage'

// loading: 받아오는 중 / ready: 서버 값 / unauthorized: 로그인 전(401) / error: 그 밖의 서버 오류
export type LoadState = 'loading' | 'ready' | 'unauthorized' | 'error'

export const failState = (err: unknown): LoadState => (isAxiosError(err) && err.response?.status === 401 ? 'unauthorized' : 'error')

// 입력이 멈춘 뒤에야 값을 넘겨서, 글자를 칠 때마다 서버를 부르지 않게 한다
export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

// 고를 수 있는 테마 이름(서버 값). 불러오지 못하면 빈 목록
export function useThemes(): string[] {
  const [themes, setThemes] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    fetchThemes().then(
      (t) => alive && setThemes(t),
      () => undefined
    )
    return () => {
      alive = false
    }
  }, [])
  return themes
}

// 설문 투자성향(서버 값)
export function useTendency(): { state: LoadState; data: Tendency | null } {
  const [res, setRes] = useState<{ state: LoadState; data: Tendency | null }>({ state: 'loading', data: null })
  useEffect(() => {
    let alive = true
    fetchTendency().then(
      (data) => alive && setRes({ state: 'ready', data }),
      (err: unknown) => alive && setRes({ state: failState(err), data: null })
    )
    return () => {
      alive = false
    }
  }, [])
  return res
}

// 후보 목록: 조건이 바뀌면 다시 받아온다. 앞선 요청의 늦은 응답이 최신 응답을 덮어쓰지 않게 막는다
export function useCandidateList(req: CandidateRequest, enabled: boolean): { state: LoadState; data: CandidateList | null } {
  const key = JSON.stringify(req)
  const [res, setRes] = useState<{ key: string; state: LoadState; data: CandidateList | null }>({ key: '', state: 'loading', data: null })
  useEffect(() => {
    if (!enabled) return
    let alive = true
    searchCandidates(JSON.parse(key) as CandidateRequest).then(
      (data) => alive && setRes({ key, state: 'ready', data }),
      (err: unknown) => alive && setRes({ key, state: failState(err), data: null })
    )
    return () => {
      alive = false
    }
  }, [key, enabled])
  // 조건이 바뀐 직후(아직 응답 전)에는 이전 목록 대신 받아오는 중으로 본다
  if (!enabled || res.key !== key) return { state: 'loading', data: res.key === key ? res.data : null }
  return { state: res.state, data: res.data }
}

// 종목 이름·코드 검색(목표 비중 단계): 성향 밖 종목도 보여주되 표시한다. 상위 6개만 쓴다
export function useKeywordHits(keyword: string): { state: LoadState; items: CandidateItem[] } {
  const typed = keyword.trim()
  const q = useDebounced(typed, 300)
  const req: CandidateRequest = { keyword: q, includeOutOfProfile: true }
  const list = useCandidateList(req, q.length > 0)
  if (!typed) return { state: 'ready', items: [] }
  // 입력이 멈추기 전에는 "결과 없음"을 보이지 않도록 받아오는 중으로 본다
  if (q !== typed) return { state: 'loading', items: [] }
  return { state: list.state, items: list.data ? list.data.items.slice(0, 6) : [] }
}
