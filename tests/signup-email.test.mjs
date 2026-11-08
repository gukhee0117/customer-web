import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function harness({ rejectCode = false } = {}) {
  const slots = []; let cursor = 0; let tree
  const calls = { send: [], verify: [], signup: [], session: [], toast: [] }
  const react = {
    useState(initial) {
      const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next }]
    },
    useEffect() {},
  }
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
  const source = readFileSync(new URL('../src/components/login/SignupForm.tsx', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, Date, setInterval: () => 1, clearInterval() {}, require(name) {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return jsx
    if (name === 'react-router-dom') return { useNavigate: () => () => {} }
    if (name.endsWith('.css')) return {}
    if (name.endsWith('/auth')) return {
      sendSignupCode: async email => { calls.send.push(email); return { maskedEmail: 'u***@example.com', expiresAt: new Date(Date.now() + 300000).toISOString(), resendAvailableAt: new Date(Date.now() + 60000).toISOString() } },
      verifySignupCode: async code => { calls.verify.push(code); if (rejectCode) throw new Error('wrong') },
      signup: async body => { calls.signup.push(body); return { customerId: 7 } },
    }
    if (name.endsWith('/authState')) return { useAuth: () => ({ applySession: me => calls.session.push(me) }) }
    if (name.endsWith('/investor')) return { syncAssessState: async () => {} }
    if (name.endsWith('/returns')) return { RETURNS_DATA: { ACCOUNT: {} } }
    if (name.endsWith('/calc')) return { F: {} }
    if (name.endsWith('/useInvestorSurvey')) return { useInvestorSurvey: () => ({ questions: null, reset() {}, load: async () => {} }) }
    if (name.endsWith('/client')) return { apiErrorMessage: (_, fallback) => fallback }
    if (name.endsWith('/cx')) return { cx: () => '' }
    if (name.endsWith('/Toast')) return { Toast: 'toast' }
    if (name.endsWith('/useToast')) return { useToast: () => ({ message: '', showToast: text => calls.toast.push(text) }) }
    if (name.endsWith('/passwordRule')) return { PW_MAX: 72, pwCharsOk: () => true, pwChecks: () => [true, true, true] }
    if (name.endsWith('/SignupQuiz')) return { SignupQuiz: 'quiz' }
    if (name.endsWith('/SignupResult')) return { SignupResult: 'result' }
    throw new Error(name)
  } })
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
  function render() { cursor = 0; tree = module.exports.SignupForm({ active: true, wide: true, onLogin() {} }) }
  async function click(label) {
    const button = nodes(tree).find(n => n.type === 'button' && text(n).trim() === label)
    assert.ok(button, label); assert.ok(!button.props.disabled, label + ' disabled')
    await button.props.onClick(); await new Promise(resolve => setImmediate(resolve)); render()
  }
  function field(label, value) {
    const field = nodes(tree).find(n => n.props?.label === label || n.props?.['aria-label'] === label)
    assert.ok(field, label); field.props.onChange({ target: { value } }); render()
  }
  render()
  return { calls, click, field, nodes: () => nodes(tree), text, async begin() { await click('전체 동의'); await click('다음'); await click('시연용으로 채우기'); field('이메일', 'user@example.com') } }
}

test('demo values do not bypass verification and typing six digits does not verify email', async () => {
  const h = harness(); await h.begin()
  assert.equal(h.nodes().find(n => n.type === 'button' && h.text(n) === '다음').props.disabled, true)
  await h.click('인증번호 받기'); h.field('이메일 인증번호', '123456')
  assert.equal(h.nodes().find(n => n.type === 'button' && h.text(n) === '다음').props.disabled, true)
  assert.deepEqual(h.calls.send, ['user@example.com'])
  assert.deepEqual(h.calls.signup, [])
})

test('wrong server code prevents proceeding and never creates a session', async () => {
  const h = harness({ rejectCode: true }); await h.begin(); await h.click('인증번호 받기')
  h.field('이메일 인증번호', '123456'); await h.click('인증 확인')
  assert.deepEqual(h.calls.verify, ['123456'])
  assert.equal(h.nodes().find(n => n.type === 'button' && h.text(n) === '다음').props.disabled, true)
  assert.deepEqual(h.calls.session, [])
})

test('confirmed email permits signup and changing email invalidates the confirmation', async () => {
  const h = harness(); await h.begin(); await h.click('인증번호 받기')
  h.field('이메일 인증번호', '123456'); await h.click('인증 확인')
  assert.equal(h.nodes().find(n => n.type === 'button' && h.text(n) === '다음').props.disabled, false)
  h.field('이메일', 'other@example.com')
  assert.equal(h.nodes().find(n => n.type === 'button' && h.text(n) === '다음').props.disabled, true)
})

test('signup after successful confirmation applies the returned session', async () => {
  const h = harness(); await h.begin(); await h.click('인증번호 받기')
  h.field('이메일 인증번호', '123456'); await h.click('인증 확인'); await h.click('다음')
  await h.click('아직 없어요'); await h.click('다음')
  assert.equal(h.calls.signup.length, 1)
  assert.equal(h.calls.signup[0].email, 'user@example.com')
  assert.equal(h.calls.session.length, 1)
})
