import { useCallback, useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'

// live: 서버 값 / none: 서버가 "해당 없음" 코드를 준 경우(계좌 없음·개설 전·집계 전 등) / error: 조회 실패 — 이 값을 쓰는 영역만 실패 처리하고 retry로 복구
export type ServerState<T> = { status: 'loading' } | { status: 'live'; data: T } | { status: 'none' } | { status: 'error' }

const LOADING = { status: 'loading' } as const

// 계좌가 없거나 개설 전·집계 전이라 서버가 "해당 없음"으로 주는 오류 코드 — error가 아니라 none으로 본다
export const NO_DATA_CODES = ['ACCOUNT_NOT_FOUND', 'ACCOUNT_STATE_NOT_ALLOWED', 'TAX_SNAPSHOT_NOT_FOUND']

// 서버 값을 마운트 때 한 번 받고 retry로 다시 받는다. fetcher는 모듈 안에 있는 고정 함수여야 한다.
// noDataCodes: 오류 응답의 code가 이 중 하나면 error가 아니라 none으로 본다
// refresh: 화면을 loading으로 돌리지 않고 이전 값을 둔 채 조용히 다시 받는다(실패해도 이전 값 유지)
export function useServerData<T>(
  fetcher: () => Promise<T>,
  noDataCodes: string[] = [],
  enabled = true
): { state: ServerState<T>; retry: () => void; refresh: () => void } {
  const [tries, setTries] = useState(0)
  const [refreshes, setRefreshes] = useState(0)
  const quiet = useRef(false)
  const lastTries = useRef(0)
  const [result, setResult] = useState<{ tries: number; state: ServerState<T> } | null>(null)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    // retry와 refresh가 한 번에 배치되면 사용자가 누른 retry의 실패는 숨기지 않는다
    const silent = quiet.current && tries === lastTries.current
    quiet.current = false
    lastTries.current = tries
    fetcher().then(
      (data) => alive && setResult({ tries, state: { status: 'live', data } }),
      (err: unknown) => {
        if (!alive || silent) return
        const code = isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined
        setResult({ tries, state: code && noDataCodes.includes(code) ? { status: 'none' } : { status: 'error' } })
      }
    )
    return () => {
      alive = false
    }
    // fetcher·noDataCodes는 호출하는 쪽의 고정 값이라 다시 받기는 tries로만 일으킨다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries, refreshes, enabled])

  const refresh = useCallback(() => {
    quiet.current = true
    setRefreshes((n) => n + 1)
  }, [])

  return { state: result?.tries === tries ? result.state : LOADING, retry: () => setTries((n) => n + 1), refresh }
}
