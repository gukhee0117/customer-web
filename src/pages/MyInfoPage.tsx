import { useEffect, useReducer, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Toast } from '../components/common/Toast'
import { cx } from '../components/common/cx'
import { useToast } from '../components/common/useToast'
import styles from '../components/myinfo/MyInfoLayout.module.css'
import { MyInfoAccountBox } from '../components/myinfo/MyInfoAccountBox'
import { MyInfoAssessDialog } from '../components/myinfo/MyInfoAssessDialog'
import { MyInfoBasicBox } from '../components/myinfo/MyInfoBasicBox'
import { MyInfoCommunityBox } from '../components/myinfo/MyInfoCommunityBox'
import { MyInfoConsentBox } from '../components/myinfo/MyInfoConsentBox'
import { MyInfoDevPanel } from '../components/myinfo/MyInfoDevPanel'
import { MyInfoNotifyBox } from '../components/myinfo/MyInfoNotifyBox'
import { MyInfoThemeBox } from '../components/myinfo/MyInfoThemeBox'
import { MyInfoRiskyNotice } from '../components/myinfo/MyInfoRiskyNotice'
import { MyInfoProfileBox } from '../components/myinfo/MyInfoProfileBox'
import { MyInfoLoginsBox } from '../components/myinfo/MyInfoLoginsBox'
import { MyInfoPwDialog } from '../components/myinfo/MyInfoPwDialog'
import { MyInfoSecurityBox } from '../components/myinfo/MyInfoSecurityBox'
import { MyInfoTradeBox } from '../components/myinfo/MyInfoTradeBox'
import { HIST_KEY, assessState, readHist } from '../components/myinfo/myinfoProfile'
import { useAppShell } from '../layouts/appShell'
import { RETURNS_DATA as RD } from '../data/returns'
import type { ProfileKey } from '../data/returns'
import { F } from '../lib/calc'
import { useDocumentTitle } from '../components/common/useDocumentTitle'

const HASH_BOXES = ['assess', 'notify', 'theme']
const INPUTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] // 사용자가 직접 움직였다는 신호

// 내 정보 — 틀(박스 10개 자리) + 박스들 + 주소 해시 이동
export function MyInfoPage() {
  useDocumentTitle('Returns 내 정보')
  const shell = useAppShell()
  const { hash } = useLocation()
  const { message: toast, showToast } = useToast()
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const [riskyHide, setRiskyHide] = useState(false)
  const [hist, setHist] = useState(readHist)
  const [asOpen, setAsOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const firstHash = useRef(true)
  const fontWatch = useRef<(() => void) | undefined>(undefined)
  const profLabel = RD.PROFILES[RD.CUSTOMER.profile]?.label

  // 시연 설정(성향 상태 등)이 바뀌면 다시 그림
  useEffect(() => {
    const onDemo = () => {
      setRiskyHide(false) // 원본: 시연 설정이 바뀌면 '30일 동안 보지 않기'도 풀림
      refresh()
    }
    window.addEventListener('returns-demo', onDemo)
    return () => window.removeEventListener('returns-demo', onDemo)
  }, [])

  useEffect(() => {
    shell.setTopBar({ profLabel })
    return () => shell.setTopBar({})
  }, [shell, profLabel])

  // 원본 goHash: 80px 아래로 부드럽게 스크롤 + 테두리 1.5초 강조. 처음 들어올 때는 0.3초 뒤, 같은 화면에서 해시만 바뀌면 바로
  useEffect(() => {
    const id = hash.slice(1)
    if (!HASH_BOXES.includes(id)) return
    const go = () => {
      const el = document.getElementById(id)
      if (!el) return
      const toTop = () => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
      toTop()
      // 글꼴이 이동 중에 들어오면 박스가 밀리므로, 글꼴 로딩이 끝날 때 한 번 더 맞춤(그 사이 사용자가 직접 움직였으면 하지 않음)
      fontWatch.current?.()
      if (document.fonts.status === 'loading') {
        const stop = () => {
          document.fonts.removeEventListener('loadingdone', again)
          INPUTS.forEach((ev) => window.removeEventListener(ev, stop, true))
          clearTimeout(limit)
          fontWatch.current = undefined
        }
        const again = () => {
          toTop()
          if (document.fonts.status !== 'loading') stop()
        }
        const limit = setTimeout(stop, 1500)
        document.fonts.addEventListener('loadingdone', again)
        INPUTS.forEach((ev) => window.addEventListener(ev, stop, true))
        fontWatch.current = stop
      }
      setFlash(id)
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(null), 1500)
    }
    if (firstHash.current) {
      firstHash.current = false
      const t = setTimeout(go, 300)
      return () => clearTimeout(t)
    }
    go()
  }, [hash])
  useEffect(() => () => {
    clearTimeout(flashTimer.current)
    fontWatch.current?.()
  }, [])

  const openAssess = () => setAsOpen(true)

  // 원본 "이 결과로 저장": 진단 이력 맨 앞에 추가(날짜는 업무일) + 시연 설정의 성향 바꿈 → 홈·추천·상단 바에 바로 반영
  const saveAssess = (score: number, profile: string) => {
    const base = hist ?? [{ date: RD.ASSESSMENT.date, score: RD.ASSESSMENT.score, profile: RD.ASSESSMENT.profile }]
    const next = [{ date: F.today(), score, profile }, ...base]
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(next))
    } catch {
      // 저장소를 못 쓰면 이번 화면에서만 반영
    }
    setHist(next)
    setAsOpen(false)
    RD.setDemo({ profile: profile as ProfileKey, assess: 'ok' })
    showToast('투자성향을 저장했어요 · 홈·추천에 바로 반영돼요')
  }

  return (
    <>
      <h1 className={styles.srOnly}>내 정보</h1>
      <div className={styles.page}>
        <div className={styles.col}>
          <MyInfoProfileBox className={cx(styles.profile, styles.flashable, flash === 'assess' && styles.flashOn)} hist={hist} onOpenAssess={openAssess} />
          {assessState() === 'risky' && !riskyHide && (
            <MyInfoRiskyNotice
              className={styles.trade}
              onOpenAssess={openAssess}
              onSnooze={() => {
                setRiskyHide(true)
                showToast('30일 동안 이 안내를 보지 않아요')
              }}
            />
          )}
          {assessState() !== 'none' && <MyInfoTradeBox className={styles.trade} onOpenAssess={openAssess} />}
          <MyInfoBasicBox className={styles.basic} onToast={showToast} />
          <MyInfoAccountBox className={styles.account} onToast={showToast} />
          <MyInfoCommunityBox className={styles.community} onToast={showToast} />
        </div>
        <div className={styles.col}>
          <MyInfoNotifyBox id="notify" className={cx(styles.notify, styles.flashable, flash === 'notify' && styles.flashOn)} onToast={showToast} />
          <div className={styles.pair}>
            <MyInfoConsentBox className={styles.consent} onToast={showToast} />
            <MyInfoThemeBox id="theme" className={cx(styles.theme, styles.flashable, flash === 'theme' && styles.flashOn)} onToast={showToast} />
          </div>
          <MyInfoSecurityBox className={styles.security} onToast={showToast} onOpenPw={() => setPwOpen(true)} />
          <MyInfoLoginsBox className={styles.logins} />
        </div>
      </div>
      <p className={styles.note}>개인정보는 화면에 일부만 보여드려요 · 리턴증권은 교육용 프로젝트의 가상 증권사입니다</p>
      {asOpen && <MyInfoAssessDialog onClose={() => setAsOpen(false)} onSave={saveAssess} />}
      {pwOpen && (
        <MyInfoPwDialog
          onClose={() => setPwOpen(false)}
          onDone={() => {
            setPwOpen(false)
            showToast('비밀번호를 변경했어요')
          }}
        />
      )}
      <MyInfoDevPanel onChange={(assess) => RD.setDemo({ assess })} />
      <Toast message={toast} />
    </>
  )
}
