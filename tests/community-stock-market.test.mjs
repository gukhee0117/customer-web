import test from 'node:test'
import assert from 'node:assert/strict'
import { componentHarness } from './helpers/componentHarness.mjs'

function view(extra) {
 const calls = []
 const h = componentHarness('components/community/useStocksData.ts', 'useStocksData', extra, name => {
  if(name.endsWith('/community')) return {
   getTickers: async () => [
    { ticker:'005930', name:'삼성전자', market:'DOMESTIC' },
    { ticker:'600519', name:'귀주모태주', market:'FOREIGN' },
    { ticker:'000858', name:'오량액', market:'FOREIGN' },
    { ticker:'AAPL', name:'Apple', market:'FOREIGN' }],
   getTickerRanking: async () => [{ ticker:'600519', rank:1 }, { ticker:'005930', rank:2 }]
  }
  if(name.endsWith('/stockPackage')) return { fetchQuotes: async codes => { calls.push([...codes]); return [] } }
  if(name.endsWith('/usePollTick')) return { usePollTick: () => 0 }
  if(name.endsWith('/communityData')) return { KR_ALL: {} }
  if(name.endsWith('/stocksContext')) return { NO_QUOTE: {price:null,rate:null,pending:false}, PENDING_QUOTE: {price:null,rate:null,pending:true} }
  throw Error(name)
 })
 return { ...h, calls, stocks: () => h.nodes()[0] }
}

test('six-digit foreign tickers are absent from domestic lookup and quote requests', async () => {
 const h = view(['005930','600519','000858','AAPL']); await h.flush(); await h.flush()
 assert.deepEqual(h.calls, [['005930']])
 assert.equal(h.stocks().stock('005930').name, '삼성전자')
 for(const ticker of ['600519','000858','AAPL']) {
  assert.equal(h.stocks().stock(ticker), undefined)
  assert.equal(h.stocks().quote(ticker).pending, false)
 }
})

test('unknown six-digit ticker is not fetched just because its shape looks domestic', async () => {
 const h = view(['123456']); await h.flush(); await h.flush()
 assert.deepEqual(h.calls, [['005930']])
 assert.equal(h.stocks().stock('123456'),undefined)
})
