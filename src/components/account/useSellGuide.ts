import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { getSellGuide } from '../../api/sellGuide'
import type { SellGuide } from '../../api/sellGuide'

// live: 서버 값 / none: 계좌 없음·개설 전·해지 / error: 조회 실패 — 이 값을 쓰는 영역만 실패 처리하고 다시 시도로 복구
export type SellGuideState = { status: 'loading' } | { status: 'live'; data: SellGuide } | { status: 'none' } | { status: 'error' }

const LOADING: SellGuideState = { status: 'loading' }
const NO_GUIDE_CODES = ['ACCOUNT_STATE_NOT_ALLOWED', 'ACCOUNT_NOT_FOUND']

// 매도 가이드 서버 값 — 시세·추천 계산이 같이 돌아 무거우므로 페이지에서 한 번만 받아 쓰는 곳에 내려 준다
export function useSellGuide(): { state: SellGuideState; retry: () => void } {
  const [tries, setTries] = useState(0)
  const [result, setResult] = useState<{ tries: number; state: SellGuideState } | null>(null)

  useEffect(() => {
    let alive = true
    getSellGuide().then(
      (data) => alive && setResult({ tries, state: { status: 'live', data } }),
      (err: unknown) => {
        if (!alive) return
        const code = isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined
        setResult({ tries, state: code && NO_GUIDE_CODES.includes(code) ? { status: 'none' } : { status: 'error' } })
      }
    )
    return () => {
      alive = false
    }
  }, [tries])

  return { state: result?.tries === tries ? result.state : LOADING, retry: () => setTries((n) => n + 1) }
}
