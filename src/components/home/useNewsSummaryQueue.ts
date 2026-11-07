import { useEffect, useState } from 'react'
import { newsApi, type Briefing } from '../../api/news'
import { NewsSummaryQueue } from './NewsSummaryQueue'
import { newsSummaryStore, summaryScope, summaryArticleKey } from './newsSummaryStore'
import { takeFirstQueue } from './newsPrefetch'

export function useNewsSummaryQueue(customerId: number, data: Briefing | null) {
  const context = data?.customerId === customerId ? summaryScope(data) : null
  const scope = context && data ? JSON.stringify([context, data.articles.map(item => [item.article.id, item.article.version])]) : null
  const [owner, setOwner] = useState<{ scope: string; queue: NewsSummaryQueue } | null>(null)
  useEffect(() => {
    if (!scope || !context || !data) { setOwner(null); return }
    const articles = data.articles.map(item => item.article)
    const cache = newsSummaryStore.bind(context)
    const first = articles[0]
    const prepared = data.firstSummary
    if (first && prepared?.articleId === first.id && prepared.articleVersion === first.version) {
      cache.set(summaryArticleKey(first), { answer: prepared, expiresAt: Date.now() + 600_000 })
    }
    const prefetched = takeFirstQueue(context)
    // Share the login's first in-flight summary instead of starting another request.
    const loader = (article: typeof articles[number], signal: AbortSignal) =>
      prefetched && !prefetched.disposed && first && article.id === first.id && article.version === first.version
        ? prefetched.request(article, signal) : newsApi.summary(article, signal)
    const queue = new NewsSummaryQueue(articles, loader, Date.now, cache)
    const unregister = newsSummaryStore.onReset(() => { queue.dispose(); prefetched?.dispose() })
    setOwner({ scope, queue })
    if (first) queue.prefetch(first)
    return () => { unregister(); queue.dispose(); prefetched?.dispose() }
  }, [scope, data])
  return owner?.scope === scope && !owner.queue.disposed ? owner.queue : null
}
