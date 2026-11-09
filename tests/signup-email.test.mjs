import test from 'node:test'
import assert from 'node:assert/strict'
import { componentHarness } from './helpers/componentHarness.mjs'

function harness({ rejectCode = false, signupError, windowMs = 600000 } = {}) {
  const calls = { send: [], verify: [], signup: [], session: [], toast: [] }
  let view
  view = componentHarness('components/login/SignupForm.tsx', 'SignupForm', { active: true, wide: true, onLogin() {} }, name => {
    if (name === 'react-router-dom') return { useNavigate: () => () => {} }
    if (name.endsWith('.css')) return {}
    if (name.endsWith('/auth')) return {
      sendSignupCode: async email => { calls.send.push(email); return { maskedEmail: 'u***@example.com', expiresAt: new Date(view.now() + 300000).toISOString(), resendAvailableAt: new Date(view.now() + 60000).toISOString() } },
      verifySignupCode: async code => { calls.verify.push(code); if (rejectCode) throw new Error('wrong'); return { verifiedUntil: new Date(view.now() + windowMs).toISOString() } },
      signup: async body => { calls.signup.push(body); if (signupError) throw signupError; return { customerId: 7 } },
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
  })
  return { ...view, calls, field: view.input, async begin() { await view.click('전체 동의'); await view.click('다음'); await view.click('시연용으로 채우기'); view.input('이메일', 'user@example.com') } }
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

test('confirmed details create a session and proceed directly to assessment without account linking', async () => {
  const h = harness(); await h.begin(); await h.click('인증번호 받기')
  h.field('이메일 인증번호', '123456'); await h.click('인증 확인'); await h.click('다음')
  assert.equal(h.calls.signup.length, 1)
  assert.equal(h.calls.signup[0].email, 'user@example.com')
  assert.equal(h.calls.session.length, 1)
  assert.ok(h.nodes().some(n => h.text(n).includes('설문을 불러오는 중이에요')))
  assert.ok(!h.nodes().some(n => h.text(n).includes('RIA 계좌 연결')))
  assert.equal(h.button('건너뛰기').props.disabled, undefined)
})

async function confirm(h) {
  await h.begin(); await h.click('인증번호 받기'); h.field('이메일 인증번호', '123456'); await h.click('인증 확인')
}

test('lost server verification clears the completed state and permits requesting another code', async () => {
  const h = harness({ signupError: { response: { data: { code: 'CUSTOMER_SIGNUP_CODE_INVALID' } } } })
  await confirm(h); await h.click('다음')
  assert.equal(h.button('인증번호 받기').props.disabled, false)
  await h.click('인증번호 받기'); assert.equal(h.calls.send.length, 2)
  assert.equal(h.calls.session.length, 0)
})

test('the server verifiedUntil controls expiration and idle form has no timer', async () => {
  const h = harness({ windowMs: 2000 }); assert.equal(h.timerCount(), 0)
  await confirm(h); assert.equal(h.button('다음').props.disabled, false)
  h.advance(3000); assert.equal(h.button('다음').props.disabled, true)
  assert.equal(h.timerCount(), 0)
})

test('same-tick duplicate send and confirmation each make only one request', async () => {
  const h = harness(); await h.begin()
  const send = h.button('인증번호 받기'); send.props.onClick(); send.props.onClick(); await h.flush()
  assert.equal(h.calls.send.length, 1)
  h.field('이메일 인증번호', '123456')
  const confirm = h.button('인증 확인'); confirm.props.onClick(); confirm.props.onClick(); await h.flush()
  assert.equal(h.calls.verify.length, 1)
})

test('countdown does not announce every second and expiration announces once', async () => {
  const h = harness(); await h.begin(); await h.click('인증번호 받기')
  const countdown = h.nodes().find(n => h.text(n).endsWith('초 남았어요') && n.type === 'span')
  assert.equal(countdown.props['aria-live'], 'off'); assert.equal(countdown.props.role, undefined)
  h.advance(301000)
  assert.ok(h.nodes().some(n => n.props?.role === 'status' && h.text(n).includes('인증번호가 만료됐어요')))
})

test('demo fill leaves the recipient blank and never sends to a dummy address', async () => {
  const h = harness(); await h.click('전체 동의'); await h.click('다음'); await h.click('시연용으로 채우기')
  assert.equal(h.nodes().find(n => n.props?.label === '이메일').props.value, '')
  await h.click('인증번호 받기'); assert.equal(h.calls.send.length, 0)
})
