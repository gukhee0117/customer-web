import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/tokens.css'
import { apiErrorMessage } from '../../api/client'
import { signup, sendSignupCode, verifySignupCode } from '../../api/auth'
import type { SignupChallenge } from '../../api/auth'
import { useAuth } from '../../contexts/authState'
import { profileKeyOf, submitAssessment, syncAssessState } from '../../api/investor'
import { useInvestorSurvey } from '../assessment/useInvestorSurvey'
import { cx } from '../common/cx'
import { Toast } from '../common/Toast'
import { useToast } from '../common/useToast'
import { PW_MAX, pwCharsOk, pwChecks } from './passwordRule'
import { SignupQuiz } from './SignupQuiz'
import { SignupResult } from './SignupResult'
import type { ProfileKey } from './signupProfile'
import styles from './SignupForm.module.css'

interface SignupFormProps {
  active: boolean // 회원가입 탭이 선택돼 있는지(아니면 숨기되 입력값·단계는 유지)
  wide: boolean // 넓은 화면이면 이름·생년월일, 비밀번호·확인을 두 칸으로 나란히
  onLogin: () => void
}

const TERMS = [
  ['필수', '서비스 이용약관'],
  ['필수', '개인정보 수집·이용'],
  ['필수', '전자금융거래 이용약관'],
  ['선택', '마케팅 정보 수신']
]
const STEPS = ['약관 동의', '본인 정보', '투자성향 진단']
const PW_RULES = ['8자 이상', '영문+숫자', '특수문자']

type InfoKey = 'name' | 'birth' | 'rrn' | 'phone' | 'email' | 'uid' | 'pw' | 'pw2'
type Info = Record<InfoKey, string>

const EMPTY_INFO: Info = { name: '', birth: '', rrn: '', phone: '', email: '', uid: '', pw: '', pw2: '' }

const digits = (v: string) => (v || '').replace(/\D/g, '')
const phoneOk = (v: string) => /^01\d{8,9}$/.test(digits(v))
// 서버로 보내는 모양: 1994.05.17 → 1994-05-17, 01012345678 → 010-1234-5678
const isoBirth = (v: string) => digits(v).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')
const dashPhone = (v: string) => digits(v).replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3')

const CheckIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

interface FieldProps {
  active: boolean // 숨겨진 탭이면 입력을 막고 자동완성도 끔
  label: string
  span: number
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  type: string
  placeholder: string
  autoComplete: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
}

const Field = ({ active, label, span, value, onChange, type, placeholder, autoComplete, inputMode = 'text' }: FieldProps) => (
  <label className={styles.field} style={{ gridColumn: 'span ' + span }}>
    <span className={styles.label}>{label}</span>
    <input className={styles.input} type={type} inputMode={inputMode} value={value} onChange={onChange} placeholder={placeholder} autoComplete={active ? autoComplete : 'off'} disabled={!active} />
  </label>
)

// 약관 동의와 본인 정보 확인 후 가입하고 투자성향 진단을 진행한다.
export function SignupForm({ active, wide, onLogin }: SignupFormProps) {
  const navigate = useNavigate()
  const { applySession } = useAuth()
  const { message: toast, showToast } = useToast()
  const [step, setStep] = useState(0)
  const [terms, setTerms] = useState([false, false, false, false])
  const [info, setInfo] = useState<Info>(EMPTY_INFO)
  const [challenge, setChallenge] = useState<SignupChallenge | null>(null)
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [verifiedUntil, setVerifiedUntil] = useState(0)
  const [emailBusy, setEmailBusy] = useState(false)
  const emailRequestBusy = useRef(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const expiry = challenge ? Date.parse(challenge.expiresAt) : verifiedUntil
    if (!active || step > 1 || expiry <= 0) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= expiry) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [active, step, challenge, verifiedUntil])
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [qi, setQi] = useState(0)
  const survey = useInvestorSurvey()
  const [result, setResult] = useState<ProfileKey | null>(null)

  const soon = () => showToast('준비 중인 화면이에요')
  const setField = (k: InfoKey) => (e: ChangeEvent<HTMLInputElement>) => {
    if (k === 'email' && emailRequestBusy.current) return
    const v = e.target.value
    setInfo((st) => ({ ...st, [k]: v }))
    if (k === 'email') { setChallenge(null); setVerifiedEmail(''); setVerifiedUntil(0); setCode('') }
  }

  const allOn = terms.every(Boolean)
  const checks = pwChecks(info.pw)
  const emailVerified = verifiedEmail === info.email.trim() && verifiedUntil > now
  const cooldown = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000)) : 0
  const remaining = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000)) : 0
  const sendBtnLabel = emailVerified ? '인증 완료'
    : cooldown > 0 ? `재발송 (${cooldown}초 후)`
    : challenge ? '다시 받기'
    : '인증번호 받기'

  // 다음 버튼이 막힌 이유(비어 있으면 다음 가능)
  const reason = (): string => {
    if (step === 0) return terms.slice(0, 3).every(Boolean) ? '' : '필수 약관 3개에 모두 동의해 주세요'
    if (step === 1) {
      if (!info.name.trim()) return '이름을 입력해 주세요'
      if (digits(info.birth).length !== 8) return '생년월일 8자리를 입력해 주세요'
      if (digits(info.rrn).length !== 13) return '주민등록번호 13자리를 입력해 주세요'
      if (digits(info.rrn).slice(0, 6) !== digits(info.birth).slice(2)) return '주민등록번호 앞 6자리와 생년월일이 달라요'
      if (!phoneOk(info.phone)) return '휴대폰 번호를 입력해 주세요'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) return '이메일 주소를 확인해 주세요'
      if (!emailVerified) return '이메일 인증을 완료해 주세요'
      if (!/^[A-Za-z0-9]{4,20}$/.test(info.uid.trim())) return '아이디는 영문·숫자 4~20자예요'
      if (!pwCharsOk(info.pw)) return '비밀번호에는 공백·한글을 쓸 수 없어요'
      if (info.pw.length > PW_MAX) return '비밀번호는 ' + PW_MAX + '자 이하예요'
      if (!checks.every(Boolean)) return '비밀번호 조건을 모두 채워 주세요'
      if (info.pw2 !== info.pw) return '비밀번호가 서로 달라요'
      return ''
    }
    if (step === 2) {
      if (!survey.questions) return survey.error || '설문을 불러오는 중이에요'
      return survey.isAnswered(survey.questions[qi]) ? '' : survey.questions[qi].multiple ? '보기를 하나 이상 골라 주세요' : '보기를 하나 골라 주세요'
    }
    return ''
  }
  const why = reason()
  const nextDisabled = !!why || submitting || emailBusy
  const lastQuestion = !!survey.questions && qi === survey.questions.length - 1

  const goPrev = () => {
    if (step === 0) onLogin()
    else if (step === 2 && qi > 0) setQi(qi - 1)
    else setStep(step - 1)
  }
  // 본인 정보 확인이 끝나면 서버에 가입한다(가입하면 바로 로그인돼 투자성향 진단을 이어서 저장할 수 있다)
  const register = async (): Promise<boolean> => {
    if (!emailVerified) { showToast('이메일 인증을 다시 진행해 주세요'); setStep(1); return false }
    setSubmitting(true)
    try {
      const me = await signup({
        loginId: info.uid.trim(),
        password: info.pw,
        rrn: digits(info.rrn),
        name: info.name.trim(),
        birthDate: isoBirth(info.birth),
        phone: dashPhone(info.phone),
        email: info.email.trim()
      })
      applySession(me)
      await syncAssessState()
      return true
    } catch (err) {
      // Keep this one-off code check local; extract a shared helper if another caller needs it.
      const errorCode = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      if (errorCode === 'CUSTOMER_SIGNUP_CODE_INVALID') {
        setVerifiedEmail(''); setVerifiedUntil(0); setChallenge(null); setCode('')
      }
      showToast(apiErrorMessage(err, '가입하지 못했어요. 잠시 뒤 다시 시도해 주세요'))
      setStep(1)
      return false
    } finally {
      setSubmitting(false)
    }
  }
  // 설문 제출: 점수 계산과 성향 판정·저장은 서버가 한다. 결과 성향은 홈·추천에 바로 반영한다
  const finish = async (): Promise<boolean> => {
    setSubmitting(true)
    try {
      const res = await submitAssessment(survey.answers)
      const key = profileKeyOf(res.investorType)
      await syncAssessState()
      setResult(key)
      return true
    } catch (err) {
      showToast(apiErrorMessage(err, '설문을 제출하지 못했어요. 잠시 뒤 다시 시도해 주세요'))
      return false
    } finally {
      setSubmitting(false)
    }
  }
  // 설문을 건너뛰면 투자성향은 미진단으로 남고, 홈에서 진단하라는 안내가 보인다(가입은 이미 끝나 로그인된 상태)
  const skipQuiz = () => navigate('/home')
  const goNext = async () => {
    if (nextDisabled) return
    if (step === 1) {
      if (!(await register())) return
      survey.reset()
      void survey.load()
    }
    if (step === 2 && lastQuestion && !(await finish())) return
    if (step === 2 && !lastQuestion) {
      setQi(qi + 1)
      return
    }
    setStep(step + 1)
    if (step + 1 === 2) setQi(0)
  }

  const sendCode = async () => {
    if (emailRequestBusy.current || cooldown > 0) return
    const email = info.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('이메일 주소를 먼저 확인해 주세요'); return }
    emailRequestBusy.current = true
    setEmailBusy(true)
    setVerifiedEmail('')
    setVerifiedUntil(0)
    try {
      setChallenge(await sendSignupCode(email))
      setCode('')
      setNow(Date.now())
      showToast('이메일로 인증번호를 보냈어요')
    } catch (err) {
      showToast(apiErrorMessage(err, '인증번호를 보내지 못했어요'))
    } finally {
      emailRequestBusy.current = false
      setEmailBusy(false)
    }
  }

  const confirmCode = async () => {
    if (emailRequestBusy.current || !challenge || remaining === 0 || code.length !== 6) return
    emailRequestBusy.current = true
    setEmailBusy(true)
    try {
      const verified = await verifySignupCode(code)
      setVerifiedEmail(info.email.trim())
      setVerifiedUntil(Date.parse(verified.verifiedUntil))
      setChallenge(null)
      setCode('')
      setNow(Date.now())
      showToast('이메일 인증이 완료됐어요')
    } catch (err) {
      showToast(apiErrorMessage(err, '인증번호를 확인하지 못했어요'))
    } finally {
      emailRequestBusy.current = false
      setEmailBusy(false)
    }
  }

  const demoFill = () => {
    if (emailRequestBusy.current) return
    setInfo({ name: '김리아', birth: '1994.05.17', rrn: '9405172123456', phone: '010-1234-5678', email: '', uid: 'kimria', pw: 'returns!2026', pw2: 'returns!2026' })
    setChallenge(null)
    setVerifiedEmail('')
    setVerifiedUntil(0)
    setCode('')
  }

  return (
    <div className={styles.wrap} hidden={!active}>
      <ol className={styles.stepper} aria-label="가입 단계">
        {STEPS.map((label, i) => (
          <li key={label} className={styles.step} aria-current={i === step ? 'step' : 'false'}>
            <span className={cx(styles.bar, i <= step && styles.barOn)} />
            <span className={cx(styles.stepText, i <= step && styles.stepTextOn, i === step && styles.stepTextNow)}>
              <span className={cx(styles.stepNum, styles.tabular)}>{i + 1}</span>
              <span className={styles.stepLabel}>{label}</span>
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className={styles.section}>
          <h2 className={styles.title}>약관에 동의해 주세요</h2>
          <div className={styles.terms}>
            <button type="button" className={styles.allRow} onClick={() => setTerms(terms.map(() => !allOn))} aria-pressed={allOn}>
              <span className={cx(styles.box, styles.boxLg, allOn && styles.boxOn)}>
                <CheckIcon size={13} />
              </span>
              전체 동의
            </button>
            {TERMS.map(([tag, label], i) => (
              <div key={label} className={styles.termRow}>
                <button
                  type="button"
                  className={styles.termToggle}
                  onClick={() => setTerms((st) => st.map((v, j) => (j === i ? !v : v)))}
                  aria-pressed={terms[i]}
                >
                  <span className={cx(styles.box, terms[i] && styles.boxOn)}>
                    <CheckIcon size={12} />
                  </span>
                  <span className={cx(styles.tag, tag === '필수' && styles.tagRequired)}>[{tag}]</span>
                  <span className={styles.termLabel}>{label}</span>
                </button>
                <button type="button" className={styles.view} onClick={soon}>보기 ›</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={styles.section}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>본인 정보를 입력해 주세요</h2>
            <button type="button" className={styles.fill} disabled={emailBusy || submitting} onClick={demoFill}>시연용으로 채우기</button>
          </div>
          <div className={styles.grid}>
            <Field active={active} label="이름" span={wide ? 1 : 2} type="text" placeholder="김리아" autoComplete="name" value={info.name} onChange={setField('name')} />
            <Field active={active} label="생년월일" span={wide ? 1 : 2} type="text" placeholder="1994.01.01" autoComplete="bday" inputMode="numeric" value={info.birth} onChange={setField('birth')} />
            <Field active={active} label="주민등록번호" span={2} type="password" placeholder="숫자 13자리" autoComplete="off" inputMode="numeric" value={info.rrn} onChange={setField('rrn')} />
          </div>
          <div className={styles.grid}>
            <Field active={active} label="휴대폰" span={2} type="tel" placeholder="010-0000-0000" autoComplete="tel" inputMode="numeric" value={info.phone} onChange={setField('phone')} />
          </div>
          <div className={styles.fieldBlock}>
            <div className={cx(styles.row, styles.emailRow)}>
              <Field active={active && !emailBusy && !submitting} label="이메일" span={2} type="email" placeholder="ria@returns.co.kr" autoComplete="email" inputMode="email" value={info.email} onChange={setField('email')} />
              <button type="button" className={styles.outlineBtn} disabled={!active || emailBusy || submitting || cooldown > 0 || emailVerified} onClick={() => { void sendCode() }}>
                {sendBtnLabel}
              </button>
            </div>
            {challenge && <>
              <p className={styles.hint}>{challenge.maskedEmail} 주소로 보냈어요.</p>
              <div className={styles.codeRow}>
                <input className={cx(styles.input, styles.grow, styles.codeInput)} type="text" inputMode="numeric" maxLength={6}
                  value={code} onChange={e => setCode(digits(e.target.value).slice(0, 6))} placeholder="인증번호 6자리"
                  aria-label="이메일 인증번호" autoComplete="one-time-code" disabled={!active || emailBusy || remaining === 0} />
                <button type="button" className={styles.outlineBtn} disabled={!active || emailBusy || remaining === 0 || code.length !== 6} onClick={() => { void confirmCode() }}>인증 확인</button>
              </div>
              {remaining > 0
                ? <span className={styles.hint} aria-live="off">{remaining}초 남았어요</span>
                : <span className={styles.hint} role="status">인증번호가 만료됐어요. 다시 받아 주세요.</span>}
            </>}
            {emailVerified && <span className={styles.codeMsg} role="status">이메일 인증이 완료됐어요. 10분 안에 가입을 마쳐 주세요.</span>}
          </div>
          <div className={styles.grid}>
            <Field active={active} label="아이디" span={2} type="text" placeholder="4자 이상" autoComplete="username" value={info.uid} onChange={setField('uid')} />
            <Field active={active} label="비밀번호" span={wide ? 1 : 2} type="password" placeholder="8자 이상" autoComplete="new-password" value={info.pw} onChange={setField('pw')} />
            <Field active={active} label="비밀번호 확인" span={wide ? 1 : 2} type="password" placeholder="한 번 더 입력" autoComplete="new-password" value={info.pw2} onChange={setField('pw2')} />
          </div>
          <div className={styles.rules}>
            <span className={styles.rulesLabel}>비밀번호 조건</span>
            {PW_RULES.map((label, i) => (
              <span key={label} className={cx(styles.rule, checks[i] && styles.ruleOn)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {step === 2 && survey.questions && (
        <SignupQuiz
          question={survey.questions[qi]}
          qi={qi}
          total={survey.questions.length}
          isPicked={(v) => survey.isPicked(survey.questions![qi], v)}
          onPick={(v) => survey.pick(survey.questions![qi], v)}
        />
      )}
      {step === 2 && !survey.questions && (
        <div className={styles.section}>
          <h2 className={styles.title}>{survey.error || '설문을 불러오는 중이에요'}</h2>
          {survey.error && <button type="button" className={styles.outlineBtn} onClick={() => void survey.load()}>다시 불러오기</button>}
        </div>
      )}

      {step === 3 && result && <SignupResult name={info.name} profile={result} />}

      {step < 3 && (
        <div className={styles.nav}>
          <div className={styles.navRow}>
            {/* 가입은 설문 앞에서 끝나므로 첫 문항에서는 본인 정보로 돌아갈 수 없다 */}
            {!(step === 2 && qi === 0) && <button type="button" className={styles.prev} onClick={goPrev}>이전</button>}
            <button type="button" className={cx(styles.next, nextDisabled && styles.nextOff)} onClick={goNext} disabled={nextDisabled} aria-disabled={nextDisabled}>
              {step === 2 && lastQuestion ? '결과 보기' : '다음'}
            </button>
          </div>
          {step !== 0 && why && <span className={styles.reason}>{why}</span>}
          {step === 2 && <button type="button" className={styles.skip} onClick={skipQuiz}>건너뛰기</button>}
        </div>
      )}
      <div className={styles.login}>
        이미 계정이 있나요? <button type="button" className={styles.loginLink} onClick={onLogin}>로그인 ›</button>
      </div>
      <Toast message={toast} />
    </div>
  )
}
