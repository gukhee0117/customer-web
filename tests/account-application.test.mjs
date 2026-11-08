import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the shipped modal's effects, buttons and HTTP adapter with deferred IO.
// This runner checks behavior, not browser layout.
function load(file, imports) {
  const source = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, require: imports })
  return module.exports
}

const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred() {
  let resolve, reject
  const promise = new Promise((a, b) => { resolve = a; reject = b })
  return { promise, resolve, reject }
}

function harness(client) {
  const slots = []; let cursor = 0; let dirty = false; let effects = []; let output
  const calls = { changed: 0, closed: 0 }
  const react = {
    useCallback(fn) { return fn },
    useState(initial) {
      const i = cursor++
      slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, value => {
        const next = typeof value === 'function' ? value(slots[i].value) : value
        if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true }
      }]
    },
    useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i] },
    useEffect(fn, deps) {
      const i = cursor++; const old = slots[i]
      if (!old || !deps || !old.deps || deps.some((v, j) => !Object.is(v, old.deps[j]))) {
        effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } })
      }
    },
  }
  const F = { won: String }
  const data = { LINKED: { name: '', no: '' }, ACCOUNT: { name: 'RIA', no: '' } }
  const api = load('api/account.ts', name => {
    assert.equal(name, './client')
    return { apiClient: client }
  })
  const config = load('components/account/accountApplyData.ts', name => {
    if (name.endsWith('/data/returns')) return { RETURNS_DATA: data }
    if (name.endsWith('/lib/calc')) return { F }
    if (name === './accountData') return { GEN_HOLDINGS: [] }
    throw new Error(name)
  })
  const serverData = load('components/account/useServerData.ts', name => {
    if (name === 'react') return react
    if (name === 'axios') return { isAxiosError: () => true }
    throw new Error(name)
  })
  const rules = load('components/account/accountApplicationRules.ts', () => { throw new Error('Unexpected import') })
  const { ApplyModal } = load('components/account/ApplyModal.tsx', name => {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' }
    if (name === 'react-dom') return { createPortal: node => node }
    if (name.endsWith('.css')) return {}
    if (name.endsWith('/lib/calc')) return { F }
    if (name.endsWith('/common/cx')) return { cx: (...args) => args.filter(Boolean).join(' ') }
    if (name.endsWith('/common/StockLabel')) return { StockLabel: 'stock' }
    if (name === './ModalFrame') return { ModalFrame: 'frame' }
    if (name === './accountApplyData') return config
    if (name === './useServerData') return serverData
    if (name === './accountApplicationRules') return rules
    if (name.endsWith('/api/account')) return api
    if (name.endsWith('/api/client')) return { apiErrorMessage: (e, fallback) => e.response?.data?.message ?? fallback }
    if (name.endsWith('/api/inbound') || name.endsWith('/api/withdrawal')) return {}
    throw new Error(name)
  })
  const props = { kind: 'open', linkedText: '일반계좌 1234', riaAccountNo: '-', onClose: () => calls.closed++, onFinishOpen: () => calls.closed++, onAccountChanged: () => calls.changed++ }
  function render() {
    for (let i = 0; i < 20; i++) {
      dirty = false; cursor = 0; output = ApplyModal(props)
      const pending = effects; effects = []; pending.forEach(run => run())
      if (!dirty) return output
    }
    throw new Error('Render did not settle')
  }
  function nodes(value = output, result = []) {
    if (Array.isArray(value)) value.forEach(v => nodes(v, result))
    else if (value && typeof value === 'object' && value.props) {
      result.push(value)
      nodes(value.props.children ?? null, result)
      nodes(value.props.footer ?? null, result)
    }
    return result
  }
  function button(label) { return nodes().find(n => n.type === 'button' && n.props.children === label) }
  function click(label) {
    const target = button(label)
    assert.ok(target, `Button: ${label}`)
    assert.ok(!target.props.disabled, `Enabled: ${label}`)
    target.props.onClick(); render()
  }
  function confirm() {
    click('다음'); click('다음')
    const agreement = nodes().find(n => n.type === 'button' && 'aria-pressed' in n.props)
    agreement.props.onClick(); render()
  }
  return { render, nodes, button, click, confirm, calls }
}

test('limit loading/failure prevents progressing and retry recovers', async () => {
  let requests = 0
  const h = harness({ get: async () => {
    requests++
    if (requests === 1) throw { response: { status: 503 } }
    return { data: { data: 20_000_000 } }
  } })
  h.render(); assert.equal(h.button('다음').props.disabled, true)
  await tick(); h.render(); assert.equal(h.button('다음').props.disabled, true)
  h.click('다시 시도'); await tick(); h.render()
  assert.equal(h.button('다음').props.disabled, false)
  assert.equal(requests, 2)
})

for (const status of ['OPENED', 'APPLIED']) {
  test(`${status}: server limit is submitted once and actual result refreshes account`, async () => {
    const pending = deferred(); const posts = []
    const h = harness({
      get: async url => { assert.equal(url, '/api/customer/account/available-limit'); return { data: { data: 1234567 } } },
      post: (url, body) => { posts.push({ url, body }); return pending.promise },
    })
    h.render(); await tick(); h.render(); h.confirm()
    const submit = h.button('신청하기').props.onClick
    submit(); submit(); h.render()
    assert.equal(posts.length, 1)
    assert.equal(posts[0].url, '/api/customer/account/applications')
    assert.equal(JSON.stringify(posts[0].body), '{"limitAmount":1234567}')
    h.nodes().find(n => n.type === 'frame').props.onClose()
    assert.equal(h.calls.closed, 0)
    pending.resolve({ data: { data: { status, limitAmount: 1234567, accountNo: status === 'OPENED' ? '7311234567' : null } } })
    await tick(); h.render()
    assert.equal(h.calls.changed, 1)
    const done = h.nodes().find(n => n.type?.name === 'DoneView')
    assert.equal(done.props.title, status === 'OPENED' ? '계좌가 개설됐어요' : '계좌 개설 신청이 접수됐어요')
    h.nodes().find(n => n.type === 'frame').props.onClose()
    assert.equal(h.calls.closed, 1)
  })
}

test('zero available limit blocks application', async () => {
  const h = harness({ get: async () => ({ data: { data: 0 } }) })
  h.render(); await tick(); h.render()
  assert.equal(h.button('다음').props.disabled, true)
})

for (const amount of ['0', '20000001']) {
  test(`invalid limit ${amount} blocks progression`, async () => {
    const h = harness({ get: async () => ({ data: { data: 20_000_000 } }) })
    h.render(); await tick(); h.render(); h.click('다음')
    h.nodes().find(n => n.type === 'input').props.onChange({ target: { value: amount } })
    h.render(); assert.equal(h.button('다음').props.disabled, true)
  })
}

test('definite failure keeps confirmation visible and does not report success', async () => {
  const h = harness({ get: async () => ({ data: { data: 20_000_000 } }), post: async () => { throw { response: { status: 400, data: { message: '신청 불가' } } } } })
  h.render(); await tick(); h.render(); h.confirm(); h.click('신청하기')
  await tick(); h.render()
  assert.equal(h.calls.changed, 0)
  assert.equal(h.button('신청하기').props.disabled, false)
  assert.equal(h.nodes().find(n => n.props.role === 'alert').props.children, '신청 불가')
})

test('lost response shows uncertainty, refreshes profile and prevents blind resubmission', async () => {
  const h = harness({ get: async () => ({ data: { data: 20_000_000 } }), post: async () => { throw new Error('network') } })
  h.render(); await tick(); h.render(); h.confirm(); h.click('신청하기')
  await tick(); h.render()
  assert.equal(h.calls.changed, 1)
  assert.equal(h.nodes().find(n => n.type?.name === 'DoneView').props.title, '처리 여부를 확인해 주세요')
  assert.equal(h.button('신청하기'), undefined)
})

test('409 already-existing account ends submission and refreshes the account', async () => {
  let posts = 0
  const h = harness({ get: async () => ({ data: { data: 20_000_000 } }), post: async () => { posts++; throw { response: { status: 409 } } } })
  h.render(); await tick(); h.render(); h.confirm(); h.click('신청하기')
  await tick(); h.render()
  assert.equal(h.calls.changed, 1)
  assert.equal(h.nodes().find(n => n.type?.name === 'DoneView').props.title, '이미 계좌가 있어요')
  assert.equal(h.button('신청하기'), undefined)
  assert.equal(posts, 1)
})

test('closing an edited application asks before discarding input', async () => {
  const h = harness({ get: async () => ({ data: { data: 20_000_000 } }) })
  h.render(); await tick(); h.render(); h.click('다음')
  h.nodes().find(n => n.type === 'input').props.onChange({ target: { value: '1234567' } })
  h.render()
  assert.equal(h.nodes().find(n => n.type === 'input').props.value, '1234567')
  h.nodes().find(n => n.type === 'frame').props.onClose(); h.render()
  assert.equal(h.calls.closed, 0)
  assert.ok(h.nodes().some(n => n.type?.name === 'AskClose'))
})

test('limit boundaries and uncertain responses are pure shared rules', () => {
  const rules = load('components/account/accountApplicationRules.ts', () => { throw new Error('Unexpected import') })
  for (const [amount, available, valid] of [[1,1,true],[50000000,50000000,true],[0,10,false],[11,10,false],[1.5,10,false],[1,null,false],[NaN,10,false]]) {
    assert.equal(rules.isValidAccountLimit(amount, available), valid)
  }
  assert.equal(rules.isAmbiguousResponse(new Error('network')), true)
  assert.equal(rules.isAmbiguousResponse({ response: { status: 503 } }), true)
  assert.equal(rules.isAmbiguousResponse({ response: { status: 409 } }), false)
})
