import { useCallback, useEffect, useRef, useState } from 'react'
import { newsApi, type Briefing } from '../../api/news'
import { apiErrorMessage } from '../../api/client'
import { NewsRequestGate } from './newsRequestGate'
import { takePrefetchedBriefing } from './newsPrefetch'
import { newsSummaryStore } from './newsSummaryStore'
import { NEWS_CONTEXT_CHANGED } from '../../lib/newsSessionEvents'

export function useNewsBriefing(customerId: number) {
  const gate = useRef(new NewsRequestGate())
  const [data, setData] = useState<Briefing | null>(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback((background = false) => {
    const ticket = gate.current.start(String(customerId))
    if (!background) { setPending(true); setData(null) }
    setError('')
    void (takePrefetchedBriefing(customerId, ticket.signal) ?? newsApi.briefing(ticket.signal)).then(result => {
      if (!ticket.current()) return
      if (result.customerId !== customerId) {
        newsSummaryStore.clear(); setData(null); setError('로그인 계정을 다시 확인해 주세요.'); return
      }
      setData(previous => {
        const signature = (data: Briefing) => JSON.stringify([data.customerId, data.investorType,
          data.personalizationStatus, data.selectionRuleVersion, data.contextVersion, data.summaryVersion, data.articles])
        return previous && signature(previous) === signature(result) ? previous : result
      })
    }).catch(e => {
      if (ticket.current()) setError(apiErrorMessage(e, '뉴스 브리핑을 불러오지 못했어요.'))
    }).finally(() => { if (ticket.current()) setPending(false) })
  }, [customerId])
  useEffect(() => {
    load()
    const current = gate.current
    return () => current.cancel()
  }, [load])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const refresh = () => load()
    const focus = () => load(true)
    window.addEventListener(NEWS_CONTEXT_CHANGED, refresh)
    window.addEventListener('focus', focus)
    return () => { window.removeEventListener(NEWS_CONTEXT_CHANGED, refresh); window.removeEventListener('focus', focus) }
  }, [load])
  return { data, pending, error, reload: () => load() }
}
