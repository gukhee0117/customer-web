import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { CommunityCenter, type FeedTab, type HotScope } from '../components/community/CommunityCenter'
import { CommunityTop10 } from '../components/community/CommunityTop10'
import { BAR_H_FALLBACK, FIXED_MIN_HEIGHT, MID_MIN, RECENT_KEY, TOAST_MS, WIDE_MIN, rowHeight, stockFromUrl } from '../components/community/communityData'
import { loadRecent, pushRecent } from '../components/community/communityLogic'
import { useMyCommunity } from '../components/community/useMyCommunity'
import { StocksContext, stockName } from '../components/community/stocksContext'
import { DOMESTIC_CODE, useStocksData } from '../components/community/useStocksData'
import { Toast } from '../components/common/Toast'
import { useToast } from '../components/common/useToast'
import { cx } from '../components/common/cx'
import styles from '../components/community/CommunityLayout.module.css'
import { useAuth } from '../contexts/authState'
import { useCommunityWatchlist } from '../components/community/useCommunityWatchlist'
import { useAppShell } from '../layouts/appShell'
import { useDocumentTitle } from '../components/common/useDocumentTitle'

const viewport = () => ({ w: window.innerWidth, h: window.innerHeight })

// 커뮤니티 — 열 배치 + 많이 이야기하는 종목 + 가운데 열(종목 정보·종목 고르기·탭·글 검색·닉네임 정하기·글쓰기·글 목록·답글·수정·삭제·신고) + 오른쪽 열(프로필·관심/최근 본·인기글·운영 정책) + 아래 안내 문구.
// 상단 바 "커뮤니티"를 다시 누르면 원본은 페이지를 새로 불러와 처음 상태가 됨 → 주소가 새로 들어올 때마다(location.key) 처음부터 다시 그림
export function CommunityPage() {
  useDocumentTitle('Returns 커뮤니티')
  const { key } = useLocation()
  return <CommunityBody key={key} />
}

function CommunityBody() {
  const shell = useAppShell()
  // 화면을 새로 그릴 때(상단 바에서 같은 메뉴를 다시 눌러도) 챗봇은 닫힌 채로 시작(원본은 페이지를 새로 불러옴)
  useEffect(() => () => shell.setBotOpen(false), [shell])
  const [params] = useSearchParams()
  const [code, setCode] = useState(() => stockFromUrl(params.get('stock')))
  const [thread] = useState(() => params.get('thread')) // 주소 ?thread= 로 들어온 글(처음 한 번만 쓰임)
  const [tab, setTab] = useState<FeedTab>(() => (!params.get('thread') && params.get('tab') === 'mine' ? 'mine' : 'live'))
  const [scope, setScope] = useState<HotScope>('stock')
  const [recent, setRecent] = useState(() => loadRecent(stockFromUrl(params.get('stock'))))
  const { message: toast, showToast } = useToast()
  const { auth } = useAuth()
  const customerId = auth.status === 'authenticated' ? auth.me.customerId : null
  const watchlist = useCommunityWatchlist({ customerId, checking: auth.status === 'checking', onToast: (text, ticker) => showToast(ticker ? stockName(stocks, ticker) + ' ' + text : text, TOAST_MS) })
  const watch = watchlist.watch.filter(ticker => DOMESTIC_CODE.test(ticker))
  const stocks = useStocksData([code, ...watch, ...recent])
  // 내 닉네임·성향·공개 여부·글/답글 수(서버)
  const my = useMyCommunity((t) => showToast(t, TOAST_MS))
  const pubOn = my.me?.pub ?? false
  const [view, setView] = useState(viewport)
  const [barH, setBarH] = useState(BAR_H_FALLBACK)
  const [colH, setColH] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)

  const wide = view.w >= WIDE_MIN
  const mid = view.w >= MID_MIN && !wide
  const fixed = wide && view.h >= FIXED_MIN_HEIGHT

  // 창 크기 + 상단 바 높이(원본: main 윗쪽 위치)를 다시 잼
  const measure = useCallback(() => {
    setView(viewport())
    const main = gridRef.current?.closest('main')
    if (main) setBarH(Math.round(main.getBoundingClientRect().top + window.scrollY))
  }, [])
  useLayoutEffect(() => {
    const t0 = setTimeout(measure, 0)
    const t = setTimeout(measure, 200)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t0)
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  // 왼쪽 칸 높이를 지켜봄 → 고정일 때 행 높이에 반영
  useEffect(() => {
    const el = leftRef.current
    if (!el || !window.ResizeObserver) return
    const ro = new ResizeObserver(() => setColH(Math.round(el.getBoundingClientRect().height)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 최근 본 종목은 탭을 닫기 전까지 기억(원본 sessionStorage)
  useEffect(() => {
    try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent)) } catch { /* 저장 못 해도 화면은 그대로 */ }
  }, [recent])

  const url = (c: string, t: FeedTab) => '?stock=' + c + (t === 'mine' ? '&tab=mine' : '')
  const replaceUrl = (c: string, t: FeedTab) => {
    try { history.replaceState(null, '', url(c, t)) } catch { /* 주소 갱신 실패는 무시 */ }
  }
  // 왼쪽 목록·가운데 종목 고르기 모두 여기로: 선택 종목 + 최근 본 + 주소가 같이 바뀜
  const selectCode = (c: string) => {
    setCode(c)
    setRecent((r) => pushRecent(r, c))
    replaceUrl(c, tab)
  }
  const selectTab = (t: FeedTab, keepUrl = false) => {
    setTab(t)
    if (!keepUrl) replaceUrl(code, t)
  }
  const addWatch = (ticker: string) => { void watchlist.add(ticker) }
  const removeWatch = (ticker: string) => { void watchlist.remove(ticker) }
  const removeRecent = (c: string) => setRecent((r) => r.filter((x) => x !== c))
  const toggleStar = () => { void watchlist.toggle(code) }

  return (
    <StocksContext.Provider value={stocks}>
      <h1 className={styles.srOnly}>커뮤니티</h1>
      {watchlist.failed && <div className={styles.watchlistError} role="status">관심종목을 불러오지 못했어요. <button type="button" onClick={watchlist.retry}>다시 시도</button></div>}
      <div
        ref={gridRef}
        data-grid3="1"
        className={cx(styles.grid, wide && styles.wide, mid && styles.mid, fixed && styles.fixed)}
        style={{ '--bar-h': barH + 'px' } as CSSProperties}
      >
        <div ref={leftRef} data-col="left" className={styles.left}>
          <CommunityTop10 code={code} fixed={fixed} rowH={rowHeight(fixed, colH)} onSelect={selectCode} />
        </div>
        <CommunityCenter
          code={code}
          recent={recent}
          starred={watch.includes(code)}
          tab={tab}
          scope={scope}
          onCode={selectCode}
          onTab={selectTab}
          onScope={setScope}
          onStar={toggleStar}
          fixed={fixed}
          me={my.me}
          onMeChanged={my.refresh}
          pubOn={pubOn}
          onPub={(on) => void my.setPublic(on)}
          watch={watch}
          onWatchAdd={addWatch}
          onWatchRemove={removeWatch}
          onRecentRemove={removeRecent}
          onToast={(t) => showToast(t, TOAST_MS)}
          thread={thread}
        />
      </div>
      <p className={styles.notice}>끼루 AI는 정보를 안내하며 투자 판단은 고객님께 있어요</p>
      <Toast message={toast} />
    </StocksContext.Provider>
  )
}
