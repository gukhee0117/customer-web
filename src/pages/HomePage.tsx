import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Toast } from '../components/common/Toast'
import { useToast } from '../components/common/useToast'
import { useSellLimit } from '../components/account/useSellLimit'
import { HomeAssessModal } from '../components/home/HomeAssessModal'
import { HomeBriefBox } from '../components/home/HomeBriefBox'
import { HomeChatBox } from '../components/home/HomeChatBox'
import { HomeDevPanel } from '../components/home/HomeDevPanel'
import { HomePackageBox } from '../components/home/HomePackageBox'
import { HomeTendencyBox } from '../components/home/HomeTendencyBox'
import { HomeNewsBox } from '../components/home/HomeNewsBox'
import { HomeProfileBox } from '../components/home/HomeProfileBox'
import { BOT_CHIPS, WELCOME_MS } from '../components/home/homeBotData'
import { homeTodos } from '../components/home/homeBotLogic'
import { DISCLAIMER } from '../components/home/homeChatData'
import styles from '../components/home/HomeLayout.module.css'
import { RETURNS_DATA as RD, demo } from '../data/returns'
import type { DemoSettings } from '../data/returns'
import { useAppShell } from '../layouts/appShell'
import { F } from '../lib/calc'
import { getProfile } from '../api/profile'
import type { Profile } from '../api/profile'
import { useDocumentTitle } from '../components/common/useDocumentTitle'
import { useStream } from '../api/useChatStream'


// 홈 — 1~6번째 부분: 배치 + 박스 6개 + 아래 고지 + 상담 창·알림·성향 알림 창·환영 배너·시연 설정
export function HomePage() {
  useDocumentTitle('Returns 홈')
  const shell = useAppShell()
  const { hash } = useLocation()
  const { message: toast, showToast } = useToast()
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const stream = useStream()
  // 첫 마운트 시 대화가 비어 있으면 홈 인사말 추가 (페이지 이동 후 돌아오면 이력 유지)
  const { messages: bot, busy, send, cancel } = stream
  const streamRef = useRef(stream)
  streamRef.current = stream
  const greetingAdded = useRef(false)
  useEffect(() => {
    if (!greetingAdded.current) {
      greetingAdded.current = true
      if (streamRef.current.messages.length === 0)
        streamRef.current.addMessages([{ kk: true, text: 'RIA 계좌·세액·인출 일정에 대해 물어보세요.' }])
    }
  }, []) // intentional: mount only
  const [aClosed, setAClosed] = useState<string | null>(null)
  const [welcome, setWelcome] = useState(hash === '#new')
  const { state: limit, retry: retryLimit } = useSellLimit()
  const remainingLimit = limit.status === 'live' ? limit.data.remainingLimit : null
  const [prof, setProf] = useState<Profile | null>(null) // 서버 프로필(이름·계좌). 못 받으면 null → 이름 '-'·계좌는 목업
  useEffect(() => {
    getProfile().then(setProf).catch(() => {})
  }, [])

  const assess = demo().assess || 'ok'
  const profLabel = RD.PROFILES[RD.CUSTOMER.profile].label
  const modalKind = (assess === 'risky' || assess === 'expired') && aClosed !== assess ? assess : null

  useEffect(() => {
    if (!welcome) return
    const t = setTimeout(() => setWelcome(false), WELCOME_MS)
    return () => clearTimeout(t)
  }, [welcome])

  // 상단 종 알림: 오늘 확인할 일 + 안 읽은 알림 수(info 아닌 것)
  const todos = homeTodos(showToast, remainingLimit)
  const todoKey = todos.map((t) => t.title + t.desc).join('|')
  useEffect(() => {
    const list = homeTodos(showToast, remainingLimit)
    shell.setTopBar({ todos: list, todoDate: F.short(F.today()), todoAlert: list.filter((t) => t.level !== 'info').length, profLabel })
  }, [todoKey, profLabel, shell, showToast, remainingLimit])

  const ask = useCallback((q: string) => { send(q) }, [send])
  // 페이지 이탈 시 진행 중인 스트리밍 취소
  useEffect(() => () => { cancel() }, [cancel])

  const chat = useMemo(
    () => ({ messages: bot, busy, chips: BOT_CHIPS.map((label) => ({ label, onClick: () => ask(label) })), onSend: ask }),
    [bot, busy, ask]
  )
  useEffect(() => {
    shell.setChat(chat)
  }, [shell, chat])
  useEffect(
    () => () => {
      shell.setChat(null)
      shell.setBotOpen(false)
      shell.setTopBar({})
      // reset 호출 안 함 — 페이지 이동 시 대화 이력 유지
    },
    [shell]
  )

  const changeDemo = (patch: Partial<DemoSettings>) => {
    if (patch.assess !== undefined) setAClosed(null)
    RD.setDemo(patch)
    refresh()
  }

  return (
    <>
      {welcome && (
        <div className={styles.welcome} role="status">
          {prof?.name ?? '-'} 님, 가입을 환영해요
        </div>
      )}
      <div className={styles.page}>
        <div className={styles.colMain}>
          <HomeNewsBox className={styles.news} />
          <div className={styles.pair}>
            <HomePackageBox className={styles.pkg} opened={prof?.account?.status === 'OPENED'} />
            <HomeTendencyBox className={styles.rec} />
          </div>
        </div>
        <div className={styles.colSide}>
          <HomeProfileBox className={styles.prof} prof={prof} limit={limit} onRetryLimit={retryLimit} />
          <HomeBriefBox className={styles.tax} />
          <HomeChatBox className={styles.chat} />
        </div>
      </div>
      <p className={styles.note}>{DISCLAIMER}</p>
      {modalKind && <HomeAssessModal kind={modalKind} profLabel={profLabel} onClose={() => setAClosed(assess)} />}
      <HomeDevPanel onChange={changeDemo} />
      <Toast message={toast} />
    </>
  )
}
