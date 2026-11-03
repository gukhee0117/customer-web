import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../../styles/tokens.css'
import { RETURNS_DATA } from '../../data/returns'
import { F } from '../../lib/calc'
import { assetUrl } from './assetUrl'
import { cx } from './cx'
import { getSessionName } from '../login/loginSession'
import { useAuth } from '../../contexts/authState'
import { Modal } from './Modal'
import { Toast } from './Toast'
import { useToast } from './useToast'
import styles from './TopBar.module.css'

export type TopBarActive = 'home' | 'account' | 'invest' | 'community' | 'myinfo'

export interface TopBarTodo {
  tag: string
  tagColor?: string // CSS 색(예: 'var(--color-red)')
  title: string
  desc: string
  to: string
  link: string
  onClick?: (e: MouseEvent) => void
}

interface TopBarProps {
  active?: TopBarActive
  bizDot?: string // 업무일 표시(기본: 업무일 → 'YYYY.MM.DD')
  profLabel?: string // 투자성향 진단 알림에 붙는 성향 이름
  noSearch?: boolean
  simpleUserMenu?: boolean // 사용자 메뉴에 '내 정보'만
  todos?: TopBarTodo[]
  todoDate?: string
  todoAlert?: number // 안 읽은 알림 수에 더할 개수
}

// ===== 로그인 30분 세션 (sessionStorage 키는 원본 그대로 · 페이지를 옮겨도 이어짐) =====
// 세션은 실제 경과 시간이므로 업무일이 아니라 Date.now()를 쓴다.
const WARN_S = 300
const KEY_EXP = 'returns-session-exp'
const KEY_WARNED = 'returns-session-warned'
const KEY_LOGOUT_NOTICE = 'returns-logout-notice'
// 관리자 정산 배치 → 고객 알림 시연(localStorage · 실제 앱은 SSE)
const KEY_PUSH = 'returns-push'
const KEY_PUSH_SHOWN = 'returns-push-shown'
const KEY_PUSH_READ = 'returns-push-read'

interface PushNote {
  id: string
  text: string
  date: string
}

const ssGet = (k: string): string | null => {
  try {
    return sessionStorage.getItem(k)
  } catch {
    return null
  }
}
const ssSet = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v)
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 유지
  }
}
const ssDel = (k: string) => {
  try {
    sessionStorage.removeItem(k)
  } catch {
    // 저장소를 못 쓰면 지울 것도 없음
  }
}
const lsJson = <T,>(k: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || 'null')
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}
const lsSetJson = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 유지
  }
}

const readPush = (): PushNote[] => {
  const seen: Record<string, boolean> = {}
  const out: PushNote[] = []
  ;(lsJson<PushNote[]>(KEY_PUSH, []) || []).forEach((n) => {
    if (n && n.id && !seen[n.id]) {
      seen[n.id] = true
      out.push(n)
    }
  })
  return out
}

// 첫 화면의 만료 시각: 저장된 값을 그대로 읽음. ?session=초 로 시연용 지정 가능
// 세션이 없거나 만료되어도 임의 30분을 새로 만들지 않음 — 만료 처리는 auth.status가 담당
const initSession = (): number => {
  try {
    const exp = Number(sessionStorage.getItem(KEY_EXP) || '0')
    const m = /[?&]session=(\d+)/.exec(window.location.search)
    if (m) return Date.now() + Number(m[1]) * 1000
    return exp // 0이면 00:00 표시
  } catch {
    return 0
  }
}

const mmss = (sec: number): string => {
  const s = Math.max(0, sec)
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

const MENU: { key: TopBarActive; label: string; to: string }[] = [
  { key: 'home', label: '홈', to: '/home' },
  { key: 'account', label: '내 계좌', to: '/account' },
  { key: 'invest', label: '주식 패키지', to: '/invest' },
  { key: 'community', label: '커뮤니티', to: '/community' }
]

const USER_ITEMS: { label: string; hash: string }[] = [
  { label: '내 정보', hash: '' },
  { label: '알림 설정', hash: 'notify' },
  { label: '테마', hash: 'theme' }
]

export function TopBar({ active = 'home', bizDot, profLabel, noSearch = false, simpleUserMenu = false, todos = [], todoDate = '', todoAlert = 0 }: TopBarProps) {
  const navigate = useNavigate()
  const { logout: authLogout, extend: authExtend, auth } = useAuth()
  const customerName = auth.status === 'authenticated' ? auth.me.name : getSessionName()
  const { message: toast, showToast } = useToast()

  const [wide, setWide] = useState(() => window.innerWidth >= 1100)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifRead, setNotifRead] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [secHash, setSecHash] = useState(() => hashSection())
  const [exp, setExp] = useState(initSession)
  const [now, setNow] = useState(() => Date.now())
  const [warnOpen, setWarnOpen] = useState(false)
  const [push, setPush] = useState<PushNote[]>(() => readPush())

  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const ended = useRef(false)

  const endSession = useCallback(
    (timeout: boolean) => {
      ended.current = true
      if (timeout) ssSet(KEY_LOGOUT_NOTICE, '1')
      void authLogout().then(() => navigate('/'))
    },
    [authLogout, navigate]
  )

  const extend = () => {
    setWarnOpen(false)
    void authExtend()
      .then(() => {
        // AuthContext.extend가 setLoginSession을 호출했으므로 새 exp를 읽어 반영
        const newExp = Number(sessionStorage.getItem(KEY_EXP) || '0')
        ssSet(KEY_EXP, String(newExp))
        ssDel(KEY_WARNED)
        setExp(newExp)
        setNow(Date.now())
        showToast('로그인 시간을 30분 연장했어요')
      })
      .catch(() => showToast('연장 중 오류가 발생했어요. 다시 시도해 주세요'))
  }

  // 1초마다 남은 시간 갱신 · 0이 되면 자동 로그아웃 · 5분 남으면 경고창(만료 시각당 한 번)
  useEffect(() => {
    const id = setInterval(() => {
      if (ended.current) return
      const t = Date.now()
      const rem = Math.ceil((exp - t) / 1000)
      if (rem <= 0) {
        endSession(true)
        return
      }
      if (rem <= WARN_S && ssGet(KEY_WARNED) !== String(exp)) {
        ssSet(KEY_WARNED, String(exp))
        setWarnOpen(true)
        setNotifOpen(false)
        setUserOpen(false)
      }
      setNow(t)
    }, 1000)
    return () => clearInterval(id)
  }, [exp, endSession])

  // 정산 완료 푸시: 처음 보는 알림이 다른 탭에서 들어오면 토스트
  const syncPush = useCallback(
    (fromEvent: boolean) => {
      const list = readPush()
      const shown = lsJson<string[]>(KEY_PUSH_SHOWN, [])
      const fresh = list.filter((n) => !shown.includes(n.id))
      if (fresh.length) {
        lsSetJson(KEY_PUSH_SHOWN, shown.concat(fresh.map((n) => n.id)).slice(-50))
        if (fromEvent) showToast('매도 대금이 원화로 확정됐어요', 5000)
      }
      setPush(list)
    },
    [showToast]
  )

  useEffect(() => {
    const onStore = (e: StorageEvent) => {
      if (e.key === KEY_PUSH) syncPush(true)
    }
    window.addEventListener('storage', onStore)
    return () => window.removeEventListener('storage', onStore)
  }, [syncPush])

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1100)
    const onHash = () => setSecHash(hashSection())
    const closeMenus = () => {
      setNotifOpen(false)
      setUserOpen(false)
    }
    const onDown = (e: globalThis.MouseEvent) => {
      const target = e.target as Node
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(target)) setUserOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenus()
        setWarnOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('hashchange', onHash)
    window.addEventListener('scroll', closeMenus, { passive: true })
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('scroll', closeMenus)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // 업무일·알림은 RETURNS_DATA(F.today는 getBusinessToday)에서만 읽음
  const notifSrc = RETURNS_DATA.NOTIFS
  const readIds = lsJson<string[]>(KEY_PUSH_READ, [])
  const pushUnread = push.filter((n) => !readIds.includes(n.id)).length
  const unread = (notifRead ? 0 : 2) + (Number(todoAlert) || 0) + pushUnread
  const notifs = push
    .map((n) => ({ text: n.text, time: F.short(n.date), hot: true }))
    .concat(notifSrc.map((n, i) => ({ text: i === 1 && profLabel ? '투자성향 진단이 완료됐어요 · ' + profLabel : n.text, time: F.short(n.date), hot: i < 2 })))

  const rem = Math.max(0, Math.ceil((exp - now) / 1000))
  const sessText = mmss(rem)
  const sessLabel = wide ? '남은 시간 ' + sessText : sessText

  const toggleNotif = () => {
    lsSetJson(KEY_PUSH_READ, push.map((n) => n.id))
    setNotifOpen((o) => !o)
    setNotifRead(true)
    setUserOpen(false)
  }

  const toggleUser = () => {
    setUserOpen((o) => !o)
    setNotifOpen(false)
  }

  // 내 정보 화면 안에서는 주소만 바꾸고(#notify · #theme) 부드럽게 이동
  const onUserItem = (e: MouseEvent, hash: string) => {
    if (active !== 'myinfo') {
      setUserOpen(false)
      return
    }
    e.preventDefault()
    setUserOpen(false)
    setSecHash(hash)
    try {
      window.history.replaceState(null, '', hash ? '#' + hash : window.location.pathname + window.location.search)
    } catch {
      // 주소 갱신에 실패해도 화면 이동은 계속
    }
    if (hash) window.dispatchEvent(new Event('hashchange'))
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const logout = () => {
    ended.current = true
    void authLogout().then(() => navigate('/'))
  }

  const userActive = active === 'myinfo'
  const userItems = simpleUserMenu ? USER_ITEMS.slice(0, 1) : USER_ITEMS

  return (
    <header className={styles.topbar}>
      <div className={styles.bar}>
        <Link to="/home" className={styles.logo}>
          <img src={assetUrl('assets/wordmark.png')} alt="Returns. 홈" />
        </Link>
        <nav className={styles.menu}>
          {MENU.map((m) => (
            <Link key={m.key} to={m.to} aria-current={m.key === active ? 'page' : 'false'} className={cx(styles.menuLink, m.key === active && styles.menuLinkOn)}>
              {m.label}
            </Link>
          ))}
        </nav>
        <div className={styles.right}>
          {wide && !noSearch && (
            <label className={styles.search}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input placeholder="종목 검색" aria-label="종목 검색" />
            </label>
          )}
          <span className={styles.biz} title="시연용 기준일">업무일 {bizDot || F.dot(F.today())}</span>
          <div className={styles.session}>
            <span className={cx(styles.sessTime, rem <= WARN_S && styles.sessTimeWarn)} role="timer" aria-label="남은 로그인 시간">{sessLabel}</span>
            <button type="button" className={styles.extend} onClick={extend}>연장</button>
          </div>
          <div className={styles.popWrap} ref={notifRef}>
            <button type="button" className={styles.iconBtn} onClick={toggleNotif} aria-label="알림" aria-expanded={notifOpen}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unread > 0 && <span className={styles.badge}>{unread}</span>}
            </button>
            {notifOpen && (
              <div className={styles.notifPanel}>
                {todos.length > 0 && (
                  <>
                    <div className={styles.panelHead}>
                      오늘 확인할 일<span className={styles.todoDate}>{todoDate}</span>
                    </div>
                    {todos.map((t) => (
                      <div key={t.title} className={styles.todo}>
                        <div className={styles.todoMain}>
                          <div className={styles.todoTitle}>
                            <span className={styles.todoTag} style={t.tagColor ? { color: t.tagColor } : undefined}>{t.tag}</span>
                            <span className={styles.todoText}>{t.title}</span>
                          </div>
                          <div className={styles.todoDesc}>{t.desc}</div>
                        </div>
                        <Link
                          to={t.to}
                          className={styles.todoLink}
                          onClick={(e) => {
                            t.onClick?.(e)
                            setNotifOpen(false)
                          }}
                        >
                          {t.link}
                        </Link>
                      </div>
                    ))}
                    <div className={styles.divider} />
                  </>
                )}
                <div className={cx(styles.panelHead, styles.panelHeadLine)}>알림</div>
                {notifs.map((n, i) => (
                  <div key={i} className={cx(styles.notif, i < notifs.length - 1 && styles.notifLine)}>
                    <span className={cx(styles.dot, n.hot && styles.dotHot)} />
                    <span className={styles.notifTime}>{n.time}</span>
                    <span className={styles.notifText}>{n.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.popWrap} ref={userRef}>
            <button type="button" className={cx(styles.userBtn, userActive && styles.userBtnOn)} onClick={toggleUser} aria-haspopup="menu" aria-expanded={userOpen}>
              {customerName || (auth.status === 'checking' ? '' : RETURNS_DATA.CUSTOMER.name)} 님
              <svg className={cx(styles.chevron, userOpen && styles.chevronOpen)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {userOpen && (
              <div className={styles.userPanel} role="menu">
                {userItems.map((u) => {
                  const on = userActive && secHash === u.hash
                  return (
                    <Link
                      key={u.label}
                      role="menuitem"
                      to={'/myinfo' + (u.hash ? '#' + u.hash : '')}
                      aria-current={on ? 'page' : 'false'}
                      className={cx(styles.userItem, on && styles.userItemOn)}
                      onClick={(e) => onUserItem(e, u.hash)}
                    >
                      {u.label}
                    </Link>
                  )
                })}
                <div className={cx(styles.divider, styles.dividerGap)} />
                <button type="button" role="menuitem" className={cx(styles.userItem, styles.logoutItem)} onClick={logout}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal
        open={warnOpen}
        variant="alert"
        title="곧 자동 로그아웃돼요"
        onClose={() => setWarnOpen(false)}
        cancelLabel="로그아웃"
        onCancel={() => endSession(false)}
        okLabel="30분 연장"
        onOk={extend}
      >
        <p className={styles.warnText}>
          개인정보 보호를 위해 <b className={styles.warnTime}>{sessText}</b> 뒤 자동으로 로그아웃돼요.
        </p>
      </Modal>
      <Toast message={toast} />
    </header>
  )
}

function hashSection(): string {
  const m = window.location.hash.slice(1)
  return m === 'notify' || m === 'theme' ? m : ''
}
