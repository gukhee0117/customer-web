import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { NewsRequestGate } from '../src/components/home/newsRequestGate.ts'
import { NewsSummaryQueue } from '../src/components/home/NewsSummaryQueue.ts'
import { NewsSummaryStore, summaryScope, summaryArticleKey } from '../src/components/home/newsSummaryStore.ts'

// Executes the shipped hook functions with controlled state/effect scheduling and deferred IO.
// Browser layout is intentionally not simulated by this runner.
function harness(file, exportName, api) {
  const events = new Map()
  const window = { addEventListener: (name, handler) => events.set(name, handler), removeEventListener: name => events.delete(name) }
  const store = new NewsSummaryStore()
  const slots = []; let cursor = 0; let dirty = false; let effects = []; let props; let output
  function depsEqual(a, b) { return a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i])) }
  const react = {
    useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i] },
    useState(initial) {
      const i = cursor++; if (!slots[i]) slots[i] = { value: initial }
      return [slots[i].value, value => { const next = typeof value === 'function' ? value(slots[i].value) : value; if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true } }]
    },
    useLayoutEffect(fn, deps) {
      const i = cursor++; const old = slots[i]
      if (!old || !depsEqual(old.deps, deps)) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } })
    },
    useCallback(fn, deps) {
      const i = cursor++; if (!slots[i] || !depsEqual(slots[i].deps, deps)) slots[i] = { deps, value: fn }
      return slots[i].value
    },
  }
  const source = readFileSync(new URL(`../src/components/home/${file}.ts`, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, AbortController, window,
    require(name) {
      if (name === 'react') return react
      if (name.endsWith('/api/news')) return { newsApi: api }
      if (name.endsWith('/api/stockPackage')) return { fetchQuotes: api.fetchQuotes }
      if (name.endsWith('/api/client')) return { apiErrorMessage: (_, fallback) => fallback }
      if (name === './newsRequestGate') return { NewsRequestGate }
      if (name === './NewsSummaryQueue') return { NewsSummaryQueue }
      if (name === './newsSummaryStore') return { newsSummaryStore: store, summaryScope, summaryArticleKey }
      if (name === './newsPrefetch') return { takePrefetchedBriefing: () => null, takeFirstQueue: () => null }
      throw new Error(`Unexpected import ${name}`)
    },
  })
  function render(...next) {
    if (next.length) props = next
    for (let i = 0; i < 20; i++) {
      dirty = false; cursor = 0; output = module.exports[exportName](...props)
      const pending = effects; effects = []; pending.forEach(run => run())
      if (!dirty) return output
    }
    throw new Error('Render did not settle')
  }
  return { render, dispatch(name) { events.get(name)?.() }, unmount() { slots.forEach(slot => slot?.cleanup?.()) } }
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const tick = () => new Promise(resolve => setImmediate(resolve))
const article = id => ({ id, version: 'v1' })
const answer = id => ({ articleId: id, articleVersion: 'v1', explanation: `answer-${id}`, origin: 'LIVE_LLM' })

test('article switch aborts IO and ignores late summary even if transport ignores cancellation', async () => {
  const requests = []
  const h = harness('useNewsConversation', 'useNewsConversation', { summary(a, signal) { const d = deferred(); requests.push({ a, signal, ...d }); return d.promise } })
  h.render(1, article('a')); h.render(1, article('b'))
  assert.equal(requests[0].signal.aborted, true)
  requests[0].resolve(answer('a')); await tick()
  assert.equal(h.render().summary, null)
  requests[1].resolve(answer('b')); await tick()
  assert.equal(h.render().summary.articleId, 'b')
  h.unmount()
})

test('same-article customer replacement and logout reject previous answers', async () => {
  const requests = []
  const h = harness('useNewsConversation', 'useNewsConversation', { summary(a, signal) { const d = deferred(); requests.push({ signal, ...d }); return d.promise } })
  h.render(1, article('a')); h.render(2, article('a'))
  requests[0].resolve(answer('a')); await tick()
  assert.equal(h.render().summary, null)
  assert.equal(requests[0].signal.aborted, true)
  h.unmount()
  assert.equal(requests[1].signal.aborted, true)
  requests[1].resolve(answer('a')); await tick()
})

test('duplicate question is blocked synchronously and late question cannot cross articles', async () => {
  const requests = []
  const h = harness('useNewsConversation', 'useNewsConversation', {
    summary(a) { return Promise.resolve(answer(a.id)) },
    question(a, q, messages, signal) { const d = deferred(); requests.push({ a, messages, signal, ...d }); return d.promise },
  })
  h.render(1, article('a')); await tick(); const state = h.render()
  const first = state.ask('질문'); const duplicate = state.ask('중복')
  assert.equal(requests.length, 1)
  assert.equal(h.render().pendingText, '질문')
  await duplicate
  h.render(1, article('b'))
  assert.equal(requests[0].signal.aborted, true)
  requests[0].resolve(answer('a')); await first; await tick()
  assert.equal(h.render().turns.length, 0)
  assert.equal(h.render().pendingQuestion, false)
  assert.equal(h.render().pendingText, '')
  h.unmount()
})

test('response article/version mismatch is ignored and retry replaces failed request', async () => {
  const requests = []
  const h = harness('useNewsConversation', 'useNewsConversation', { summary() { const d = deferred(); requests.push(d); return d.promise } })
  h.render(1, article('a')); requests[0].resolve({ ...answer('a'), articleVersion: 'old' }); await tick()
  assert.equal(h.render().summary, null)
  h.render().retry(); h.render()
  requests[1].reject(new Error('offline')); await tick()
  assert.match(h.render().error, /불러오지/)
  h.unmount()
})

test('briefing reload and user change discard older success and failure', async () => {
  const requests = []
  const h = harness('useNewsBriefing', 'useNewsBriefing', { briefing(signal) { const d = deferred(); requests.push({ signal, ...d }); return d.promise } })
  h.render(1); h.render().reload(); h.render(2)
  assert.equal(requests[0].signal.aborted, true)
  assert.equal(requests[1].signal.aborted, true)
  requests[0].resolve({ customerId: 1 }); requests[1].reject(new Error('late failure')); await tick()
  assert.equal(h.render().data, null); assert.equal(h.render().error, '')
  requests[2].resolve({ customerId: 2, articles: [] }); await tick()
  assert.equal(h.render().data.customerId, 2)
  h.unmount()
})

test('standalone request gate cancellation and continuous requests invalidate all previous tickets', () => {
  const gate = new NewsRequestGate(); const a = gate.start('user1:a'); const b = gate.start('user1:a')
  assert.equal(a.current(), false); assert.equal(a.signal.aborted, true); assert.equal(b.current(), true)
  gate.cancel(); assert.equal(b.current(), false); assert.equal(b.signal.aborted, true)
})

test('API and UI origin labels distinguish live/cached/prepared responses', () => {
  const source = readFileSync(new URL('../src/api/news.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, require: () => ({ apiClient: {} }) })
  const label = module.exports.answerLabel
  assert.equal(label({ origin: 'PREPARED', preparedReason: 'POLICY_REFUSAL' }), '매매 조언 제한 안내')
  assert.equal(label({ origin: 'LIVE_LLM' }), 'AI가 지금 생성한 답변')
  assert.equal(label({ origin: 'CACHED_LLM' }), '이전에 AI가 생성한 답변')
  assert.equal(label({ origin: 'PREPARED', preparedReason: 'DEMO_DEFAULT' }), '시연용으로 준비한 설명')
  assert.match(label({ origin: 'PREPARED', preparedReason: 'LLM_UNAVAILABLE' }), /준비된 대체/)
})


test('prefetched summaries enter the real conversation hook without another API call', async () => {
  const a = article('a'), b = article('b'); let calls = 0
  const queue = new NewsSummaryQueue([a, b], async target => { calls++; return answer(target.id) })
  queue.prefetch(a); await tick()
  const h = harness('useNewsConversation', 'useNewsConversation', { summary() { throw new Error('Duplicate API call') } })
  assert.equal(h.render(1, b, queue).summary.articleId, 'b')
  assert.equal(h.render().summary.origin, 'CACHED_LLM')
  assert.equal(calls, 2)
  h.unmount(); queue.dispose()
})

test('summary queue owner cancels old user and list work when scope changes or logs out', async () => {
  const requests = []
  const h = harness('useNewsSummaryQueue', 'useNewsSummaryQueue', {
    summary(a, signal) { const d = deferred(); requests.push({ a, signal, ...d }); return d.promise },
  })
  const data = id => ({ customerId: id, investorType: 'STABLE', personalizationStatus: 'ACTIVE', selectionRuleVersion: 'v1', articles: [{ article: article('a') }, { article: article('b') }] })
  const previous = h.render(1, data(1)); await tick()
  const current = h.render(2, data(2)); await tick()
  assert.equal(previous.disposed, true)
  assert.equal(requests[0].signal.aborted, true)
  requests[0].resolve(answer('a')); await tick()
  assert.equal(current.peek(article('a')), null)
  h.render(2, null)
  assert.equal(current.disposed, true)
  assert.equal(requests.every(r => r.signal.aborted), true)
  h.unmount()
})


test('focus revalidates silently and preserves unchanged briefing identity and conversation owner', async () => {
  const requests = []
  const h = harness('useNewsBriefing', 'useNewsBriefing', { briefing(signal) { const d = deferred(); requests.push({ signal, ...d }); return d.promise } })
  const data = { customerId: 1, investorType: 'STABLE', personalizationStatus: 'ACTIVE', contextVersion: 'c1', summaryVersion: 'p1', articles: [] }
  h.render(1); requests[0].resolve(data); await tick()
  const previous = h.render().data
  h.dispatch('focus')
  assert.equal(h.render().pending, false); assert.equal(h.render().data, previous)
  requests[1].resolve({ ...data }); await tick()
  assert.equal(h.render().data, previous)
  h.dispatch('focus'); requests[2].resolve({ ...data, investorType: 'AGGRESSIVE', contextVersion: 'c2' }); await tick()
  assert.equal(h.render().data.investorType, 'AGGRESSIVE')
  h.unmount()
})

test('background response from another authenticated account removes previous-user news', async () => {
  const requests = []
  const h = harness('useNewsBriefing', 'useNewsBriefing', { briefing() { const d = deferred(); requests.push(d); return d.promise } })
  h.render(1); requests[0].resolve({ customerId: 1, articles: [] }); await tick(); h.render()
  h.dispatch('focus'); requests[1].resolve({ customerId: 2, articles: [] }); await tick()
  assert.equal(h.render().data, null); assert.ok(h.render().error)
  h.unmount()
})


test('article quote requests abort on switch and late prices never overwrite the selected stock', async () => {
  const requests = []
  const h = harness('useNewsStockQuotes', 'useNewsStockQuotes', { fetchQuotes(tickers, signal) { const d = deferred(); requests.push({ tickers, signal, ...d }); return d.promise } })
  h.render(['005930']); h.render(['000660'])
  assert.equal(requests[0].signal.aborted, true)
  requests[0].resolve([{ ticker: '005930', available: true, price: 100, previousClose: 90 }]); await tick()
  assert.equal(h.render().quotes['005930'], undefined)
  requests[1].resolve([{ ticker: '000660', available: true, price: 110, previousClose: 100 }]); await tick()
  assert.equal(h.render().quotes['000660'].price, 110)
  h.unmount(); assert.equal(requests[1].signal.aborted, true)
})

test('price lookup failure finishes loading and an empty article does not call quotes', async () => {
  let calls = 0
  const h = harness('useNewsStockQuotes', 'useNewsStockQuotes', { fetchQuotes() { calls++; return Promise.reject(new Error('offline')) } })
  h.render([]); assert.equal(calls, 0); assert.equal(h.render().pending, false)
  h.render(['005930']); await tick(); assert.equal(h.render().pending, false); assert.equal(Object.keys(h.render().quotes).length, 0)
  h.unmount()
})
