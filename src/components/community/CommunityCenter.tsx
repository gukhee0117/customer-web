import { useEffect, useRef, useState } from 'react'
import '../../styles/tokens.css'
import { F } from '../../lib/calc'
import { StockIcon } from '../common/StockIcon'
import { Tabs } from '../common/Tabs'
import { cx } from '../common/cx'
import { getPost } from '../../api/community'
import { GEN, GEN_NAME, SEARCH_MAX, composePlaceholder, kiruAskHint } from './communityData'
import { ddGroups } from './communityLogic'
import { stockName, useStocks } from './stocksContext'
import { myProfile, type Post } from './communityPosts'
import { CommunityCompose } from './CommunityCompose'
import { CommunityDialogs } from './CommunityDialogs'
import { CommunityFeed } from './CommunityFeed'
import { CommunityRight } from './CommunityRight'
import { CommunityStockPick, SearchIcon } from './CommunityStockPick'
import { useCommunityFeed, type FeedTab, type HotScope } from './useCommunityFeed'
import type { MyCommunity } from './useMyCommunity'
import { useAppShell } from '../../layouts/appShell'
import styles from './CommunityCenter.module.css'

export type { FeedTab, HotScope }
const TABS: { key: FeedTab; label: string }[] = [{ key: 'live', label: '최신' }, { key: 'hot', label: '인기글' }, { key: 'mine', label: '내가 쓴 댓글' }]
const SCOPES: [HotScope, string][] = [['stock', '이 종목'], ['all', '전체 종목']]

const tone = (n: number) => (n > 0 ? styles.up : n < 0 ? styles.down : styles.flat)

interface CommunityCenterProps {
  code: string
  recent: string[]
  starred: boolean
  tab: FeedTab
  scope: HotScope
  onCode: (code: string) => void
  onTab: (tab: FeedTab, keepUrl?: boolean) => void // keepUrl: 주소는 그대로 두고 탭만 바꿈(인기글에서 글을 쓰면 실시간으로)
  onScope: (scope: HotScope) => void
  onStar: () => void
  fixed: boolean // 화면 고정이면 글 목록만 스크롤
  me: MyCommunity | null // 내 닉네임·성향·글/답글 수
  onMeChanged: () => void
  pubOn: boolean
  onPub: (on: boolean) => void
  watch: string[]
  onWatchAdd: (code: string) => void
  onWatchRemove: (code: string) => void
  onRecentRemove: (code: string) => void
  onToast: (text: string) => void
  thread: string | null // 주소 ?thread= 로 들어온 글 id
}

// 가운데 열(+ 같은 글 상태를 쓰는 오른쪽 열): 종목 정보 줄 + 종목 고르기 목록 + 탭·정렬 줄 + 글 검색 + 닉네임 정하기/글쓰기 창 + 글 목록(답글·수정·삭제·신고 포함)
export function CommunityCenter({ code, recent, starred, tab, scope, onCode, onTab, onScope, onStar, fixed, me, onMeChanged, pubOn, onPub, watch, onWatchAdd, onWatchRemove, onRecentRemove, onToast, thread }: CommunityCenterProps) {
  const shell = useAppShell()
  const [ddOpen, setDdOpen] = useState(false)
  const [ddQ, setDdQ] = useState('')
  const [ddHi, setDdHi] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const headRef = useRef<HTMLDivElement>(null)
  const ddInputRef = useRef<HTMLInputElement>(null)
  const qRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const feedRef = useRef<HTMLElement>(null)

  // 종목이 바뀌면 목록·글 검색은 닫힘(원본 setCode와 같음). 보여 줄 글 개수 등은 피드가 알아서 처음으로 돌아감
  const [seenCode, setSeenCode] = useState(code)
  if (seenCode !== code) {
    setSeenCode(code)
    setDdOpen(false)
    setDdQ('')
    setDdHi(0)
    setSearchOpen(false)
    setQ('')
  }

  const feed = useCommunityFeed({ code, tab, scope, searchOpen, q, fixed, listRef, feedRef, thread, onToast, onMyChanged: onMeChanged, onPosted: () => { if (tab === 'hot') onTab('live', true) } })
  const { menu, closeMenu, report, delId, cancelReport, cancelDelete } = feed
  const toTop = useRef(feed.toListTop)
  useEffect(() => { toTop.current = feed.toListTop })
  useEffect(() => { toTop.current(false) }, [code])

  const myPf = myProfile(pubOn, me?.profile ?? 'private')
  const isGen = code === GEN
  const stocks = useStocks()
  const info = stocks.stock(code)
  const name = isGen ? GEN_NAME : stockName(stocks, code)
  const qOn = feed.qOn
  const view = feed.view
  const px = stocks.quote(code)

  const groups = ddOpen ? ddGroups(ddQ, recent, stocks) : []
  const flat = groups.flatMap((g) => g.items)

  const closeDd = () => {
    setDdOpen(false)
    setDdQ('')
    setDdHi(0)
  }
  const closeSearch = () => {
    setSearchOpen(false)
    setQ('')
  }
  const openDd = () => {
    if (ddOpen) closeDd()
    else {
      setDdOpen(true)
      setDdQ('')
      setDdHi(0)
      setTimeout(() => ddInputRef.current?.focus(), 30)
    }
  }
  const toggleSearch = () => {
    if (searchOpen) closeSearch()
    else {
      setSearchOpen(true)
      setQ('')
      setTimeout(() => qRef.current?.focus(), 30)
    }
  }
  const pick = (c: string) => onCode(c)
  const changeTab = (key: FeedTab) => {
    onTab(key)
    closeSearch()
    feed.clearReply()
    feed.toListTop(false)
  }
  const changeScope = (key: HotScope) => {
    onScope(key)
  }
  // 글 링크 복사(원본: 주소 + ?stock=&thread=)
  const share = (p: Post) => {
    const url = location.href.split('?')[0] + '?stock=' + p.code + '&thread=' + p.id
    try { void navigator.clipboard.writeText(url) } catch { /* 복사 못 해도 안내만 보임 */ }
    onToast('글 링크를 복사했어요')
  }
  // 프로필 카드의 "글 N · 답글 N": 내가 쓴 댓글 탭으로
  const goMine = () => {
    onTab('mine')
    closeSearch()
    feed.toListTop(true)
  }
  // 인기글 박스 "더보기 ›": 인기글 탭 + 전체 종목(주소는 그대로)
  const hotMore = () => {
    onTab('hot', true)
    onScope('all')
    closeSearch()
    feed.toListTop(false)
  }
  // 내가 쓴 답글 줄에서 글로 이동(그 글의 답글도 같이 펼침)
  const goThread = (c: string, id: string) => {
    onCode(c)
    onTab('live')
    closeSearch()
    feed.focusPost(c, id)
    try { history.replaceState(null, '', '?stock=' + c + '&thread=' + id) } catch { /* 주소 갱신 실패는 무시 */ }
  }

  // 내가 쓴 답글 줄에서 그 글로 이동: 댓글에는 종목이 없어 글을 한 번 받아 종목을 알아낸 뒤 이동
  const goReply = (postId: string) => {
    getPost(Number(postId)).then(
      (p) => goThread(p.ticker ?? GEN, postId),
      () => onToast('글을 찾지 못했어요')
    )
  }

  // 목록 밖을 누르거나 Esc: 목록 → 글 검색 순서로 닫음
  useEffect(() => {
    if (!ddOpen) return
    const onDown = (e: MouseEvent) => {
      if (headRef.current && !headRef.current.contains(e.target as Node)) closeDd()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [ddOpen])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (report) cancelReport()
      else if (delId) cancelDelete()
      else if (ddOpen) closeDd()
      else if (menu) closeMenu()
      else if (searchOpen) closeSearch()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ddOpen, searchOpen, menu, closeMenu, report, delId, cancelReport, cancelDelete])
  // "…" 메뉴 밖을 누르면 닫힘
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('[data-menu]')) closeMenu()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menu, closeMenu])

  const ddKey = (e: React.KeyboardEvent) => {
    const n = flat.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (n) setDdHi((ddHi + 1) % n)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (n) setDdHi((ddHi - 1 + n) % n)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (n) pick(flat[Math.min(ddHi, n - 1)].code)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeDd()
    }
  }

  const qPh = name + ' 글에서 검색'

  return (
    <>
    <section ref={feedRef} data-col="center" className={styles.center}>
      <div ref={headRef} className={styles.head}>
        <button type="button" className={styles.pick} aria-expanded={ddOpen} aria-haspopup="listbox" aria-label="종목 선택" onClick={openDd}>
          <StockIcon color={isGen ? 'var(--color-navy)' : (info?.color ?? 'var(--color-gray-600)')} initial={isGen ? 'R' : (info?.ini ?? code.slice(0, 1))} size={24} code={isGen ? undefined : code} />
          <span className={styles.stockName}>{name}</span>
          <span className={styles.stockCode}>{isGen ? '' : code}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cx(styles.chev, ddOpen && styles.chevOpen)}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {!isGen && (
          <div className={styles.price}>
            <span className={styles.px}>{px.price == null ? (px.pending ? '시세 불러오는 중' : '시세 확인 불가') : '₩' + F.won(px.price)}</span>
            {px.rate != null && <span className={cx(styles.chg, tone(px.rate))}>{F.pct(px.rate)}</span>}
          </div>
        )}
        <div className={styles.tools}>
          {!isGen && (
            <button type="button" className={cx(styles.tool, starred ? styles.toolOn : styles.starOff)} aria-pressed={starred} aria-label={starred ? '관심 종목에서 빼기' : '관심 종목에 추가'} onClick={onStar}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
              </svg>
            </button>
          )}
          <button type="button" className={cx(styles.tool, styles.searchBtn, searchOpen && styles.toolOn)} aria-pressed={searchOpen} aria-label="이 종목 글에서 검색" onClick={toggleSearch}>
            <SearchIcon size={17} />
          </button>
        </div>
        {ddOpen && (
          <div className={styles.dd}>
            <CommunityStockPick
              groups={groups}
              q={ddQ}
              hi={ddHi}
              placeholder="종목명 또는 코드 검색"
              ariaLabel="종목명 또는 코드 검색"
              inputRef={ddInputRef}
              onType={(v) => { setDdQ(v); setDdHi(0) }}
              onKey={ddKey}
              onPick={pick}
              onHover={setDdHi}
            />
          </div>
        )}
      </div>

      <div className={styles.tabsRow}>
        <Tabs variant="compact" items={TABS} value={qOn ? '' : tab} onChange={(key) => changeTab(key as FeedTab)} />
        {view === 'hot' && (
          <div role="group" aria-label="인기글 범위" className={styles.scopes}>
            {SCOPES.map(([key, label], i) => (
              <span key={key} style={{ display: 'contents' }}>
                {i > 0 && <span className={styles.scopeSep}>·</span>}
                <button type="button" className={cx(styles.scope, scope === key && styles.scopeOn)} aria-pressed={scope === key} onClick={() => changeScope(key)}>{label}</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {searchOpen && (
        <div className={styles.searchRow}>
          <label className={styles.qBox}>
            <SearchIcon size={14} />
            <input
              ref={qRef}
              className={styles.qInput}
              value={q}
              maxLength={SEARCH_MAX}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeSearch() } }}
              placeholder={qPh}
              aria-label={qPh}
            />
          </label>
          {qOn && (
            <div className={styles.qInfo}>
              ‘{q}’ 검색 결과 {feed.total}개 · <button type="button" className={styles.clear} onClick={() => setQ('')}>지우기</button>
            </div>
          )}
        </div>
      )}
      <CommunityCompose feed={feed} myPf={myPf} placeholder={composePlaceholder(isGen, name)} hint={kiruAskHint(isGen)} />
      <CommunityFeed feed={feed} q={q} scope={scope} fixed={fixed} myPf={myPf} listRef={listRef} onShare={share} onGoReply={goReply} onBot={() => shell.setBotOpen(true)} />
      <CommunityDialogs feed={feed} />
    </section>
    <CommunityRight
      code={code}
      nick={me?.nick ?? ''}
      pubOn={pubOn}
      myPf={myPf}
      myPostN={me?.postN ?? 0}
      myRepN={me?.replyN ?? 0}
      watch={watch}
      recent={recent}
      onSelect={onCode}
      onPub={onPub}
      onWatchAdd={onWatchAdd}
      onWatchRemove={onWatchRemove}
      onRecentRemove={onRecentRemove}
      onGoMine={goMine}
      fixed={fixed}
      onHotThread={goThread}
      onHotMore={hotMore}
      onToast={onToast}
    />
    </>
  )
}
