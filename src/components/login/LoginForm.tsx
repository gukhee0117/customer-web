import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/tokens.css'
import { useAuth } from '../../contexts/authState'
import { cx } from '../common/cx'
import { Toast } from '../common/Toast'
import { useToast } from '../common/useToast'
import styles from './LoginForm.module.css'

interface LoginFormProps {
  active: boolean // 로그인 탭이 선택돼 있는지(아니면 숨기되 입력값은 유지)
  onSignup: () => void
}

export function LoginForm({ active, onSignup }: LoginFormProps) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { message: toast, showToast } = useToast()
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loginErr, setLoginErr] = useState('')
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  // 탭을 바꾸면 오류 문구는 지움(입력값은 유지)
  const [prevActive, setPrevActive] = useState(active)
  if (prevActive !== active) {
    setPrevActive(active)
    if (!active) setLoginErr('')
  }

  const onId = (e: ChangeEvent<HTMLInputElement>) => {
    setLoginId(e.target.value)
    setLoginErr('')
  }
  const onPw = (e: ChangeEvent<HTMLInputElement>) => {
    setLoginPw(e.target.value)
    setLoginErr('')
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const id = loginId.trim() || 'user000001' // 시연 모드: 빈 입력 → 시연 계정
    const pw = loginPw || '123'
    setLoading(true)
    setLoginErr('')
    try {
      await login(id, pw)
      navigate('/home')
    } catch (err: unknown) {
      setLoading(false)
      const code =
        err &&
        typeof err === 'object' &&
        'response' in err
          ? (err as { response?: { data?: { code?: string } } }).response?.data?.code
          : undefined
      if (code === 'CUSTOMER_LOGIN_FAILED') {
        setLoginErr('아이디 또는 비밀번호를 확인해 주세요')
      } else {
        setLoginErr('로그인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요')
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    void onSubmit(e)
  }

  const inputClass = cx(styles.input, loginErr && styles.inputError)

  return (
    <div className={styles.wrap} hidden={!active}>
      <div>
        <h2 className={styles.title}>다시 만나서 반가워요</h2>
        <p className={styles.lead}>로그인하고 내 RIA 계좌를 이어서 관리하세요</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>아이디</span>
          <input className={inputClass} type="text" value={loginId} onChange={onId} placeholder="아이디를 입력해 주세요" autoComplete={active ? 'username' : 'off'} disabled={!active} />
        </label>
        <div className={styles.field}>
          <label className={styles.field}>
            <span className={styles.label}>비밀번호</span>
            <span className={styles.pwWrap}>
              <input className={cx(inputClass, styles.pwInput)} type={showPw ? 'text' : 'password'} value={loginPw} onChange={onPw} placeholder="비밀번호를 입력해 주세요" autoComplete={active ? 'current-password' : 'off'} disabled={!active} />
              <button type="button" className={styles.eye} onClick={() => setShowPw((v) => !v)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}>
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                    <path d="m2 2 20 20" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          {loginErr && <span className={styles.error} role="alert">{loginErr}</span>}
          <span className={styles.hint}>시연 계정: 입력 없이 로그인하면 user000001 / 123으로 들어가요</span>
        </div>
        <div className={styles.options}>
          <button type="button" className={styles.remember} onClick={() => setRemember((v) => !v)} aria-pressed={remember}>
            <span className={cx(styles.box, remember && styles.boxOn)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            로그인 상태 유지
          </button>
          <button type="button" className={styles.find} onClick={() => showToast('준비 중인 화면이에요')}>아이디 · 비밀번호 찾기</button>
        </div>
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading && <span className={styles.spinner} />}
          {loading ? '로그인 중' : '로그인'}
        </button>
      </form>
      <div className={styles.signup}>
        처음이신가요? <button type="button" className={styles.signupLink} onClick={onSignup}>회원가입 ›</button>
      </div>
      <Toast message={toast} />
    </div>
  )
}
