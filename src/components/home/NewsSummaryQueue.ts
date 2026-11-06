import type { Answer, Article } from '../../api/news'
import type { SummaryCachePort } from './newsSummaryStore'

type Loader = (article: Article, signal: AbortSignal) => Promise<Answer>
interface Job {
  key: string
  article: Article
  controller: AbortController
  promise: Promise<Answer>
  resolve: (answer: Answer) => void
  reject: (error: unknown) => void
  settled: boolean
}
function keyOf(article: Article) { return JSON.stringify([article.id, article.version]) }
function aborted() { return new DOMException('News request cancelled', 'AbortError') }

/** First summary has exclusive automatic priority; then prepare up to two at a time. */
export class NewsSummaryQueue {
  private readonly articles: Map<string, Article>
  private readonly loader: Loader
  private readonly now: () => number
  private readonly cache: SummaryCachePort
  private readonly localCache: Map<string, { answer: Answer; expiresAt: number }> | null
  private readonly jobs = new Map<string, Job>()
  private readonly active = new Set<Job>()
  private pending: Job[] = []
  private selectedKey = ''
  private initialKey: string | null = null
  private closed = false

  constructor(articles: Article[], loader: Loader, now: () => number = Date.now, cache?: SummaryCachePort) {
    this.localCache = cache ? null : new Map()
    this.cache = cache ?? this.localCache!
    this.articles = new Map(articles.map(article => [keyOf(article), article]))
    this.loader = loader
    this.now = now
  }

  get disposed() { return this.closed }

  select(article: Article) { this.selectedKey = keyOf(article); this.pump() }

  peek(article: Article): Answer | null {
    if (this.closed) return null
    const key = keyOf(article)
    const entry = this.cache.get(key)
    if (!entry) return null
    if (entry.expiresAt <= this.now()) { this.cache.delete(key); return null }
    // Keep the actual generation time; a prepared reply never becomes an AI reply.
    return { ...entry.answer, origin: entry.answer.origin === 'LIVE_LLM' ? 'CACHED_LLM' : entry.answer.origin }
  }

  prefetch(selected: Article) {
    if (this.closed) return
    this.selectedKey = keyOf(selected)
    if (!this.articles.has(this.selectedKey)) return
    this.initialKey = this.peek(selected) ? null : this.selectedKey
    for (const article of this.articles.values()) {
      if (!this.peek(article)) void this.ensure(article).promise.catch(() => {})
    }
    this.pump()
  }

  request(article: Article, signal: AbortSignal): Promise<Answer> {
    if (this.closed || signal.aborted) return Promise.reject(aborted())
    if (!this.articles.has(keyOf(article))) return Promise.reject(new Error('Article is outside this briefing'))
    this.selectedKey = keyOf(article)
    const ready = this.peek(article)
    if (ready) { this.pump(); return Promise.resolve(ready) }
    const job = this.ensure(article)
    this.pump()
    // Switching article unsubscribes this viewer. The shared prefetch job can still fill
    // this customer's cache, but can never update an unsubscribed or different-user view.
    return new Promise((resolve, reject) => {
      const cancel = () => { signal.removeEventListener('abort', cancel); reject(aborted()) }
      signal.addEventListener('abort', cancel, { once: true })
      job.promise.then(answer => {
        signal.removeEventListener('abort', cancel)
        if (signal.aborted || this.closed) reject(aborted())
        else resolve(answer)
      }, error => { signal.removeEventListener('abort', cancel); reject(error) })
    })
  }

  invalidate(article: Article) { this.cache.delete(keyOf(article)) }

  dispose() {
    if (this.closed) return
    this.closed = true
    for (const job of this.jobs.values()) {
      job.controller.abort()
      if (!job.settled) { job.settled = true; job.reject(aborted()) }
    }
    this.jobs.clear(); this.active.clear(); this.pending = []; this.localCache?.clear()
  }

  private ensure(article: Article): Job {
    const key = keyOf(article)
    const existing = this.jobs.get(key)
    if (existing) return existing
    let resolve!: (answer: Answer) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<Answer>((yes, no) => { resolve = yes; reject = no })
    const job = { key, article, controller: new AbortController(), promise, resolve, reject, settled: false }
    this.jobs.set(key, job); this.pending.push(job)
    return job
  }

  private pump() {
    if (this.closed) return
    while (this.active.size < 2 && this.pending.length) {
      let index = this.pending.findIndex(job => job.key === this.selectedKey)
      if (index < 0) {
        // Until the first summary settles, only an explicit article selection may start.
        if (this.initialKey !== null) return
        index = 0
      }
      const [job] = this.pending.splice(index, 1)
      this.active.add(job)
      void Promise.resolve().then(() => {
        if (this.closed || job.controller.signal.aborted) throw aborted()
        return this.loader(job.article, job.controller.signal)
      }).then(answer => {
        if (this.closed || job.controller.signal.aborted) throw aborted()
        if (answer.articleId !== job.article.id || answer.articleVersion !== job.article.version) {
          throw new Error('Summary article/version mismatch')
        }
        if (answer.origin !== 'PREPARED' || answer.preparedReason !== 'LLM_UNAVAILABLE') {
          this.cache.set(job.key, { answer, expiresAt: this.now() + 10 * 60_000 })
        }
        if (!job.settled) { job.settled = true; job.resolve(answer) }
      }).catch(error => {
        if (!job.settled) { job.settled = true; job.reject(error) }
      }).finally(() => {
        this.active.delete(job)
        if (job.key === this.initialKey) this.initialKey = null
        if (this.jobs.get(job.key) === job) this.jobs.delete(job.key)
        this.pump()
      })
    }
  }
}
