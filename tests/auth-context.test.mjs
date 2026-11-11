import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const tick = () => new Promise(resolve => setImmediate(resolve))

function axiosError(status) { return { isAxiosError: true, response: { status } } }

function harness(getMock) {
  const slots = []; let cursor = 0; let dirty = false; let effects = []
  let authValue = null

  const pendingTimers = new Map(); let nextId = 0
  const mockSetTimeout = (fn) => { const id = ++nextId; pendingTimers.set(id, fn); return id }
  const mockClearTimeout = (id) => pendingTimers.delete(id)

  const react = {
    useState(initial) {
      const i = cursor++
      slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, next => {
        const v = typeof next === 'function' ? next(slots[i].value) : next
        if (!Object.is(v, slots[i].value)) { slots[i].value = v; dirty = true }
      }]
    },
    useCallback(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((v, j) => !Object.is(v, slots[i].deps?.[j]))) slots[i] = { deps, fn }
      return slots[i].fn
    },
    useEffect(fn, deps) {
      const i = cursor++; const old = slots[i]
      if (!old || !deps || !old.deps || deps.some((v, j) => !Object.is(v, old.deps[j]))) {
        effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } })
      }
    },
  }

  const source = readFileSync(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(compiled, {
    module: mod, exports: mod.exports,
    setTimeout: mockSetTimeout, clearTimeout: mockClearTimeout,
    require(name) {
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
      if (name === 'axios') return { isAxiosError: e => !!(e && e.isAxiosError === true) }
      if (name.endsWith('/api/auth')) return { getMe: getMock, login: async () => {}, logout: async () => {}, extendSession: async () => {} }
      if (name.endsWith('/api/investor')) return { syncAssessState: async () => {} }
      if (name.endsWith('/loginSession')) return { clearAssessHist() {}, clearLoginSession() {}, setLoginSession() {} }
      if (name.endsWith('/data/returns')) return { RETURNS_DATA: { setServerState() {} } }
      if (name.endsWith('/authState')) return { AuthContext: { Provider: 'auth-ctx' } }
      if (name.endsWith('/newsPrefetch')) return { resetNewsSession() {}, prefetchNews() {} }
      throw new Error('unexpected require: ' + name)
    },
  })

  function render() {
    for (let i = 0; i < 20; i++) {
      cursor = 0; dirty = false
      const tree = mod.exports.AuthProvider({ children: null })
      authValue = tree.props.value.auth
      const pending = effects; effects = []; pending.forEach(fn => fn())
      if (!dirty) return
    }
    throw new Error('Render did not settle')
  }

  return {
    render,
    auth: () => authValue,
    timerCount: () => pendingTimers.size,
    async fireTimers() { const all = [...pendingTimers.values()]; pendingTimers.clear(); all.forEach(fn => fn()); await tick(); render() },
    async flush() { await tick(); render() },
    unmount() { slots.forEach(s => s?.cleanup?.()) },
  }
}

// ── 성공 경로 ────────────────────────────────────────────────────────────────

test('getMe 성공 → authenticated', async () => {
  const me = { customerId: 1, loginId: 'u1', name: '홍길동', expiresAt: '2026-11-11T23:59:59' }
  const h = harness(async () => me)
  h.render()
  assert.equal(h.auth().status, 'checking')
  await h.flush()
  assert.equal(h.auth().status, 'authenticated')
  assert.equal(h.auth().me.name, '홍길동')
  assert.equal(h.timerCount(), 0)
})

// ── 즉시 실패 경로 ────────────────────────────────────────────────────────────

test('401 → 즉시 unauthenticated, 재시도 없음', async () => {
  const h = harness(async () => { throw axiosError(401) })
  h.render()
  assert.equal(h.auth().status, 'checking')
  await h.flush()
  assert.equal(h.auth().status, 'unauthenticated')
  assert.equal(h.timerCount(), 0, '재시도 타이머가 등록되면 안 됨')
})

test('axios 아닌 오류(네트워크 단절 등) → 즉시 unauthenticated', async () => {
  const h = harness(async () => { throw new Error('네트워크 오류') })
  h.render()
  await h.flush()
  assert.equal(h.auth().status, 'unauthenticated')
  assert.equal(h.timerCount(), 0)
})

// ── 재시도 경로 ───────────────────────────────────────────────────────────────

test('503 → checking 유지 → 재시도 성공 → authenticated', async () => {
  let calls = 0
  const me = { customerId: 2, loginId: 'u2', name: '김철수', expiresAt: '2026-11-11T23:59:59' }
  const h = harness(async () => {
    if (++calls === 1) throw axiosError(503)
    return me
  })
  h.render()
  await h.flush()
  assert.equal(h.auth().status, 'checking', '재시도 전에는 checking이어야 함')
  assert.equal(h.timerCount(), 1, '재시도 타이머 1개가 등록돼 있어야 함')
  await h.fireTimers()
  assert.equal(h.auth().status, 'authenticated')
  assert.equal(h.auth().me.name, '김철수')
  assert.equal(calls, 2)
})

test('503 → 재시도도 실패 → unauthenticated', async () => {
  const h = harness(async () => { throw axiosError(503) })
  h.render()
  await h.flush()
  assert.equal(h.auth().status, 'checking')
  await h.fireTimers()
  assert.equal(h.auth().status, 'unauthenticated')
  assert.equal(h.timerCount(), 0, '재시도 실패 후 추가 타이머 없어야 함')
})

test('503 → 재시도 중 401 → unauthenticated', async () => {
  let calls = 0
  const h = harness(async () => {
    ++calls === 1 ? (() => { throw axiosError(503) })() : (() => { throw axiosError(401) })()
  })
  h.render()
  await h.flush()
  assert.equal(h.auth().status, 'checking')
  await h.fireTimers()
  assert.equal(h.auth().status, 'unauthenticated')
})

// ── cleanup ───────────────────────────────────────────────────────────────────

test('unmount 시 타이머 취소(checking 무한 대기 없음)', async () => {
  const h = harness(async () => { throw axiosError(503) })
  h.render()
  await h.flush()
  assert.equal(h.timerCount(), 1)
  h.unmount()
  assert.equal(h.timerCount(), 0, '언마운트 시 clearTimeout이 호출돼야 함')
})

// ── auth.ts 단위 ──────────────────────────────────────────────────────────────

test('getMe는 timeout 5000으로 apiClient.get을 호출한다', async () => {
  const source = readFileSync(new URL('../src/api/auth.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  let captured = null
  vm.runInNewContext(compiled, {
    module: mod, exports: mod.exports,
    require(name) {
      if (name === './client') return {
        apiClient: { get: async (url, config) => { captured = { url, config }; return { data: { data: { customerId: 1, loginId: 'u', name: 'n', expiresAt: 'e' } } } } },
      }
      throw new Error(name)
    },
  })
  await mod.exports.getMe()
  assert.equal(captured.url, '/api/customer/auth/me')
  assert.equal(captured.config?.timeout, 5000)
})
