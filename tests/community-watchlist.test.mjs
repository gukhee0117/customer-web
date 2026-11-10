import test from 'node:test'
import assert from 'node:assert/strict'
import { componentHarness } from './helpers/componentHarness.mjs'
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function harness(api = {}) {
  const toast = []; const calls = []; const props = { customerId: 51, onToast: text => toast.push(text) }
  const h = componentHarness('components/community/useCommunityWatchlist.ts', 'useCommunityWatchlist', props, name => {
    if (name.endsWith('/community')) return { getWatchlist: api.get ?? (async () => []), addWatchlist: async code => { calls.push(['add', code]); await api.add?.(code) }, removeWatchlist: async code => { calls.push(['remove', code]); await api.remove?.(code) } }
    if (name.endsWith('/client')) return { apiErrorMessage: (_, fallback) => fallback }
    throw new Error(name)
  })
  return { ...h, props, toast, calls, value: () => h.nodes()[0] }
}

test('loaded watchlist survives refresh and writes only update after server success', async () => {
  const saved = new Set(['005930']); const api = { get: async () => [...saved], add: async c => saved.add(c), remove: async c => saved.delete(c) }
  const h = harness(api); await h.flush()
  assert.deepEqual([...h.value().watch], ['005930'])
  await h.value().add('000660'); await h.flush()
  assert.deepEqual([...h.value().watch], ['005930', '000660'])
  await h.value().remove('005930'); await h.flush()
  const refreshed = harness(api); await refreshed.flush()
  assert.deepEqual([...refreshed.value().watch], ['000660'])
})

test('failed save keeps state and reports failure instead of success', async () => {
  const h = harness({ add: async () => { throw Error('offline') } }); await h.flush()
  await h.value().add('005930'); await h.flush()
  assert.deepEqual([...h.value().watch], [])
  assert.match(h.toast.at(-1), /저장하지 못/)
})

test('rapid duplicate operations on same ticker send only one request', async () => {
  const saving = deferred(); const h = harness({ add: () => saving.promise }); await h.flush()
  const first = h.value().add('005930'); const second = h.value().add('005930')
  assert.equal(h.calls.length, 1); assert.equal(h.value().watch.length, 0)
  saving.resolve(); await Promise.all([first, second]); await h.flush()
  assert.deepEqual([...h.value().watch], ['005930'])
})

test('concurrent different tickers preserve both successful changes', async () => {
  const a = deferred(), b = deferred(); const h = harness({ add: c => c === '005930' ? a.promise : b.promise }); await h.flush()
  const first = h.value().add('005930'), second = h.value().add('000660')
  b.resolve(); await second; a.resolve(); await first; await h.flush()
  assert.deepEqual([...h.value().watch].sort(), ['000660', '005930'])
})

test('switching customer ignores previous delayed load', async () => {
  const old = deferred(); let n = 0
  const h = harness({ get: () => ++n === 1 ? old.promise : Promise.resolve(['000660']) })
  h.props.customerId = 52; h.render(); await h.flush()
  old.resolve(['005930']); await h.flush()
  assert.deepEqual([...h.value().watch], ['000660'])
})

test('switching customer ignores previous delayed write and success toast', async () => {
  const saving = deferred(); const h = harness({ add: () => saving.promise }); await h.flush()
  const write = h.value().add('005930'); h.props.customerId = 52; h.render(); await h.flush()
  saving.resolve(); await write; await h.flush()
  assert.deepEqual([...h.value().watch], []); assert.equal(h.toast.length, 0)
})

test('failed load can retry and does not permit writes against unknown state', async () => {
  let n = 0; const h = harness({ get: async () => { if (++n === 1) throw Error('offline'); return ['005930'] } }); await h.flush()
  assert.equal(h.value().failed, true)
  await h.value().add('000660'); assert.equal(h.calls.length, 0)
  h.value().retry(); await h.flush(); await h.flush()
  assert.equal(h.value().failed, false); assert.deepEqual([...h.value().watch], ['005930'])
})


test('logging back into same customer blocks writes until fresh load completes', async () => {
  const loading = deferred(); let n = 0
  const h = harness({ get: () => ++n === 1 ? Promise.resolve(['005930']) : loading.promise }); await h.flush()
  h.props.customerId = null; h.render()
  h.props.customerId = 51; h.render()
  await h.value().add('000660'); assert.equal(h.calls.length, 0)
  loading.resolve(['005930']); await h.flush()
  await h.value().add('000660'); await h.flush()
  assert.deepEqual([...h.value().watch], ['005930', '000660'])
})


test('server commit followed by lost add response reconciles star with persisted data', async () => {
  const saved = new Set(); const h = harness({ get: async () => [...saved], add: async c => { saved.add(c); throw Error('response lost after commit') } }); await h.flush()
  await h.value().add('005930'); await h.flush()
  assert.deepEqual([...h.value().watch], [...saved]); assert.equal(h.value().watch.includes('005930'), true)
  assert.match(h.toast.at(-1), /결과를 확인/)
})

test('server commit followed by lost delete response reconciles removal', async () => {
  const saved = new Set(['005930']); const h = harness({ get: async () => [...saved], remove: async c => { saved.delete(c); throw Error('response lost') } }); await h.flush()
  await h.value().remove('005930'); await h.flush()
  assert.deepEqual([...h.value().watch], [...saved]); assert.equal(h.value().watch.length, 0)
})

test('late reconciliation snapshot does not erase another successfully saved ticker', async () => {
  const read = deferred(); let gets = 0
  const h = harness({ get: () => ++gets === 1 ? Promise.resolve([]) : read.promise, add: async c => { if(c === '005930') throw Error('response lost') } }); await h.flush()
  const first = h.value().add('005930'); await h.flush()
  await h.value().add('000660'); await h.flush()
  read.resolve(['005930']); await first; await h.flush()
  assert.deepEqual([...h.value().watch].sort(), ['000660', '005930'])
})

test('failed write and failed confirmation block further writes until reload', async () => {
  let gets = 0
  const h = harness({ get: async () => { if (++gets === 2) throw Error('read offline'); return ['005930'] }, remove: async () => { throw Error('response lost') } }); await h.flush()
  await h.value().remove('005930'); await h.flush()
  assert.equal(h.value().failed, true); assert.match(h.toast.at(-1), /저장 결과를 확인하지 못/)
  await h.value().add('000660'); assert.equal(h.calls.length, 1)
  h.value().retry(); await h.flush(); await h.flush()
  assert.equal(h.value().failed, false)
})

test('confirmation response from previous customer never alters new customer state', async () => {
  const read = deferred(); let gets = 0
  const h = harness({ get: () => ++gets === 1 ? Promise.resolve([]) : gets === 2 ? read.promise : Promise.resolve(['000660']), add: async () => { throw Error('lost response') } }); await h.flush()
  const write = h.value().add('005930'); await h.flush()
  h.props.customerId = 52; h.render(); await h.flush()
  read.resolve(['005930']); await write; await h.flush()
  assert.deepEqual([...h.value().watch], ['000660']); assert.equal(h.toast.length, 0)
})


test('checking authentication reports loading instead of asking an authenticated user to log in', async () => {
  const h = harness(); h.props.customerId = null; h.props.checking = true; h.render()
  await h.value().add('005930'); assert.match(h.toast.at(-1), /로그인 상태를 확인/)
  assert.equal(h.calls.length, 0)
})
