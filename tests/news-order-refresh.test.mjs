import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { NewsSummaryStore, summaryScope } from '../src/components/home/newsSummaryStore.ts'
import { NewsSummaryQueue } from '../src/components/home/NewsSummaryQueue.ts'

function load(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, {
    exports: module.exports, module, AbortController, DOMException,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency ${name}`)
      return dependencies[name]
    }
  })
  return module.exports
}

function harness() {
  let refreshes = 0
  let resolveOrder
  let rejectOrder
  const store = new NewsSummaryStore()
  const news = load('../src/components/home/newsPrefetch.ts', {
    '../../api/news': { newsApi: { briefing: async () => new Promise(() => {}) } },
    '../../lib/newsSessionEvents': {
      NEWS_AUTH_EXPIRED: 'auth-expired',
      notifyNewsContextChanged() { refreshes++ }
    },
    './newsSummaryStore': { newsSummaryStore: store, summaryScope },
    './NewsSummaryQueue': { NewsSummaryQueue }
  })
  news.initNewsSession()
  const api = load('../src/api/stockPackage.ts', {
    './client': { apiClient: {
      post: () => new Promise((resolve, reject) => { resolveOrder = resolve; rejectOrder = reject })
    } },
    '../components/home/newsPrefetch': news
  })
  news.prefetchNews(52)
  return {
    api, news,
    refreshes: () => refreshes,
    complete: orders => resolveOrder({ data: { data: { orders } } }),
    fail: error => rejectOrder(error)
  }
}

for (const side of ['BUY', 'SELL']) {
  test(`${side} execution clears old portfolio prefetch and requests news refresh after response`, async () => {
    const h = harness()
    const pending = h.api.placeOrder(1, { items: [{ side }], idempotencyKey: 'test' })
    assert.equal(h.refreshes(), 0)
    h.complete([{ status: 'EXECUTED', side }, { status: 'REJECTED', side }])
    const result = await pending
    assert.equal(result.orders.length, 2)
    assert.equal(h.refreshes(), 1)
    assert.equal(h.news.takePrefetchedBriefing(52), null)
  })
}

test('fully rejected orders preserve news prefetch without triggering refresh', async () => {
  const h = harness()
  const pending = h.api.placeOrder(1, { items: [], idempotencyKey: 'test' })
  h.complete([{ status: 'REJECTED', side: 'BUY' }])
  await pending
  assert.equal(h.refreshes(), 0)
  assert.ok(h.news.takePrefetchedBriefing(52))
  h.news.resetNewsSession()
})

test('failed order response preserves news state and propagates failure', async () => {
  const h = harness()
  const pending = h.api.placeOrder(1, { items: [], idempotencyKey: 'test' })
  const error = new Error('Order unavailable')
  h.fail(error)
  await assert.rejects(pending, error)
  assert.equal(h.refreshes(), 0)
  assert.ok(h.news.takePrefetchedBriefing(52))
  h.news.resetNewsSession()
})
