import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { getSellLimit } from '../../api/sellLimit'
import type { SellLimit } from '../../api/sellLimit'

// live: 서버 값 / none: 계좌가 없거나 개설 전·해지라 한도 없음 / error: 조회 실패(타사 매도액 조회 실패 포함) — 한도 영역만 실패 처리하고 다시 시도로 복구
export type SellLimitState = { status: 'loading' } | { status: 'live'; data: SellLimit } | { status: 'none' } | { status: 'error' }

const LOADING: SellLimitState = { status: 'loading' }
const NO_LIMIT_CODES = ['ACCOUNT_STATE_NOT_ALLOWED', 'ACCOUNT_NOT_FOUND']

// 내 매도 한도 서버 값 — 마운트 때 한 번 받고, retry로 다시 받는다
export function useSellLimit(): { state: SellLimitState; retry: () => void } {
  const [tries, setTries] = useState(0)
  const [result, setResult] = useState<{ tries: number; state: SellLimitState } | null>(null)

  useEffect(() => {
    let alive = true
    getSellLimit().then(
      (data) => alive && setResult({ tries, state: { status: 'live', data } }),
      (err: unknown) => {
        if (!alive) return
        const code = isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined
        setResult({ tries, state: code && NO_LIMIT_CODES.includes(code) ? { status: 'none' } : { status: 'error' } })
      }
    )
    return () => {
      alive = false
    }
  }, [tries])

  return { state: result?.tries === tries ? result.state : LOADING, retry: () => setTries((n) => n + 1) }
}
