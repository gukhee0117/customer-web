import { useEffect, useState } from 'react'
import { fetchFundFlowAllocation, fetchFundFlowMonthly, fetchFundFlowRelief, fetchFundFlowSummary } from '../../api/fundFlow'
import type { FundFlowAllocation, FundFlowMonthly, FundFlowRelief, FundFlowSummary } from '../../api/fundFlow'

interface FundFlowState {
  summary: FundFlowSummary | null
  monthly: FundFlowMonthly | null
  relief: FundFlowRelief | null
  allocation: FundFlowAllocation | null
}

const EMPTY: FundFlowState = { summary: null, monthly: null, relief: null, allocation: null }

// 내 자금 흐름 서버 값 — enabled일 때 한 번 받아오고, 계좌가 없거나 호출이 실패하면 null(화면은 시연 데이터로 보임)
export function useFundFlow(enabled: boolean): FundFlowState {
  const [state, setState] = useState<FundFlowState>(EMPTY)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const ok = <T,>(p: Promise<T>) => p.catch(() => null)
    Promise.all([ok(fetchFundFlowSummary()), ok(fetchFundFlowMonthly()), ok(fetchFundFlowRelief()), ok(fetchFundFlowAllocation())]).then(([summary, monthly, relief, allocation]) => {
      if (!alive) return
      setState({
        summary: summary?.hasAccount ? summary : null,
        monthly: monthly && monthly.months.length > 0 ? monthly : null,
        relief: relief?.hasAccount ? relief : null,
        allocation: allocation?.hasAccount ? allocation : null
      })
    })
    return () => {
      alive = false
    }
  }, [enabled])

  return state
}
