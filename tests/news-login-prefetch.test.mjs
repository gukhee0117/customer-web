import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { NewsSummaryStore, summaryScope } from '../src/components/home/newsSummaryStore.ts'
import { NewsSummaryQueue } from '../src/components/home/NewsSummaryQueue.ts'
const tick = () => new Promise(resolve => setImmediate(resolve))
const article = { id: 'a', version: 'v1' }
const answer = { articleId: 'a', articleVersion: 'v1', origin: 'LIVE_LLM' }
const data = { customerId: 1, investorType: 'STABLE', personalizationStatus: 'ACTIVE', selectionRuleVersion: 'r1', contextVersion: 'c1', summaryVersion: 'p1', articles: [{ article }] }
function harness(api) {
  const source = readFileSync(new URL('../src/components/home/newsPrefetch.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const store = new NewsSummaryStore(); const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, AbortController, DOMException,
    require(name) {
      if (name.endsWith('/api/news')) return { newsApi: api }
      if (name === './newsSummaryStore') return { newsSummaryStore: store, summaryScope }
      if (name === './NewsSummaryQueue') return { NewsSummaryQueue }
      throw new Error(name)
    },
  })
  return { ...module.exports, store }
}

test('login and Home share one list and first summary request', async () => {
  let lists = 0, summaries = 0, resolve
  const h = harness({ briefing: async () => { lists++; return data }, summary: () => { summaries++; return new Promise(yes => { resolve = yes }) } })
  h.prefetchNews(1)
  const list = await h.takePrefetchedBriefing(1, new AbortController().signal)
  assert.equal(h.takePrefetchedBriefing(1), null)
  const first = h.takeFirstQueue(summaryScope(list))
  const cache = h.store.bind(summaryScope(list))
  const home = new NewsSummaryQueue([article], (a, signal) => first.request(a, signal), Date.now, cache)
  const response = home.request(article, new AbortController().signal)
  await tick(); assert.equal(lists, 1); assert.equal(summaries, 1)
  resolve(answer); await response
  home.dispose(); first.dispose(); h.resetNewsSession()
})

test('logout or reload ignores delayed briefing even when transport ignores abort', async () => {
  for (const mode of ['logout', 'reload']) {
    let resolve, signal, summaries = 0
    const h = harness({ briefing: s => { signal = s; return new Promise(yes => { resolve = yes }) }, summary: async () => { summaries++; return answer } })
    h.prefetchNews(1)
    const controller = new AbortController()
    const pending = h.takePrefetchedBriefing(1, controller.signal)
    const rejected = assert.rejects(pending, { name: 'AbortError' })
    if (mode === 'logout') h.resetNewsSession(); else controller.abort()
    assert.equal(signal.aborted, true)
    resolve(data); await rejected; await tick()
    assert.equal(summaries, 0)
  }
})

test('server-prepared first answer skips summary IO and rejects mismatched warmup scope', async () => {
  let summaries = 0
  const h = harness({ briefing: async () => ({ ...data, firstSummary: answer }), summary: async () => { summaries++; return answer } })
  h.prefetchNews(1); await h.takePrefetchedBriefing(1); await tick()
  assert.equal(summaries, 0)
  assert.ok(h.store.bind(summaryScope(data)).get(JSON.stringify(['a', 'v1'])))
  assert.equal(h.takeFirstQueue('different-profile'), null)
  h.resetNewsSession()
})
