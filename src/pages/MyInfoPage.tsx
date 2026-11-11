import { useEffect, useReducer, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchAssessStatus, profileKeyOf, syncAssessState } from '../api/investor'
import type { InvestorStatus } from '../api/investor'
import { getProfile } from '../api/profile'
import type { Profile } from '../api/profile'
import { Toast } from '../components/common/Toast'
import { cx } from '../components/common/cx'
import { useToast } from '../components/common/useToast'
import styles from '../components/myinfo/MyInfoLayout.module.css'
import { MyInfoAccountBox } from '../components/myinfo/MyInfoAccountBox'
import { MyInfoAssessDialog } from '../components/myinfo/MyInfoAssessDialog'
import { MyInfoBasicBox } from '../components/myinfo/MyInfoBasicBox'
import { MyInfoCommunityBox } from '../components/myinfo/MyInfoCommunityBox'
import { MyInfoConsentBox } from '../components/myinfo/MyInfoConsentBox'
import { MyInfoNotifyBox } from '../components/myinfo/MyInfoNotifyBox'
import { MyInfoProfileBox } from '../components/myinfo/MyInfoProfileBox'
import { MyInfoRiskyNotice } from '../components/myinfo/MyInfoRiskyNotice'
import { MyInfoLoginsBox } from '../components/myinfo/MyInfoLoginsBox'
import { MyInfoPwDialog } from '../components/myinfo/MyInfoPwDialog'
import { MyInfoSecurityBox } from '../components/myinfo/MyInfoSecurityBox'
import { MyInfoTradeBox } from '../components/myinfo/MyInfoTradeBox'
import { assessState, isTradeRisky } from '../components/myinfo/myinfoProfile'
import { isRiskySnoozed, snoozeRisky } from '../components/myinfo/riskySnooze'
import { useTendency } from '../components/invest/useNewPkgData'
import type { AssessHistItem } from '../components/myinfo/myinfoProfile'
import { useDocumentTitle } from '../components/common/useDocumentTitle'
import { useAuth } from '../contexts/authState'

const HASH_BOXES = ['assess', 'notify']
const INPUTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] // 사용자가 직접 움직였다는 신호

// 내 정보 — 틀(박스 10개 자리) + 박스들 + 주소 해시 이동
export function MyInfoPage() {
  useDocumentTitle('Returns 내 정보')
  const { auth } = useAuth()
  const { hash } = useLocation()
  const { message: toast, showToast } = useToast()
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const [asOpen, setAsOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  // 서버 프로필(기본 정보·커뮤니티 박스가 같이 씀). 못 받으면 null + 다시 불러오기
  const [prof, setProf] = useState<Profile | null>(null)
  const [profErr, setProfErr] = useState(false)
  const [profTries, setProfTries] = useState(0)
  const [assessStatus, setAssessStatus] = useState<InvestorStatus | null>(null) // 서버 진단일·만료일
  const loadAssessStatus = () => fetchAssessStatus().then(setAssessStatus).catch(() => {})
  useEffect(() => {
    void loadAssessStatus()
  }, [])
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const firstHash = useRef(true)
  const fontWatch = useRef<(() => void) | undefined>(undefined)
  // 진단 이력은 서버 값(최신이 위). 프로필을 받기 전엔 null
  const hist: AssessHistItem[] | null = prof
    ? [...prof.assessmentHistory]
        .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))
        .map((h) => ({ date: h.assessedAt.slice(0, 10), score: h.totalScore, profile: profileKeyOf(h.investorType) }))
    : null

  useEffect(() => {
    let alive = true
    getProfile()
      .then((p) => alive && setProf((prev) => prev ?? p)) // 저장 응답이 먼저 와 있으면 늦게 온 조회로 덮지 않는다
      .catch(() => alive && setProfErr(true))
    return () => {
      alive = false
    }
  }, [profTries])

  const tendency = useTendency()
  const [riskyHide, setRiskyHide] = useState(false) // 이번에 '보지 않기'를 누르면 바로 숨김(저장은 riskySnooze)
  // 서버 진단 상태·성향이 바뀌면(로그인·세션 복원 동기화, 재진단) 다시 그림
  useEffect(() => {
    window.addEventListener('returns-state', refresh)
    return () => window.removeEventListener('returns-state', refresh)
  }, [])

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

  // 재진단 제출 직후(창은 결과 화면 그대로): 서버 프로필을 다시 받아 이력에 반영 + 서버 성향을 다시 받음 → 홈·추천·상단 바에 반영
  const saveAssess = () => {
    getProfile().then(setProf).catch(() => {})
    void syncAssessState() // 서버 성향·진단 상태를 다시 받아 홈·추천·상단 바에 반영
    void loadAssessStatus()
    showToast('투자성향을 저장했어요 · 홈·추천에 바로 반영돼요')
  }

  return (
    <>
      <h1 className={styles.srOnly}>내 정보</h1>
      <div className={styles.page}>
        <div className={styles.col}>
          <MyInfoProfileBox className={cx(styles.profile, styles.flashable, flash === 'assess' && styles.flashOn)} hist={hist} name={prof?.name} status={assessStatus} onOpenAssess={openAssess} />
          {isTradeRisky(tendency.data) && !riskyHide && !isRiskySnoozed() && (
            <MyInfoRiskyNotice
              className={styles.trade}
              onOpenAssess={openAssess}
              onSnooze={() => {
                snoozeRisky()
                setRiskyHide(true)
                showToast('30일 동안 이 안내를 보지 않아요')
              }}
            />
          )}
          {assessState() !== 'none' && <MyInfoTradeBox className={styles.trade} onOpenAssess={openAssess} />}
          <MyInfoBasicBox className={styles.basic} loginId={auth.status === 'authenticated' ? auth.me.loginId : undefined} onToast={showToast} prof={prof} loadErr={profErr} onProfile={setProf} onRetry={() => { setProfErr(false); setProfTries((n) => n + 1) }} />
          <MyInfoAccountBox className={styles.account} onToast={showToast} account={prof?.account} loaded={prof != null} />
        </div>
        <div className={styles.col}>
          <MyInfoNotifyBox id="notify" className={cx(styles.notify, styles.flashable, flash === 'notify' && styles.flashOn)} onToast={showToast} email={prof?.email} />
          <div className={styles.pair}>
            <MyInfoConsentBox className={styles.consent} onToast={showToast} />
            <MyInfoCommunityBox className={styles.community} onToast={showToast} nickname={prof ? prof.nickname ?? '아직 없어요' : '-'} pub={prof?.investorTypePublic} />
          </div>
          <MyInfoSecurityBox className={styles.security} onToast={showToast} onOpenPw={() => setPwOpen(true)} />
          <MyInfoLoginsBox className={styles.logins} />
        </div>
      </div>
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
      <Toast message={toast} />
    </>
  )
}
