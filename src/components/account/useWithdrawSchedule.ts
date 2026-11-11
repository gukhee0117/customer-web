import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { fetchFundFlowWithdrawalSchedule } from '../../api/fundFlow'
import type { FundFlowWithdrawalSchedule } from '../../api/fundFlow'
import { getWithdrawalAvailability } from '../../api/withdrawal'
import type { WithdrawalAvailability } from '../../api/withdrawal'
import { useBusinessDateVersion } from '../../lib/clock'

// live: 서버 값 / notOpened: 계좌가 개설되지 않아 availability가 오류 / demo: 로그인 전(401)이거나 계좌 없음 / error: 그 밖의 서버 오류 / loading: 받아오는 중
export type WithdrawScheduleSource = 'loading' | 'live' | 'notOpened' | 'demo' | 'error'

export interface WithdrawScheduleState {
  source: WithdrawScheduleSource
  schedule: FundFlowWithdrawalSchedule | null
  availability: WithdrawalAvailability | null
}

const status = (err: unknown) => (isAxiosError(err) ? err.response?.status : undefined)
const errorCode = (err: unknown) => (isAxiosError(err) ? (err.response?.data as { code?: string } | undefined)?.code : undefined)

// 계좌가 없거나 OPENED가 아니어서 availability가 거절하는 경우만 "미개설"로 본다(서버가 주는 에러 코드 기준)
const NOT_OPENED_CODES = ['ACCOUNT_NOT_FOUND', 'ACCOUNT_STATUS_NOT_WITHDRAWABLE', 'ACCOUNT_STATE_NOT_ALLOWED']

// 인출 가능 일정 카드 전용 데이터. 자금 흐름의 다른 박스와 따로 받아서, availability가 오류여도 이 카드만 안내 문구로 바뀌고 나머지는 그대로 보인다.
// 숫자 세 칸(지금 인출 가능·1년 유지 중·다음 인출 가능일)은 인출 신청 화면과 같은 availability 값을 그대로 쓴다.
export function useWithdrawSchedule(enabled: boolean): WithdrawScheduleState & { retry: () => void } {
  const [state, setState] = useState<WithdrawScheduleState | null>(null)
  const [tries, setTries] = useState(0)
  const bizVer = useBusinessDateVersion()
  const retry = () => {
    setState(null)
    setTries((n) => n + 1)
  }

  useEffect(() => {
    if (!enabled) return
    setState(null)
    let alive = true
    Promise.allSettled([fetchFundFlowWithdrawalSchedule(), getWithdrawalAvailability()]).then(([sch, av]) => {
      if (!alive) return
      const none = { schedule: null, availability: null }
      if (sch.status === 'rejected') {
        setState({ source: status(sch.reason) === 401 ? 'demo' : 'error', ...none })
        return
      }
      if (!sch.value.hasAccount) {
        setState({ source: 'demo', ...none })
        return
      }
      if (av.status === 'rejected') {
        // 개설된 계좌가 아니면 availability가 계좌 상태 코드로 거절한다 → 이 카드만 "계좌 개설이 완료되면…" 안내
        // 그 밖의 실패(500·타임아웃·네트워크 단절 등)는 error로 두어 다시 시도할 수 있게 한다
        const code = errorCode(av.reason)
        const source = status(av.reason) === 401 ? 'demo' : code && NOT_OPENED_CODES.includes(code) ? 'notOpened' : 'error'
        setState({ source, ...none })
        return
      }
      setState({ source: 'live', schedule: sch.value, availability: av.value })
    })
    return () => {
      alive = false
    }
  }, [enabled, tries, bizVer])

  if (!enabled) return { source: 'loading', schedule: null, availability: null, retry }
  return { ...(state ?? { source: 'loading', schedule: null, availability: null }), retry }
}
