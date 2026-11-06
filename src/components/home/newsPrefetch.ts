import { newsApi, type Briefing } from '../../api/news'
import { newsSummaryStore, summaryScope } from './newsSummaryStore'
import { NewsSummaryQueue } from './NewsSummaryQueue'

let pending: { customerId: number; expiresAt: number; promise: Promise<Briefing>; controller: AbortController } | null = null
let firstQueue: NewsSummaryQueue | null = null
let firstScope = ''
newsSummaryStore.onReset(() => { pending?.controller.abort(); pending = null; firstQueue?.dispose(); firstQueue = null })

export function resetNewsSession() { newsSummaryStore.clear() }
export function invalidateNewsPersonalization() {
  resetNewsSession()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('news-context-changed'))
}

/** Runs after login/CSRF completion; login does not await news or LLM. */
export function prefetchNews(customerId: number) {
  pending?.controller.abort(); firstQueue?.dispose(); firstQueue = null
  const controller = new AbortController()
  const owner = { customerId, expiresAt: Date.now() + 30_000, controller, promise: null as unknown as Promise<Briefing> }
  pending = owner
  owner.promise = newsApi.briefing(controller.signal).then(data => {
    if (controller.signal.aborted || pending !== owner || data.customerId !== customerId) throw new DOMException('Cancelled', 'AbortError')
    const cache = newsSummaryStore.bind(summaryScope(data))
    const first = data.articles[0]?.article
    // Only first summary is warmed at login. Home retains its existing background queue.
    if (first) {
      if (data.firstSummary?.articleId === first.id && data.firstSummary.articleVersion === first.version) {
        cache.set(JSON.stringify([first.id, first.version]), { answer: data.firstSummary, expiresAt: Date.now() + 600_000 })
      } else {
        firstScope = summaryScope(data)
        firstQueue = new NewsSummaryQueue([first], newsApi.summary, Date.now, cache)
        firstQueue.prefetch(first)
      }
    }
    return data
  })
  void owner.promise.catch(() => { if (pending === owner) pending = null })
}

export function takePrefetchedBriefing(customerId: number, signal?: AbortSignal): Promise<Briefing> | null {
  const owner = pending
  if (!owner || owner.customerId !== customerId || owner.expiresAt <= Date.now() || owner.controller.signal.aborted) return null
  // Consume the list once; returning to Home always revalidates portfolio/profile.
  // Keep the owner until its request settles so the identity check above stays valid.
  owner.expiresAt = 0
  const cancel = () => owner.controller.abort()
  if (signal?.aborted) cancel()
  signal?.addEventListener('abort', cancel, { once: true })
  return owner.promise.finally(() => signal?.removeEventListener('abort', cancel))
}

export function takeFirstQueue(scope: string) {
  const queue = firstQueue; firstQueue = null
  if (scope !== firstScope) { queue?.dispose(); return null }
  return queue
}
