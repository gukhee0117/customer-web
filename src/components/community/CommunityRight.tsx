import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import '../../styles/tokens.css'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { StockIcon } from '../common/StockIcon'
import { Tabs } from '../common/Tabs'
import { cx } from '../common/cx'
import { getPopularPosts } from '../../api/community'
import { GEN, GEN_NAME, RECENT_LIMIT } from './communityData'
import { stockName, useStocks } from './stocksContext'
import { ddGroups, type HotRowView } from './communityLogic'
import { PubDialog } from './CommunityDialogs'
import { CommunityStockPick } from './CommunityStockPick'
import styles from './CommunityRight.module.css'

type WatchTab = 'watch' | 'recent'
const WATCH_TABS: { key: WatchTab; label: string }[] = [{ key: 'watch', label: '관심' }, { key: 'recent', label: '최근 본' }]

const tone = (n: number) => (n > 0 ? styles.up : n < 0 ? styles.down : styles.flat)

interface CommunityRightProps {
  code: string // 지금 보는 종목(목록에서 선택 표시)
  nick: string
  pubOn: boolean
  myPf: string // 내 성향(아바타)
  myPostN: number
  myRepN: number
  watch: string[]
  recent: string[]
  onSelect: (code: string) => void
  onPub: (on: boolean) => void // 성향 공개 켜기/끄기(토스트는 쓰는 쪽)
  onWatchAdd: (code: string) => void
  onWatchRemove: (code: string) => void
  onRecentRemove: (code: string) => void
  onGoMine: () => void // "글 N · 답글 N" → 내가 쓴 댓글 탭
  fixed: boolean // 화면 고정이면 인기글 박스가 남은 높이를 채우고 목록만 스크롤
  onHotThread: (code: string, id: string) => void // 인기글 줄 → 그 글로 이동
  onHotMore: () => void // "더보기 ›" → 가운데 인기글 탭(전체 종목)
  onToast: (text: string) => void
}

// 오른쪽 열: 내 프로필 카드(닉네임·성향·글/답글 수·성향 공개) + 관심 / 최근 본 종목 + 인기글 + 운영 정책 문구
export function CommunityRight({ code, nick, pubOn, myPf, myPostN, myRepN, watch, recent, onSelect, onPub, onWatchAdd, onWatchRemove, onRecentRemove, onGoMine, fixed, onHotThread, onHotMore, onToast }: CommunityRightProps) {
  const [pd, setPd] = useState<{ agree: boolean } | null>(null)
  const [wTab, setWTab] = useState<WatchTab>('watch')
  const [ddOpen, setDdOpen] = useState(false)
  const [ddQ, setDdQ] = useState('')
  const [ddHi, setDdHi] = useState(0)
  const watchRef = useRef<HTMLDivElement>(null)
  const ddInputRef = useRef<HTMLInputElement>(null)

  const stocks = useStocks()
  const myPl = myPf === 'private' ? '비공개' : (RD.PROFILES[myPf]?.label ?? '')
  // 인기글 박스: 서버 인기글(전체 종목). 받기 전·실패·빈 목록은 안내 한 줄
  const [hot, setHot] = useState<{ rows: HotRowView[]; status: 'loading' | 'live' | 'error' }>({ rows: [], status: 'loading' })
  const [hotTries, setHotTries] = useState(0)
  useEffect(() => {
    let alive = true
    getPopularPosts({ size: 14 }).then(
      (page) => alive && setHot({ status: 'live', rows: page.items.map((p) => ({ id: String(p.id), code: p.ticker ?? GEN, title: p.content.split('\n')[0], meta: (p.ticker ? stockName(stocks, p.ticker) : GEN_NAME) + ' · 좋아요 ' + p.likeCount + ' · 답글 ' + p.commentCount })) }),
      () => alive && setHot({ rows: [], status: 'error' })
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotTries])
  const recentRows = recent.filter((c) => stocks.stock(c)).slice(0, RECENT_LIMIT)

  const closeDd = () => {
    setDdOpen(false)
    setDdQ('')
    setDdHi(0)
  }
  const toggleDd = () => {
    if (ddOpen) closeDd()
    else {
      setDdOpen(true)
      setDdQ('')
      setDdHi(0)
      setTimeout(() => ddInputRef.current?.focus(), 30)
    }
  }
  const pickWatch = (c: string) => {
    if (!watch.includes(c)) onWatchAdd(c)
    closeDd()
  }
  const goTab = (key: WatchTab) => {
    setWTab(key)
    closeDd()
  }
  const togglePub = () => {
    if (pubOn) onPub(false)
    else setPd({ agree: false })
  }

  const groups = ddOpen ? ddGroups(ddQ, recent, stocks, false) : []
  const flat = groups.flatMap((g) => g.items)
  const ddKey = (e: KeyboardEvent) => {
    const n = flat.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (n) setDdHi((ddHi + 1) % n)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (n) setDdHi((ddHi - 1 + n) % n)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (n) pickWatch(flat[Math.min(ddHi, n - 1)].code)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeDd()
    }
  }

  // 목록 밖을 누르거나 Esc: 관심 종목 추가 목록 닫힘
  useEffect(() => {
    if (!ddOpen) return
    const onDown = (e: MouseEvent) => {
      if (watchRef.current && !watchRef.current.contains(e.target as Node)) closeDd()
    }
    // Esc: 이 목록만 닫고 글 검색 등으로는 안 넘김(원본 순서: 목록이 먼저)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      closeDd()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [ddOpen])

  const row = (c: string, removeLabel: string, onRemove: () => void, roundLast: boolean, last: boolean) => {
    const s = stocks.stock(c)
    const q = stocks.quote(c)
    if (!s) return null
    return (
      <div key={c} className={styles.item}>
        <button type="button" className={cx(styles.go, c === code && styles.on, roundLast && last && styles.lastWatch)} onClick={() => onSelect(c)}>
          <StockIcon color={s.color} initial={s.ini} size={20} code={s.code} />
          <span className={styles.nm}>
            <span className={styles.nmText}>{s.name}</span> <span className={styles.cd}>{c}</span>
          </span>
          <span className={styles.px}>
            <span className={styles.pxText}>{q.price == null ? (q.pending ? '…' : '확인 불가') : F.won(q.price)}</span>
            {q.rate != null && <span className={cx(styles.chg, tone(q.rate))}>{F.pct(q.rate)}</span>}
          </span>
        </button>
        <button type="button" className={styles.rm} aria-label={removeLabel} onClick={(e) => { e.stopPropagation(); onRemove() }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div data-col="right" className={styles.right}>
      <Box className={styles.card}>
        <div className={styles.me}>
          <KkiruAvatar profile={myPf} size={24} />
          <div className={styles.meBody}>
            <div className={styles.nameRow}>
              <span className={cx(styles.name, !nick && styles.nameNone)}>{nick || '닉네임 없음'}</span>
              <span className={styles.pl}>{myPl}</span>
            </div>
            <a href="?tab=mine" className={styles.mine} onClick={(e) => { e.preventDefault(); onGoMine() }}>글 {myPostN} · 답글 {myRepN}</a>
          </div>
          <span id="pubLabel" className={styles.pubLabel}>성향 공개</span>
          <button type="button" role="switch" aria-checked={pubOn} aria-labelledby="pubLabel" className={cx(styles.switch, pubOn && styles.switchOn)} onClick={togglePub}>
            <span className={styles.knob} />
          </button>
        </div>
      </Box>

      <div ref={watchRef} className={styles.watch}>
        <Box
          head={<Tabs variant="box" items={WATCH_TABS} value={wTab} onChange={(k) => goTab(k as WatchTab)} ariaLabel="종목 목록" />}
          actions={wTab === 'watch' ? <button type="button" className={styles.add} aria-expanded={ddOpen} onClick={toggleDd}>+ 추가</button> : undefined}
        >
          {wTab === 'watch' ? (
            <>
              {!watch.length && <div className={styles.emptyRow}>별을 눌러 관심 종목을 추가할 수 있어요</div>}
              {watch.map((c, i) => row(c, stockName(stocks, c) + ' 관심 해제', () => onWatchRemove(c), true, i === watch.length - 1))}
            </>
          ) : (
            <>
              {!recent.length && <div className={styles.emptyRow}>아직 본 종목이 없어요</div>}
              {recentRows.map((c) => row(c, stockName(stocks, c) + ' 최근 본 목록에서 지우기', () => onRecentRemove(c), false, false))}
            </>
          )}
        </Box>
        {ddOpen && (
          <div className={styles.dd}>
            <CommunityStockPick
              groups={groups}
              q={ddQ}
              hi={ddHi}
              placeholder="관심 종목 추가 · 종목명 또는 코드"
              ariaLabel="관심 종목 검색"
              inputRef={ddInputRef}
              onType={(v) => { setDdQ(v); setDdHi(0) }}
              onKey={ddKey}
              onPick={pickWatch}
              onHover={setDdHi}
              tag={(c) => (watch.includes(c) ? '추가됨' : '')}
            />
          </div>
        )}
      </div>

      <Box
        className={cx(styles.hot, fixed && styles.hotFixed)}
        head={
          <>
            <h2 className={styles.hotTitle}>인기글</h2>
            <span className={styles.hotScope}>전체 종목</span>
          </>
        }
        actions={<button type="button" className={styles.more} onClick={onHotMore}>더보기 ›</button>}
      >
        <div className={cx(styles.hotList, fixed && styles.hotListFixed)}>
          {hot.status === 'loading' && <div className={styles.emptyRow}>불러오는 중이에요</div>}
          {hot.status === 'error' && <div className={styles.emptyRow}>인기글을 불러오지 못했어요 <button type="button" className={styles.more} onClick={() => { setHot({ rows: [], status: 'loading' }); setHotTries((n) => n + 1) }}>다시 시도</button></div>}
          {hot.status === 'live' && !hot.rows.length && <div className={styles.emptyRow}>아직 인기글이 없어요</div>}
          {hot.rows.map((t) => (
            <a key={t.id} href={'?stock=' + t.code + '&thread=' + t.id} className={styles.hotRow} onClick={(e) => { e.preventDefault(); onHotThread(t.code, t.id) }}>
              <span className={styles.hotRowTitle}>{t.title}</span>
              <span className={styles.hotRowMeta}>{t.meta}</span>
            </a>
          ))}
        </div>
      </Box>

      <div className={styles.policy}>
        특정 종목 매수·매도를 권유하는 글, 수익 보장 표현은 삭제될 수 있어요.{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); onToast('준비 중인 화면이에요') }}>운영 정책</a>
      </div>

      {pd && <PubDialog agree={pd.agree} onToggle={() => setPd({ agree: !pd.agree })} onCancel={() => setPd(null)} onOk={() => { if (pd.agree) { setPd(null); onPub(true) } }} />}
    </div>
  )
}
