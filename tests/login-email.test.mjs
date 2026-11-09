import test from 'node:test'
import assert from 'node:assert/strict'
import { componentHarness } from './helpers/componentHarness.mjs'

function harness() {
  const calls = { login: [], navigate: [], sync: 0 }
  const view = componentHarness('components/login/LoginForm.tsx', 'LoginForm', { active: true, onSignup() {} }, name => {
    if (name === 'react-router-dom') return { useNavigate: () => path => calls.navigate.push(path) }
    if (name.endsWith('/investor')) return { syncAssessState: async () => { calls.sync++ } }
    if (name.endsWith('/authState')) return { useAuth: () => ({ login: async (...args) => { calls.login.push(args) } }) }
    if (name.endsWith('/client')) return { apiErrorMessage: (_, fallback) => fallback }
    if (name.endsWith('/cx')) return { cx: () => '' }
    if (name.endsWith('/Toast')) return { Toast: 'toast' }
    if (name.endsWith('/useToast')) return { useToast: () => ({ message: '', showToast() {} }) }
    throw new Error(name)
  })
  return { ...view, calls, async begin() { view.input('아이디를 입력해 주세요', 'customer1'); view.input('비밀번호를 입력해 주세요', 'password'); await view.submit() } }
}

test('existing customers log in using only ID and password and enter home', async () => {
  const h = harness(); await h.begin()
  assert.deepEqual(h.calls.login, [['customer1', 'password']])
  assert.equal(h.calls.sync, 1)
  assert.deepEqual(h.calls.navigate, ['/home'])
  assert.equal(h.nodes().some(n => n.type === 'input' && n.props.autoComplete === 'one-time-code'), false)
})
