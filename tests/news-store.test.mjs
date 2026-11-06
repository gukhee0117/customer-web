import test from 'node:test'
import assert from 'node:assert/strict'
import { NewsSummaryStore, summaryScope } from '../src/components/home/newsSummaryStore.ts'
import { NewsSummaryQueue } from '../src/components/home/NewsSummaryQueue.ts'
const tick = () => new Promise(resolve => setImmediate(resolve))
const a = { id: 'a', version: 'v1' }
const result = { articleId: 'a', articleVersion: 'v1', origin: 'LIVE_LLM', generatedAt: '2026-11-06T00:00:00Z' }
const data = (extra = {}) => ({ customerId: 1, investorType: 'STABLE', personalizationStatus: 'ACTIVE', selectionRuleVersion: 'r1', contextVersion: 'c1', summaryVersion: 'p1', articles: [], ...extra })

test('route disposal retains completed summary and returning queue performs no duplicate IO', async () => {
  const store = new NewsSummaryStore(); let calls = 0
  const loader = async () => { calls++; return result }
  const scope = summaryScope(data())
  const first = new NewsSummaryQueue([a], loader, Date.now, store.bind(scope))
  await first.request(a, new AbortController().signal); first.dispose()
  const returned = new NewsSummaryQueue([a], loader, Date.now, store.bind(scope))
  const answer = await returned.request(a, new AbortController().signal)
  assert.equal(calls, 1); assert.equal(answer.origin, 'CACHED_LLM'); assert.equal(answer.generatedAt, result.generatedAt)
  returned.dispose()
})

test('logout reset rejects old handles including same-account relogin and ignored abort', async () => {
  const store = new NewsSummaryStore(); const scope = summaryScope(data())
  const old = store.bind(scope); let resolve
  const queue = new NewsSummaryQueue([a], () => new Promise(yes => { resolve = yes }), Date.now, old)
  const unbind = store.onReset(() => queue.dispose())
  queue.prefetch(a); await tick(); store.clear()
  const current = store.bind(scope)
  resolve(result); await tick()
  old.set('late', { answer: result, expiresAt: Date.now() + 1000 })
  assert.equal(current.get('late'), undefined); assert.equal(queue.disposed, true)
  assert.equal(current.get(JSON.stringify(['a', 'v1'])), undefined)
  unbind()
})

test('customer, investor type, expiration, holdings and prompt version each isolate cached answers', () => {
  for (const change of [{ customerId: 2 }, { investorType: 'AGGRESSIVE' }, { personalizationStatus: 'EXPIRED' }, { contextVersion: 'c2' }, { summaryVersion: 'p2' }]) {
    const store = new NewsSummaryStore(); const old = store.bind(summaryScope(data()))
    old.set('a', { answer: result, expiresAt: Date.now() + 1000 })
    const next = store.bind(summaryScope(data(change)))
    assert.equal(next.get('a'), undefined)
    old.set('late', { answer: result, expiresAt: Date.now() + 1000 })
    assert.equal(next.get('late'), undefined)
  }
})

test('article-list reordering preserves summaries; article versions and TTL remain separate', async () => {
  let now = 0; const store = new NewsSummaryStore(); const cache = store.bind(summaryScope(data()), () => now)
  let calls = 0
  const loader = async article => { calls++; return { ...result, articleId: article.id, articleVersion: article.version } }
  const queue = new NewsSummaryQueue([a], loader, () => now, cache)
  await queue.request(a, new AbortController().signal); queue.dispose()
  const next = new NewsSummaryQueue([{ id: 'b', version: 'v1' }, a, { ...a, version: 'v2' }], loader, () => now, store.bind(summaryScope(data()), () => now))
  assert.equal(next.peek(a).origin, 'CACHED_LLM'); assert.equal(next.peek({ ...a, version: 'v2' }), null)
  now = 600_000
  assert.equal(next.peek(a), null)
  await next.request(a, new AbortController().signal); assert.equal(calls, 2); next.dispose()
})

test('cache bounds retained summaries instead of growing across repeated feed changes', () => {
  const store = new NewsSummaryStore(); const cache = store.bind('scope')
  for (let i = 0; i < 70; i++) cache.set(String(i), { answer: result, expiresAt: Date.now() + 1000 })
  assert.equal(cache.get('0'), undefined); assert.ok(cache.get('69'))
})
