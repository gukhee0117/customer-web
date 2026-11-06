import test from 'node:test'
import assert from 'node:assert/strict'
import { NewsSummaryQueue } from '../src/components/home/NewsSummaryQueue.ts'

const article = (id, version = 'v1') => ({ id, version })
const answer = a => ({ articleId: a.id, articleVersion: a.version, explanation: a.id, origin: 'LIVE_LLM', generatedAt: '2026-11-05T00:00:00Z' })
const tick = () => new Promise(resolve => setImmediate(resolve))
function io() {
  const calls = []
  return { calls, loader(a, signal) { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); calls.push({ a, signal, resolve, reject }); return promise } }
}

test('first summary loads alone, then two background articles load and queued clicks take priority', async () => {
  const articles = ['a', 'b', 'c', 'd', 'e'].map(id => article(id))
  const { calls, loader } = io(); const queue = new NewsSummaryQueue(articles, loader)
  queue.prefetch(articles[0]); await tick()
  assert.deepEqual(calls.map(c => c.a.id), ['a'])
  calls[0].resolve(answer(articles[0])); await tick()
  assert.deepEqual(calls.map(c => c.a.id), ['a', 'b', 'c'])
  const selected = queue.request(articles[4], new AbortController().signal)
  assert.equal(calls.length, 3)
  calls[1].resolve(answer(articles[1])); await tick()
  assert.deepEqual(calls.map(c => c.a.id), ['a', 'b', 'c', 'e'])
  calls[3].resolve(answer(articles[4])); await selected; await tick()
  assert.equal(calls[4].a.id, 'd')
  queue.dispose()
})

test('clicking an in-flight prefetch shares its request and a later click uses cache immediately', async () => {
  const a = article('a'), b = article('b'); const { calls, loader } = io()
  const queue = new NewsSummaryQueue([a, b], loader)
  queue.prefetch(a); await tick()
  calls[0].resolve(answer(a)); await tick()
  const selected = queue.request(b, new AbortController().signal)
  assert.equal(calls.length, 2)
  calls[1].resolve(answer(b)); assert.equal((await selected).origin, 'LIVE_LLM'); await tick()
  const cached = await queue.request(b, new AbortController().signal)
  assert.equal(cached.origin, 'CACHED_LLM')
  assert.equal(cached.generatedAt, answer(b).generatedAt)
  assert.equal(calls.length, 2)
  queue.dispose()
})

test('article unsubscription rejects the old viewer but never transfers that result to the new viewer', async () => {
  const a = article('a'), b = article('b'); const { calls, loader } = io()
  const queue = new NewsSummaryQueue([a, b], loader); queue.prefetch(a); await tick()
  const controller = new AbortController(); const previous = queue.request(a, controller.signal)
  const rejected = assert.rejects(previous, { name: 'AbortError' }); controller.abort(); await rejected
  const current = queue.request(b, new AbortController().signal)
  await tick()
  calls[0].resolve(answer(a)); calls[1].resolve(answer(b))
  assert.equal((await current).articleId, 'b')
  assert.equal(queue.peek(a).articleId, 'a')
  queue.dispose()
})

test('logout disposal aborts the running pair, drops queued work/cache and ignores late transports', async () => {
  const articles = ['a', 'b', 'c', 'd'].map(id => article(id)); const { calls, loader } = io()
  const queue = new NewsSummaryQueue(articles, loader); queue.prefetch(articles[0]); await tick()
  calls[0].resolve(answer(articles[0])); await tick()
  assert.equal(calls.length, 3)
  queue.dispose()
  assert.equal(calls.slice(1).every(c => c.signal.aborted), true)
  calls.slice(1).forEach(c => c.resolve(answer(c.a))); await tick()
  assert.equal(calls.length, 3)
  assert.equal(queue.peek(articles[0]), null)
  await assert.rejects(queue.request(articles[0], new AbortController().signal), { name: 'AbortError' })
})

test('bad article versions and background failures are not cached; explicit retry can succeed', async () => {
  const a = article('a'); const { calls, loader } = io(); const queue = new NewsSummaryQueue([a], loader)
  const first = queue.request(a, new AbortController().signal); const rejected = assert.rejects(first, /mismatch/)
  await tick(); calls[0].resolve(answer(article('a', 'old'))); await rejected; await tick()
  assert.equal(queue.peek(a), null)
  const retry = queue.request(a, new AbortController().signal); await tick()
  calls[1].resolve(answer(a)); assert.equal((await retry).articleId, 'a')
  queue.dispose()
})

test('prepared response identity survives cache; cache expires and is isolated between owners', async () => {
  const a = article('a'); let now = 0; let count = 0
  const load = async () => { count++; return { ...answer(a), origin: 'PREPARED', preparedReason: 'DEMO_DEFAULT', generatedAt: null } }
  const queue = new NewsSummaryQueue([a], load, () => now)
  await queue.request(a, new AbortController().signal); await tick()
  assert.equal(queue.peek(a).origin, 'PREPARED'); assert.equal(queue.peek(a).preparedReason, 'DEMO_DEFAULT')
  now = 600_001; assert.equal(queue.peek(a), null)
  await queue.request(a, new AbortController().signal); await tick()
  assert.equal(count, 2)
  const other = new NewsSummaryQueue([a], load, () => now)
  assert.equal(other.peek(a), null)
  queue.dispose(); other.dispose()
})

test('Strict Mode disposal before IO starts does not launch stale prefetch calls', async () => {
  const a = article('a'); let calls = 0
  const queue = new NewsSummaryQueue([a], async () => { calls++; return answer(a) })
  queue.prefetch(a); queue.dispose(); await tick()
  assert.equal(calls, 0)
})


test('LLM outage fallback is shown but not cached, so next selection retries generation', async () => {
  const a = article('a'); let count = 0
  const queue = new NewsSummaryQueue([a], async () => {
    count++
    return count === 1 ? { ...answer(a), origin: 'PREPARED', preparedReason: 'LLM_UNAVAILABLE' } : answer(a)
  })
  assert.equal((await queue.request(a, new AbortController().signal)).origin, 'PREPARED')
  await tick()
  assert.equal(queue.peek(a), null)
  assert.equal((await queue.request(a, new AbortController().signal)).origin, 'LIVE_LLM')
  assert.equal(count, 2)
  queue.dispose()
})


test('explicit selection before first response starts immediately without automatic background work', async () => {
  const articles = ['a', 'b', 'c'].map(id => article(id)); const { calls, loader } = io()
  const queue = new NewsSummaryQueue(articles, loader); queue.prefetch(articles[0]); await tick()
  const selected = queue.request(articles[2], new AbortController().signal); await tick()
  assert.deepEqual(calls.map(c => c.a.id), ['a', 'c'])
  calls[1].resolve(answer(articles[2])); await selected; await tick()
  assert.equal(calls.length, 2)
  calls[0].resolve(answer(articles[0])); await tick()
  assert.equal(calls[2].a.id, 'b')
  queue.dispose()
})

test('first-summary failure releases the remaining pair and never causes a prefetch deadlock', async () => {
  const articles = ['a', 'b', 'c'].map(id => article(id)); const { calls, loader } = io()
  const queue = new NewsSummaryQueue(articles, loader); queue.prefetch(articles[0]); await tick()
  calls[0].reject(new Error('offline')); await tick()
  assert.deepEqual(calls.map(c => c.a.id), ['a', 'b', 'c'])
  assert.equal(queue.peek(articles[0]), null)
  queue.dispose()
})
