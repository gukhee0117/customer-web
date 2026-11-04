import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'

// live: 서버 값 / none: 서버가 "해당 없음" 코드를 준 경우(계좌 없음·개설 전·집계 전 등) / error: 조회 실패 — 이 값을 쓰는 영역만 실패 처리하고 retry로 복구
export type ServerState<T> = { status: 'loading' } | { status: 'live'; data: T } | { status: 'none' } | { status: 'error' }

const LOADING = { status: 'loading' } as const

// 서버 값을 마운트 때 한 번 받고 retry로 다시 받는다. fetcher는 모듈 안에 있는 고정 함수여야 한다.
// noDataCodes: 오류 응답의 code가 이 중 하나면 error가 아니라 none으로 본다
export function useServerData<T>(fetcher: () => Promise<T>, noDataCodes: string[] = []): { state: ServerState<T>; retry: () => void } {
  const [tries, setTries] = useState(0)
  const [result, setResult] = useState<{ tries: number; state: ServerState<T> } | null>(null)

  useEffect(() => {
    let alive = true
    fetcher().then(
      (data) => alive && setResult({ tries, state: { status: 'live', data } }),
      (err: unknown) => {
        if (!alive) return
        const code = isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined
        setResult({ tries, state: code && noDataCodes.includes(code) ? { status: 'none' } : { status: 'error' } })
      }
    )
    return () => {
      alive = false
    }
    // fetcher·noDataCodes는 호출하는 쪽의 고정 값이라 다시 받기는 tries로만 일으킨다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries])

  return { state: result?.tries === tries ? result.state : LOADING, retry: () => setTries((n) => n + 1) }
}
