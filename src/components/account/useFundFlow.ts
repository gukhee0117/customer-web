import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { fetchFundFlowAllocation, fetchFundFlowMonthly, fetchFundFlowRelief, fetchFundFlowSummary, fetchFundFlowTransactions } from '../../api/fundFlow'
import type { FundFlowAllocation, FundFlowMonthly, FundFlowRelief, FundFlowSummary, FundFlowTransactions } from '../../api/fundFlow'
import { useBusinessDateVersion } from '../../lib/clock'

// live: 서버 값 / demo: 로그인 전이거나 계좌가 없어 시연 데이터 / error: 서버 오류로 시연 데이터 / loading: 받아오는 중
export type FundFlowSource = 'idle' | 'loading' | 'live' | 'demo' | 'error'

interface FundFlowState {
  source: FundFlowSource
  summary: FundFlowSummary | null
  monthly: FundFlowMonthly | null
  relief: FundFlowRelief | null
  allocation: FundFlowAllocation | null
  transactions: FundFlowTransactions | null
}

const NO_DATA = { summary: null, monthly: null, relief: null, allocation: null, transactions: null }
const IDLE: FundFlowState = { source: 'idle', ...NO_DATA }
const LOADING: FundFlowState = { source: 'loading', ...NO_DATA }

type Settled<T> = { ok: true; value: T } | { ok: false; unauthorized: boolean }

// 호출 실패를 "로그인 전(401)"과 "그 밖의 오류"로 나눠서 담는다
const settle = <T,>(p: Promise<T>): Promise<Settled<T>> =>
  p.then(
    (value) => ({ ok: true as const, value }),
    (err: unknown) => ({ ok: false as const, unauthorized: isAxiosError(err) && err.response?.status === 401 })
  )

// 내 자금 흐름 서버 값 — enabled일 때 한 번 받아온다.
// 서버 값이 섞여 보이지 않게, 하나라도 실패하면 모든 박스를 시연 데이터로 통일하고 source로 이유를 알려준다.
export function useFundFlow(enabled: boolean): FundFlowState {
  const [state, setState] = useState<FundFlowState | null>(null)
  const bizVer = useBusinessDateVersion()

  useEffect(() => {
    if (!enabled) return
    setState(null)
    let alive = true
    Promise.all([settle(fetchFundFlowSummary()), settle(fetchFundFlowMonthly()), settle(fetchFundFlowRelief()), settle(fetchFundFlowAllocation()), settle(fetchFundFlowTransactions())]).then(
      ([summary, monthly, relief, allocation, transactions]) => {
        if (!alive) return
        const failed = [summary, monthly, relief, allocation, transactions].filter((r) => !r.ok)
        if (failed.some((r) => !r.ok && !r.unauthorized)) {
          setState({ source: 'error', ...NO_DATA })
          return
        }
        // 401만 있으면 로그인 전, 계좌 없음(hasAccount=false)도 시연 데이터.
        // 박스마다 실제 값과 시연 데이터가 섞이지 않게, 하나라도 계좌가 없다고 하면 전체를 시연으로 통일한다
        if (!summary.ok || !monthly.ok || !relief.ok || !allocation.ok || !transactions.ok || !summary.value.hasAccount || !relief.value.hasAccount || !allocation.value.hasAccount || !transactions.value.hasAccount) {
          setState({ source: 'demo', ...NO_DATA })
          return
        }
        // 월별이 빈 배열이어도 실제 응답이므로 그대로 둔다(월별 박스가 빈 상태를 그린다)
        setState({ source: 'live', summary: summary.value, monthly: monthly.value, relief: relief.value, allocation: allocation.value, transactions: transactions.value })
      }
    )
    return () => {
      alive = false
    }
  }, [enabled, bizVer])

  if (!enabled) return IDLE
  return state ?? LOADING
}
