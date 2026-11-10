import { useEffect, useRef, useState } from 'react'
import { addWatchlist, getWatchlist, removeWatchlist } from '../../api/community'
import { apiErrorMessage } from '../../api/client'

interface Props { customerId: number | null; checking?: boolean; onToast: (text: string, ticker?: string) => void }
interface State { owner: number | null; status: 'loading' | 'ready' | 'error'; watch: string[] }

export function useCommunityWatchlist({ customerId, checking = false, onToast }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<State>({ owner: null, status: 'loading', watch: [] })
  const epoch = useRef({ active: false, ready: false, pending: new Set<string>() })
  useEffect(() => {
    const request = { active: true, ready: false, pending: new Set<string>() }
    epoch.current = request
    if (customerId !== null) getWatchlist().then(
      watch => { if (request.active) { request.ready = true; setState({ owner: customerId, status: 'ready', watch }) } },
      () => { if (request.active) setState({ owner: customerId, status: 'error', watch: [] }) }
    )
    return () => { request.active = false }
  }, [customerId, attempt])

  const owned = state.owner === customerId
  const watch = owned ? state.watch : []
  const change = async (ticker: string, add: boolean) => {
    if (customerId === null) { onToast(checking ? '로그인 상태를 확인하고 있어요. 잠시 후 다시 시도해 주세요' : '로그인 후 관심종목을 설정할 수 있어요'); return }
    if (!owned || state.status !== 'ready') { onToast('관심종목 목록을 먼저 불러와 주세요'); return }
    const request = epoch.current
    if (!request.ready) { onToast('관심종목 목록을 먼저 불러와 주세요'); return }
    if (!request.active || request.pending.has(ticker) || watch.includes(ticker) === add) return
    request.pending.add(ticker)
    try {
      await (add ? addWatchlist(ticker) : removeWatchlist(ticker))
      if (!request.active) return
      setState(previous => ({ ...previous, watch: add
        ? previous.watch.includes(ticker) ? previous.watch : [...previous.watch, ticker]
        : previous.watch.filter(code => code !== ticker) }))
      onToast(add ? '관심 종목에 추가했어요' : '관심 종목에서 뺐어요', ticker)
    } catch (error) {
      if (!request.active) return
      try {
        const serverWatch = await getWatchlist()
        if (!request.active) return
        const saved = serverWatch.includes(ticker)
        // Reconcile only this ticker; another ticker may have completed while this read was pending.
        setState(previous => ({ ...previous, watch: saved
          ? previous.watch.includes(ticker) ? previous.watch : [...previous.watch, ticker]
          : previous.watch.filter(code => code !== ticker) }))
        onToast(saved === add ? '서버에서 관심종목 저장 결과를 확인했어요'
          : apiErrorMessage(error, '관심종목을 저장하지 못했어요. 다시 시도해 주세요'))
      } catch {
        if (!request.active) return
        request.ready = false
        setState(previous => ({ ...previous, status: 'error' }))
        onToast('저장 결과를 확인하지 못했어요. 관심종목 목록을 다시 불러와 주세요')
      }
    } finally {
      if (request.active) request.pending.delete(ticker)
    }
  }
  return { watch, failed: owned && state.status === 'error',
    retry: () => { setState({ owner: customerId, status: 'loading', watch: [] }); setAttempt(value => value + 1) },
    add: (ticker: string) => change(ticker, true),
    remove: (ticker: string) => change(ticker, false),
    toggle: (ticker: string) => change(ticker, !watch.includes(ticker)) }
}
