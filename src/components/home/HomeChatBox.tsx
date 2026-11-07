import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { RETURNS_DATA as RD, type ChatRow } from '../../data/returns'
import { Box } from '../common/Box'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { StockIcon } from '../common/StockIcon'
import { cx } from '../common/cx'
import {
  CHAT_EMPTY, CHAT_TABS, DEFAULT_RECENT, DEFAULT_STOCK, HOT_SCOPES, LIVE_MIN_MS, LIVE_SPAN_MS, LIVE_START_MIN, RECENT_LIMIT,
  type ChatTabKey, type HotScope
} from './homeChatData'
import { chatMsgs, ddGroups, hotMsgs, type LivePost, type Seg } from './homeChatLogic'
import styles from './HomeChatBox.module.css'

const toneClass = (n: number) => (n > 0 ? styles.up : n < 0 ? styles.down : styles.flat)

const SearchIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.noShrink}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

function Segs({ segs, hlClass }: { segs: Seg[]; hlClass: string }) {
  return (
    <>
      {segs.map((g, i) => (g.hl ? <span key={i} className={hlClass}>{g.t}</span> : <span key={i}>{g.t}</span>))}
    </>
  )
}

// 경제 채팅방 박스: 종목 고르기 + 실시간·인기글·내가 쓴 댓글 + 이 종목 채팅 검색
export function HomeChatBox({ className }: { className?: string }) {
  const [code, setCode] = useState(DEFAULT_STOCK)
  const [stockOpen, setStockOpen] = useState(false)
  const [ddQ, setDdQ] = useState('')
  const [ddHi, setDdHi] = useState(0)
  const [recent, setRecent] = useState(DEFAULT_RECENT)
  const [tab, setTab] = useState<ChatTabKey>('live')
  const [scope, setScope] = useState<HotScope>('stock')
  const [searchOpen, setSearchOpen] = useState(false)
  const [chatQ, setChatQ] = useState('')
  const [live, setLive] = useState<LivePost[]>([])

  const headRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const ddInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const liveState = useRef({ code, watching: true, hot: false })
  const liveN = useRef(0)
  const liveClock = useRef(LIVE_START_MIN)
  const stick = useRef(false)

  const name = RD.SN[code]
  const q = chatQ.trim()
  const view = searchOpen ? 'search' : tab
  const qOn = !!q && searchOpen

  // 최신 글이 앞(index 0)
  const all = live.filter((m) => m.code === code).map((m) => m.row).concat(RD.CHAT[code])
  const qKey = qOn ? q : ''
  const msgs = chatMsgs(all, code, view, qKey)
  const hot = view === 'hot' ? hotMsgs(all, code, scope) : []
  const dq = ddQ.trim()
  const dd = ddGroups(dq, code, recent)

  const closeDd = useCallback(() => {
    setStockOpen(false)
    setDdQ('')
    setDdHi(0)
  }, [])
  const closeSearch = () => {
    setSearchOpen(false)
    setChatQ('')
  }
  const toBottom = () => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }
  const atBottom = () => {
    const el = listRef.current
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }
  const pickStock = (c: string) => {
    setCode(c)
    closeDd()
    setChatQ('')
    setRecent((r) => [c].concat(r.filter((x) => x !== c)).slice(0, RECENT_LIMIT))
  }

  // 실시간 새 글이 지금 보고 있는 종목방·실시간 탭인지 알기 위한 값
  useEffect(() => {
    liveState.current = { code, watching: !searchOpen && tab === 'live', hot: view === 'hot' }
  })

  // 바깥 클릭·스크롤·Esc로 닫힘
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (stockOpen && headRef.current && !headRef.current.contains(e.target as Node)) closeDd()
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (stockOpen) closeDd()
      else if (searchOpen) closeSearch()
    }
    const onScroll = () => {
      if (stockOpen) closeDd()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [stockOpen, searchOpen, closeDd])

  // 입력창이 붙는 순간 커서를 넣음
  useEffect(() => {
    if (stockOpen) setTimeout(() => ddInputRef.current?.focus({ preventScroll: true }), 0)
  }, [stockOpen])
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0)
  }, [searchOpen])

  // 종목·탭·검색어가 바뀌면 인기글은 맨 위, 나머지는 맨 아래(최신)로
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    if (view === 'hot') el.scrollTop = 0
    else el.scrollTop = el.scrollHeight
  }, [code, view, qKey])

  // 처음 열릴 때 맨 아래가 보이게: 글꼴 로드로 높이가 바뀌어도 다시 맞춤
  useEffect(() => {
    const settle = () => {
      if (listRef.current && !liveState.current.hot) listRef.current.scrollTop = listRef.current.scrollHeight
    }
    const ts = [80, 400, 1200].map((t) => setTimeout(settle, t))
    document.fonts?.ready.then(settle)
    return () => ts.forEach(clearTimeout)
  }, [])

  // 실시간 예시: 10~15초마다 새 글 1개
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      timer = setTimeout(() => {
        const { code: c, watching } = liveState.current
        const pool = RD.LIVE_POOL
        liveN.current += 1
        const [nick, pf, text] = pool[liveN.current % pool.length]
        liveClock.current += 1
        const tm = String(Math.floor(liveClock.current / 60)).padStart(2, '0') + ':' + String(liveClock.current % 60).padStart(2, '0')
        stick.current = watching && atBottom()
        const row: ChatRow = ['live-' + Date.now(), nick, pf, tm, text.replace('{n}', RD.SN[c]), 0, 0, 0]
        setLive((p) => [{ code: c, row }].concat(p))
        tick()
      }, LIVE_MIN_MS + Math.random() * LIVE_SPAN_MS)
    }
    tick()
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (stick.current) {
      stick.current = false
      toBottom()
    }
  }, [live])

  const onDdKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = dd.flat.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (n) setDdHi((ddHi + 1) % n)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (n) setDdHi((ddHi - 1 + n) % n)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (n) pickStock(dd.flat[Math.min(ddHi, n - 1)])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeDd()
    }
  }

  const cur = RD.KR[code]
  const searchPh = name + ' 채팅에서 검색'

  return (
    <Box shadow className={className}>
      <div ref={headRef} className={styles.head}>
        <h2 className={styles.title}>경제 채팅방</h2>
        <button type="button" className={styles.stockBtn} aria-expanded={stockOpen} aria-haspopup="listbox" aria-label="채팅방 종목 선택" onClick={() => (stockOpen ? closeDd() : (setStockOpen(true), setDdQ(''), setDdHi(0)))}>
          <StockIcon color={cur[1]} initial={cur[2]} size={24} code={code} />
          <b className={styles.stockName}>{name}</b>
          <span className={styles.stockCode}>{code}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cx(styles.chev, stockOpen && styles.chevOpen)}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <button type="button" className={cx(styles.searchBtn, searchOpen && styles.searchBtnOn)} aria-label="이 종목 채팅에서 검색" aria-pressed={searchOpen} onClick={() => (searchOpen ? closeSearch() : (setSearchOpen(true), setChatQ('')))}>
          <SearchIcon size={16} />
        </button>
        <Link to={'/community?stock=' + code + (tab === 'mine' ? '&tab=mine' : '')} className={styles.community}>커뮤니티 ›</Link>

        {stockOpen && (
          <div className={styles.dd}>
            <label className={styles.ddSearch}>
              <SearchIcon size={15} />
              <input ref={ddInputRef} className={styles.ddInput} value={ddQ} onChange={(e) => { setDdQ(e.target.value); setDdHi(0) }} onKeyDown={onDdKey} placeholder="종목명 또는 코드 검색" aria-label="종목명 또는 코드 검색" />
            </label>
            <div role="listbox" className={styles.ddList}>
              {dd.groups.map((gr, gi) => (
                <div key={gi}>
                  {gr.title && <div className={styles.ddTitle}>{gr.title}</div>}
                  {gr.items.map((o) => (
                    <button key={o.code} type="button" role="option" aria-selected={o.on} className={cx(styles.opt, o.flat === ddHi && styles.optHi)} onClick={() => pickStock(o.code)} onMouseEnter={() => o.flat !== ddHi && setDdHi(o.flat)}>
                      {o.rank != null && <span className={cx(styles.optRank, o.top3 && styles.optRankTop)}>{o.rank}</span>}
                      <StockIcon color={o.color} initial={o.ini} size={24} code={o.code} />
                      <span className={styles.optMain}>
                        <span className={styles.optName}><Segs segs={o.nameSegs} hlClass={styles.optNameHl} /></span>
                        <span className={styles.optCode}><Segs segs={o.codeSegs} hlClass={styles.optCodeHl} /></span>
                        <span className={styles.optSector}>{o.sector}</span>
                      </span>
                      <span className={styles.optSide}>
                        {o.rank != null && <span className={styles.optPosts}>오늘 글 {o.posts}</span>}
                        <span className={cx(styles.optChg, toneClass(o.chgTone))}>{o.chg}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              {dq && dd.flat.length === 0 && <div className={styles.ddEmpty}>‘{ddQ}’에 맞는 종목이 없어요</div>}
            </div>
          </div>
        )}
      </div>

      {!searchOpen && (
        <div className={styles.tabs}>
          <div className={styles.tabList}>
            {CHAT_TABS.map(([k, label], i) => (
              <span key={k} className={styles.tabItem}>
                {i > 0 && <span className={styles.sep}>·</span>}
                <button type="button" className={cx(styles.tab, tab === k && styles.tabOn)} onClick={() => setTab(k)}>{label}</button>
              </span>
            ))}
          </div>
          {view === 'hot' && (
            <div role="group" aria-label="인기글 범위" className={styles.scopes}>
              {HOT_SCOPES.map(([k, label], i) => (
                <span key={k} className={styles.scopeItem}>
                  {i > 0 && <span className={styles.scopeSep}>·</span>}
                  <button type="button" aria-pressed={scope === k} className={cx(styles.scope, scope === k && styles.scopeOn)} onClick={() => setScope(k)}>{label}</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {searchOpen && (
        <div className={styles.searchBar}>
          <SearchIcon size={15} />
          <input ref={searchRef} className={styles.searchInput} value={chatQ} onChange={(e) => setChatQ(e.target.value)} placeholder={searchPh} aria-label={searchPh} />
          {qOn && <span className={styles.resultN}>{msgs.length}건</span>}
          <button type="button" className={styles.searchClose} aria-label="검색 닫기" onClick={closeSearch}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}

      <div ref={listRef} className={styles.list}>
        {view !== 'hot' && (
          <div>
            {msgs.map((c, i) => (
              <Link key={c.id} to={c.to} className={cx(styles.msg, i === msgs.length - 1 && styles.msgLast)}>
                <KkiruAvatar profile={c.pf} size={28} />
                <span className={styles.msgBody}>
                  <span className={styles.msgHead}>
                    <b className={styles.msgNick}>{c.nick}</b>
                    <span className={styles.msgPl}>{c.pl}</span>
                    <span className={styles.msgTime}>{c.time}</span>
                  </span>
                  <span className={cx(styles.msgText, qOn && styles.msgTextWrap)}><Segs segs={c.segs} hlClass={styles.match} /></span>
                  {c.kkiru && <span className={styles.msgKkiru}>끼루가 답했어요</span>}
                  <span className={styles.msgMeta}>좋아요 {c.likes} · 답글 {c.replies}</span>
                </span>
              </Link>
            ))}
            {msgs.length === 0 && <div className={styles.empty}>{qOn ? '‘' + q + '’ 내용의 글이 없어요' : CHAT_EMPTY}</div>}
          </div>
        )}
        {view === 'hot' && (
          <div>
            {hot.map((k, i) => (
              <Link key={k.id} to={k.to} className={cx(styles.hotRow, i === hot.length - 1 && styles.msgLast)}>
                <span className={cx(styles.hotRank, k.rank <= 3 && styles.hotRankTop)}>{k.rank}</span>
                <KkiruAvatar profile={k.pf} size={24} />
                <span className={styles.msgBody}>
                  <span className={styles.hotText}>{k.stock && <span className={styles.hotStock}>{k.stock}</span>}{k.text}</span>
                  <span className={styles.hotMeta}>{k.nick} · 좋아요 {k.likes} · 답글 {k.replies}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Link to={'/community?stock=' + code + '&write=1'} className={styles.write}>커뮤니티에서 글쓰기 ›</Link>
    </Box>
  )
}
