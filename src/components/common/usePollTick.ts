import { useEffect, useState } from 'react'

// ms마다 1씩 커지는 값. 이 값을 효과(useEffect)의 의존성에 넣으면 그 주기로 다시 받는다.
// 탭이 보이지 않을 때는 올리지 않아 요청을 건너뛴다.
export function usePollTick(ms: number, enabled = true): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      if (!document.hidden) setTick((n) => n + 1)
    }, ms)
    return () => clearInterval(id)
  }, [ms, enabled])
  return tick
}
