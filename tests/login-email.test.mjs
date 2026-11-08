import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const tick = () => new Promise(resolve => setImmediate(resolve))
const challenge = () => ({ maskedEmail: 'u***@example.com', expiresAt: new Date(Date.now() + 300000).toISOString(), resendAvailableAt: new Date(Date.now() - 1000).toISOString() })

function harness({ verifyError, expired = false } = {}) {
  const slots = []; let cursor = 0; let tree
  const calls = { login: [], verify: [], navigate: [], sync: 0, resend: 0 }
  const react = {
    useState(initial) {
      const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next }]
    },
    useEffect() {},
  }
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
  const source = readFileSync(new URL('../src/components/login/LoginForm.tsx', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, Date, setInterval: () => 1, clearInterval() {}, require(name) {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return jsx
    if (name === 'react-router-dom') return { useNavigate: () => path => calls.navigate.push(path) }
    if (name.endsWith('.css')) return {}
    if (name.endsWith('/investor')) return { syncAssessState: async () => { calls.sync++ } }
    if (name.endsWith('/authState')) return { useAuth: () => ({
      login: async (...args) => { calls.login.push(args); const pending = challenge(); if (expired) pending.expiresAt = new Date(Date.now() - 1000).toISOString(); return pending },
      verifyLogin: async code => { calls.verify.push(code); if (verifyError) throw verifyError },
    }) }
    if (name.endsWith('/auth')) return { resendLoginCode: async () => { calls.resend++; return challenge() } }
    if (name.endsWith('/client')) return { apiErrorMessage: (error, fallback) => error.response?.data?.message ?? fallback }
    if (name.endsWith('/cx')) return { cx: () => '' }
    if (name.endsWith('/Toast')) return { Toast: 'toast' }
    if (name.endsWith('/useToast')) return { useToast: () => ({ message: '', showToast() {} }) }
    throw new Error(name)
  } })
  function render() { cursor = 0; tree = module.exports.LoginForm({ active: true, onSignup() {} }) }
  function nodes(value) {
    if (!value || typeof value !== 'object') return []
    if (Array.isArray(value)) return value.flatMap(nodes)
    return [value, ...nodes(value.props?.children)]
  }
  function text(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (Array.isArray(value)) return value.map(text).join('')
    return value?.props ? text(value.props.children) : ''
  }
  function input(placeholder, value) { nodes(tree).find(n => n.type === 'input' && n.props.placeholder === placeholder).props.onChange({ target: { value } }); render() }
  async function submit() { nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await tick(); render() }
  async function begin() { input('아이디를 입력해 주세요', 'customer1'); input('비밀번호를 입력해 주세요', 'password'); await submit() }
  render()
  return { calls, nodes: () => nodes(tree), text, input, submit, begin, render }
}

test('existing customers log in using only ID and password and enter home', async () => {
  const h = harness(); await h.begin()
  assert.deepEqual(h.calls.login, [['customer1', 'password']])
  assert.equal(h.calls.sync, 1)
  assert.deepEqual(h.calls.navigate, ['/home'])
  assert.equal(h.calls.verify.length, 0)
  assert.equal(h.nodes().some(n => n.type === 'input' && n.props.autoComplete === 'one-time-code'), false)
})
