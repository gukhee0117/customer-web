// Opt-in against local seeded server: WATCHLIST_HTTP_TEST=1 WATCHLIST_TEST_PASSWORD=... node --test tests/community-*.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { componentHarness } from './helpers/componentHarness.mjs'
const live = process.env.WATCHLIST_HTTP_TEST === '1'
const base = process.env.WATCHLIST_TEST_URL ?? 'http://127.0.0.1:10000'
const path = '/api/customer/community/watchlist'

async function customer(login) {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local seeded server only')
  assert.ok(process.env.WATCHLIST_TEST_PASSWORD, 'Set WATCHLIST_TEST_PASSWORD')
  const cookies = new Map()
  async function call(url, method = 'GET', body, csrf = true) {
    const headers = { 'Content-Type': 'application/json', Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; ') }
    if (csrf && cookies.has('XSRF-TOKEN')) headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies.get('XSRF-TOKEN'))
    const response = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) })
    for (const cookie of response.headers.getSetCookie()) { const first = cookie.split(';')[0], i = first.indexOf('='); cookies.set(first.slice(0,i), first.slice(i+1)) }
    if (!response.ok) { const error = new Error(`HTTP ${response.status}`); error.status = response.status; throw error }
    const text = await response.text(); return text ? JSON.parse(text).data : undefined
  }
  await call('/api/customer/csrf')
  await call('/api/customer/auth/login', 'POST', { loginId: login, password: process.env.WATCHLIST_TEST_PASSWORD })
  await call('/api/customer/csrf')
  return call
}
async function absentTicker(client, lists) {
  const all = await client('/api/customer/community/tickers')
  const ticker = all.find(x => x.market === 'DOMESTIC' && !lists.flat().includes(x.ticker))?.ticker
  assert.ok(ticker, 'Need one unused domestic ticker'); return ticker
}

test('real MariaDB: concurrent adds, customer isolation, CSRF, retries and cleanup', { skip: !live }, async () => {
  const one = await customer('user000001'), two = await customer('user000002')
  const original = await one(path), other = await two(path), ticker = await absentTicker(one, [original, other])
  try {
    for (let round = 0; round < 3; round++) {
      await one(`${path}/${ticker}`, 'DELETE')
      const outcomes = await Promise.allSettled(Array.from({ length: 12 }, () => one(`${path}/${ticker}`, 'PUT')))
      assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 12, JSON.stringify(outcomes.filter(x => x.status === 'rejected').map(x => x.reason.message)))
      assert.equal((await one(path)).filter(x => x === ticker).length, 1)
    }
    assert.deepEqual(await one(path + '?customerId=2'), await one(path))
    await two(`${path}/${ticker}`, 'DELETE'); assert.ok((await one(path)).includes(ticker))
    assert.deepEqual(await two(path), other)
    await assert.rejects(one(`${path}/${ticker}`, 'DELETE', undefined, false), e => e.status === 403)
    await assert.rejects(one(`${path}/NOTAREALTICKER`, 'PUT'), e => e.status === 400)
    await one(`${path}/${ticker}`, 'DELETE'); await one(`${path}/${ticker}`, 'DELETE')
    assert.deepEqual(await one(path), original)
  } finally {
    await one(`${path}/${ticker}`, 'DELETE')
    assert.deepEqual(await one(path), original); assert.deepEqual(await two(path), other)
  }
})

test('real persisted add/delete with lost response reconciles frontend hook to database', { skip: !live }, async () => {
  const api = await customer('user000001'), original = await api(path), ticker = await absentTicker(api, [original])
  const toast = []
  let initialReady
  const initialRead = new Promise(resolve => { initialReady = resolve })
  const h = componentHarness('components/community/useCommunityWatchlist.ts', 'useCommunityWatchlist', { customerId: 1, onToast: text => toast.push(text) }, name => {
    if (name.endsWith('/community')) return {
      getWatchlist: async () => { const list = await api(path); initialReady(); return list },
      addWatchlist: async code => { await api(`${path}/${code}`, 'PUT'); throw Error('response dropped after actual commit') },
      removeWatchlist: async code => { await api(`${path}/${code}`, 'DELETE'); throw Error('response dropped after actual commit') }
    }
    if (name.endsWith('/client')) return { apiErrorMessage: (_, fallback) => fallback }
    throw Error(name)
  })
  try {
    await initialRead; await h.flush()
    await h.nodes()[0].add(ticker); await h.flush()
    assert.deepEqual([...h.nodes()[0].watch].sort(), (await api(path)).sort()); assert.ok(h.nodes()[0].watch.includes(ticker))
    await h.nodes()[0].remove(ticker); await h.flush()
    assert.deepEqual([...h.nodes()[0].watch].sort(), (await api(path)).sort()); assert.ok(!h.nodes()[0].watch.includes(ticker))
  } finally {
    await api(`${path}/${ticker}`, 'DELETE'); assert.deepEqual(await api(path), original)
  }
})


test('real MariaDB: 100-item boundary allows duplicate and deletion, blocks item 101', { skip: !live }, async () => {
  const api = await customer('user000001'), original = await api(path)
  assert.ok(original.length < 100, 'Use a seeded account below the limit')
  const candidates = (await api('/api/customer/community/tickers')).map(x => x.ticker).filter(x => !original.includes(x))
  const required = 100 - original.length, filling = candidates.slice(0, required), extra = candidates[required]
  assert.ok(extra, 'Need enough distinct catalog tickers for boundary verification')
  const added = new Set([...filling, extra])
  try {
    for(let i=0;i<filling.length;i+=10) await Promise.all(filling.slice(i,i+10).map(code => api(`${path}/${code}`, 'PUT')))
    assert.equal((await api(path)).length, 100)
    await api(`${path}/${filling[0]}`, 'PUT')
    await assert.rejects(api(`${path}/${extra}`, 'PUT'), e => e.status === 409)
    assert.equal((await api(path)).length, 100)
    await api(`${path}/${filling[0]}`, 'DELETE'); await api(`${path}/${extra}`, 'PUT')
    assert.equal((await api(path)).length, 100)
  } finally {
    for(const code of added) await api(`${path}/${code}`, 'DELETE')
    assert.deepEqual(await api(path), original)
  }
})
