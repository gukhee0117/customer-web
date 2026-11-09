import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { Tabs } from '../common/Tabs'
import { LoginForm } from './LoginForm'
import { LoginPhoto } from './LoginPhoto'
import { SignupForm } from './SignupForm'
import styles from './LoginScreen.module.css'

type Mode = 'login' | 'signup'

const TABS = [
  { key: 'login', label: '로그인' },
  { key: 'signup', label: '회원가입' }
]

const isWide = () => window.innerWidth > 1024
// 주소(#signup 또는 ?signup)에 signup이 있으면 회원가입 탭
const wantsSignup = () => /signup/.test(window.location.hash + window.location.search)

// 로그인·회원가입 화면 뼈대: 좌우 2분할(1024px 이하는 위아래), 탭, 탭 아래 내용 자리
export function LoginScreen() {
  const [wide, setWide] = useState(isWide)
  const [mode, setMode] = useState<Mode>(() => (wantsSignup() ? 'signup' : 'login'))

  useEffect(() => {
    const onResize = () => setWide(isWide())
    const onHash = () => {
      if (wantsSignup()) setMode('signup')
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  // 탭을 바꾸면 주소만 바꿈(회원가입은 #signup, 로그인은 해시 없음)
  const changeMode = (key: string) => {
    const next: Mode = key === 'signup' ? 'signup' : 'login'
    if (next === mode) return
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + (next === 'signup' ? '#signup' : ''))
    } catch {
      // 주소 갱신에 실패해도 탭은 바뀜
    }
    setMode(next)
  }

  return (
    <div className={wide ? styles.screenWide : styles.screenNarrow}>
      <LoginPhoto variant={wide ? 'wide' : 'narrow'} />
      <main className={wide ? styles.mainWide : styles.mainNarrow} data-screen-label="로그인 · 폼">
        <div className={styles.back}>
          <Link className={styles.backLink} to="/">‹ 뒤로</Link>
        </div>
        <div className={styles.center}>
          <div className={styles.column}>
            <Tabs variant="login" items={TABS} value={mode} onChange={changeMode} />
            <LoginForm active={mode === 'login'} onSignup={() => changeMode('signup')} />
            <SignupForm active={mode === 'signup'} wide={wide} onLogin={() => changeMode('login')} />
          </div>
        </div>
      </main>
    </div>
  )
}
