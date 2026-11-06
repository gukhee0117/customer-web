import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { newsStockChange } from '../src/components/home/newsStockChange.ts'

const source = readFileSync(new URL('../src/components/home/NewsAnswerBubble.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
const module = { exports: {} }
vm.runInNewContext(compiled, { exports: module.exports, module, require(name) {
  if (name === 'react/jsx-runtime') return jsx
  if (name === './newsStockChange') return { newsStockChange }
  if (name.endsWith('/api/news')) return { answerLabel: () => '실제 AI 답변' }
  if (name.endsWith('/assetUrl')) return { assetUrl: value => value }
  if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
  throw new Error(`Unexpected import ${name}`)
} })
const Bubble = module.exports.NewsAnswerBubble
const base = { articleId: 'a', articleVersion: 'v1', evidence: { facts: [], risks: [] }, explanation: '핵심 설명', origin: 'LIVE_LLM', preparedReason: null, generatedAt: null }

test('summary renders three readable bullet points and verified stock names/codes', () => {
  const html = renderToStaticMarkup(React.createElement(Bubble, { summary: true, answer: { ...base,
    points: ['생산능력 확대 계획', '공급 협의 진행', '계약은 아직 미확정'], relatedStocks: [{ ticker: '000660', name: 'SK하이닉스' }],
  } }))
  assert.match(html, /이 기사 3줄로 요약/)
  assert.equal((html.match(/<li>/g) ?? []).length, 3)
  assert.match(html, /SK하이닉스/); assert.match(html, /000660/)
})

test('numeric answer renders a list and a separate original-text quotation', () => {
  const html = renderToStaticMarkup(React.createElement(Bubble, { answer: { ...base,
    points: ['내년 생산능력: 올해의 2배 계획', '계획이며 공급 계약은 미확정'], quote: '내년 HBM 생산능력을 올해의 2배로 확대할 계획이다.',
  } }))
  assert.equal((html.match(/<li>/g) ?? []).length, 2)
  assert.match(html, /기사 내용:/); assert.match(html, /2배/)
  assert.doesNotMatch(html, /이 기사 3줄로 요약/)
})

test('missing numeric data is shown plainly and model text cannot inject HTML', () => {
  const html = renderToStaticMarkup(React.createElement(Bubble, { answer: { ...base,
    explanation: '이 기사에는 수치 정보가 없어요. <script>alert(1)</script>', points: [], quote: null,
  } }))
  assert.match(html, /수치 정보가 없어요/)
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/)
  assert.doesNotMatch(html, /기사 내용:/)
})


test('stock card renders database sector and signed daily change without stock icon', () => {
  const html = renderToStaticMarkup(React.createElement(Bubble, { summary: true,
    quotes: { '000660': { ticker: '000660', available: true, price: 110, previousClose: 100 } },
    answer: { ...base, relatedStocks: [{ ticker: '000660', name: 'SK하이닉스', sectorName: '반도체' }] },
  }))
  assert.match(html, /반도체/); assert.match(html, /000660/); assert.match(html, /전일 대비 \+10.00%/)
  assert.match(html, /class="chg up"/); assert.doesNotMatch(html, /stockMark/); assert.match(html, /뉴스 관련 종목/); assert.doesNotMatch(html, /보유 테마 연관 종목/)
})

test('missing prices and sectors are explicit; loading does not block the summary', () => {
  const props = { summary: true, answer: { ...base, relatedStocks: [{ ticker: '000660', name: 'SK하이닉스' }] } }
  let html = renderToStaticMarkup(React.createElement(Bubble, props))
  assert.match(html, /확인 불가/); assert.match(html, /분류 미제공/); assert.doesNotMatch(html, /0.00%/)
  html = renderToStaticMarkup(React.createElement(Bubble, { ...props, quotesPending: true }))
  assert.match(html, /시세 확인 중/); assert.match(html, /핵심 설명/)
})

test('daily change validates zero, unavailable and invalid prices and formats all directions', () => {
  const quote = { ticker: 'a', available: true, price: 100, previousClose: 100 }
  assert.equal(newsStockChange(quote).label, '0.00%')
  assert.equal(newsStockChange({ ...quote, price: 90 }).label, '-10.00%')
  assert.equal(newsStockChange({ ...quote, price: 99.99999 }).label, '0.00%')
  for (const change of [{ previousClose: 0 }, { previousClose: null }, { price: NaN }, { price: 0 }, { available: false }]) {
    assert.equal(newsStockChange({ ...quote, ...change }), null)
  }
})
