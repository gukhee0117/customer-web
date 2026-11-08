import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const defaults = { push: true, sms: false, email: false, settle: true, band: true, reply: true, kiru: true }
const missingEmail = '등록된 이메일이 없습니다. 기본 정보에서 이메일을 등록해 주세요.'
const tick = () => new Promise(resolve => setImmediate(resolve))

// Run the actual component's event handlers and effects; no browser layout is simulated.
function harness(email, initial = defaults, update = async settings => settings, fetch = async () => initial) {
  const slots = []; let cursor = 0; let dirty = false; let effects = []; let tree
  const toasts = []; const saved = []
  const props = { email, onToast: message => toasts.push(message) }
  const react = {
    useState(value) {
      const i = cursor++; slots[i] ??= { value }
      return [slots[i].value, next => {
        const value = typeof next === 'function' ? next(slots[i].value) : next
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true }
      }]
    },
    useEffect(fn, deps) {
      const i = cursor++; const old = slots[i]
      if (!old || deps.some((value, j) => !Object.is(value, old.deps[j]))) {
        effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } })
      }
    },
  }
  const source = readFileSync(new URL('../src/components/myinfo/MyInfoNotifyBox.tsx', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, require(name) {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
    if (name.endsWith('.css')) return {}
    if (name.endsWith('/notificationSettings')) return {
      fetchNotificationSettings: fetch,
      updateNotificationSettings: async settings => { saved.push(settings); return update(settings) },
    }
    if (name.endsWith('/client')) return { apiErrorMessage: (error, fallback) => error.response?.data?.message ?? fallback }
    if (name.endsWith('/Box')) return { Box: 'box' }
    if (name.endsWith('/cx')) return { cx: () => '' }
    if (name.endsWith('/MyInfoSwitch')) return { MyInfoSwitch: 'switch' }
    throw new Error(name)
  } })
  function render(...nextEmail) {
    if (nextEmail.length) props.email = nextEmail[0]
    for (let i = 0; i < 20; i++) {
      dirty = false; cursor = 0; tree = module.exports.MyInfoNotifyBox(props)
      const pending = effects; effects = []; pending.forEach(run => run())
      if (!dirty) return
    }
    throw new Error('Render did not settle')
  }
  function findSwitch(key) {
    function visit(node) {
      if (Array.isArray(node)) return node.map(visit).find(Boolean)
      if (!node?.props) return undefined
      if (node.type === 'switch' && node.props.labelId === 'nt-' + key) return node
      return visit(node.props.children)
    }
    return visit(tree).props
  }
  function retryLoad() {
    function visit(node) {
      if (Array.isArray(node)) return node.map(visit).find(Boolean)
      if (!node?.props) return undefined
      if (node.type === 'button' && node.props.children === '다시 시도') return node
      return visit(node.props.children)
    }
    visit(tree).props.onClick(); render()
  }
  return { render, findSwitch, retryLoad, toasts, saved, async ready() { render(); await tick(); render() },
    async toggle(key) { const control = findSwitch(key); assert.equal(control.disabled, false); await control.onToggle(); await tick(); render() } }
}

for (const email of [null, '', '   ']) {
  test(`missing email ${JSON.stringify(email)} stays off and does not save`, async () => {
    const h = harness(email); await h.ready(); await h.toggle('email')
    assert.equal(h.findSwitch('email').on, false)
    assert.equal(h.saved.length, 0)
    assert.equal(h.toasts.at(-1), missingEmail)
  })
}

test('unknown profile cannot enable email but other switches remain usable', async () => {
  const h = harness(undefined); await h.ready(); await h.toggle('email')
  assert.equal(h.saved.length, 0)
  assert.match(h.toasts.at(-1), /등록 여부를 확인하지 못했어요/)
  await h.toggle('push')
  assert.equal(h.findSwitch('push').on, false)
  assert.equal(h.saved.length, 1)
})

test('registering email in basic info immediately allows enabling notifications', async () => {
  const h = harness(null); await h.ready(); await h.toggle('email')
  h.render('test@example.com'); await h.toggle('email')
  assert.equal(h.saved.length, 1)
  assert.equal(h.saved[0].email, true)
  assert.equal(h.findSwitch('email').on, true)
})

test('email can be disabled even after the address has been removed', async () => {
  const h = harness(null, { ...defaults, email: true }); await h.ready(); await h.toggle('email')
  assert.equal(h.saved.length, 1)
  assert.equal(h.saved[0].email, false)
  assert.equal(h.findSwitch('email').on, false)
})

test('server rejects stale email profile and its message is displayed with toggle rollback', async () => {
  const h = harness('stale@example.com', defaults, async () => { throw { response: { data: { message: missingEmail } } } })
  await h.ready(); await h.toggle('email')
  assert.equal(h.saved.length, 1)
  assert.equal(h.findSwitch('email').on, false)
  assert.equal(h.toasts.at(-1), missingEmail)
})

test('failed initial load cannot overwrite preferences with defaults and retry restores server values', async () => {
  let calls = 0
  const h = harness('test@example.com', defaults, async settings => settings, async () => {
    if (++calls === 1) throw new Error('offline')
    return { ...defaults, push: false }
  })
  await h.ready()
  assert.equal(h.findSwitch('push').disabled, true)
  await h.findSwitch('push').onToggle()
  assert.equal(h.saved.length, 0)
  h.retryLoad(); await tick(); h.render()
  assert.equal(h.findSwitch('push').disabled, false)
  assert.equal(h.findSwitch('push').on, false)
})
