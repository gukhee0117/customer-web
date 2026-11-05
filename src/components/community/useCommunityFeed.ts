import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { apiErrorMessage } from '../../api/client'
import { deleteComment, deletePost, editPost, getComments, getMyComments, getMyPosts, getPopularPosts, getPost, getPosts, likeComment, likePost, reportTarget, retryCommentKkiru, retryPostKkiru, unlikeComment, unlikePost, writeComment, writePost } from '../../api/community'
import type { CommunityPage, CommunityPost, ReportReason } from '../../api/community'
import { FEED_LIMIT, FRESH_MS, GEN, POST_MAX, REPLY_MAX } from './communityData'
import { fromServerComment, fromServerPost, type FeedView, type MyReply, type Post, type Reply } from './communityPosts'

export type FeedTab = 'live' | 'hot' | 'mine'
export type HotScope = 'stock' | 'all'

interface FeedArgs {
  code: string
  tab: FeedTab
  scope: HotScope
  searchOpen: boolean
  q: string // 글 검색어(공백 포함 그대로)
  fixed: boolean // 화면 고정 상태면 피드 영역만 스크롤
  listRef: RefObject<HTMLDivElement | null>
  feedRef: RefObject<HTMLElement | null>
  onMyChanged: () => void // 내 글·답글 수가 달라졌을 때(프로필 카드 숫자를 다시 받음)
  onPosted: () => void // 글을 등록했을 때(인기글 탭에서 썼으면 실시간으로 옮기는 일은 부른 쪽이 함)
  thread: string | null // 주소 ?thread= 로 들어온 글 id(처음 한 번만 쓰임)
  onToast: (text: string) => void
}

// 답글 쓰는 중인 곳: 어느 글에, 어느 답글에(없으면 글에 바로), 누구에게(@닉네임)
interface ReplyAt { post: string; rep: string | null; target: string | null }

// 피드 글 목록의 상태: 새로 붙은 글, 아직 안 보인 새 글, 좋아요, 더보기, 메뉴, 보여 줄 개수 + 실시간 새 글 타이머
export function useCommunityFeed({ code, tab, scope, searchOpen, q, fixed, listRef, feedRef, onMyChanged, onPosted, thread, onToast }: FeedArgs) {
  const [refreshed, setRefreshed] = useState<Record<string, Post>>({}) // 다시 받은 글(끼루 상태가 바뀐 것)
  const [added, setAdded] = useState<Record<string, Post[]>>({}) // 종목별로 앞에 붙은 새 글(글쓰기를 서버에 연결하기 전까지 화면에만 둠)
  const [fresh, setFresh] = useState<string | null>(null) // 방금 붙은 글(나타나는 효과)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [menuState, setMenuState] = useState<{ code: string; id: string } | null>(null)
  const [flash, setFlash] = useState<{ id: string; on: boolean } | null>(thread ? { id: thread, on: true } : null)
  // 펼친 글의 댓글(서버). 오래된 것부터 오고 nextCursor로 이어 받는다
  const [cm, setCm] = useState<Record<string, { status: 'loading' | 'live' | 'error'; items: Reply[]; next: number | null; more: boolean }>>({})
  const [rcDelta, setRcDelta] = useState<Record<string, number>>({}) // 내가 댓글을 쓰거나 지워서 달라진 댓글 수
  const [repOpen, setRepOpen] = useState<Record<string, boolean>>(thread ? { [thread]: true } : {}) // 답글을 펼친 글(여러 글 동시에 가능)
  const [replyAt, setReplyAt] = useState<ReplyAt | null>(null)
  const [replyText, setReplyText] = useState('')
  // 종목이 바뀌면 쓰던 답글 자리는 닫힘(쓰던 글자는 그대로 두는 것까지 원본과 같음)
  // 글 수정·삭제·신고·글쓰기·끼루에게 물어보기
  const [deleted, setDeleted] = useState<Record<string, boolean>>({})
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [delId, setDelId] = useState<string | null>(null) // 삭제 확인 창에 떠 있는 글
  const [report, setReport] = useState<{ reason: ReportReason | null; postId?: number; commentId?: number } | null>(null) // 신고 창
  const [draft, setDraft] = useState('')
  const [compFocus, setCompFocus] = useState(false)
  const [kAsk, setKAsk] = useState(false)
  const mods = useMemo(() => ({ deleted, edits }), [deleted, edits])
  const [seenCode, setSeenCode] = useState(code)
  if (seenCode !== code) { setSeenCode(code); setReplyAt(null) }

  const menu = menuState && menuState.code === code ? menuState.id : null

  const qt = q.trim()
  const qOn = searchOpen && !!qt
  const view: FeedView = qOn ? 'search' : tab
  // ===== 서버 글 목록(최신·인기·내 글·검색). 종목·탭·범위·검색어가 바뀌면 처음부터 다시 받는다 =====
  const ticker = code === GEN ? 'GENERAL' : code
  const [tries, setTries] = useState(0)
  const listKey = [view, ticker, view === 'hot' ? scope : '', view === 'search' ? qt : '', tries].join('|')
  const [srv, setSrv] = useState<{ key: string; items: Post[]; next: number | null; failed: boolean; more: boolean } | null>(null)
  const fetchPage = useCallback(
    (cursor?: number): Promise<CommunityPage<CommunityPost>> => {
      if (view === 'hot') return getPopularPosts({ ticker: scope === 'all' ? undefined : ticker, size: 30 })
      if (view === 'mine') return getMyPosts({ cursor, size: FEED_LIMIT })
      return getPosts({ ticker, q: view === 'search' ? qt : undefined, cursor, size: FEED_LIMIT })
    },
    [view, scope, ticker, qt]
  )
  useEffect(() => {
    let alive = true
    const key = listKey
    const t = setTimeout(
      () =>
        fetchPage().then(
          (page) => alive && setSrv({ key, items: page.items.map(fromServerPost), next: page.nextCursor, failed: false, more: false }),
          () => alive && setSrv({ key, items: [], next: null, failed: true, more: false })
        ),
      view === 'search' ? 300 : 0 // 검색어를 칠 때마다 부르지 않게 잠깐 기다림
    )
    return () => {
      alive = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey])
  const cur = srv && srv.key === listKey ? srv : null
  const status: 'loading' | 'live' | 'error' = !cur ? 'loading' : cur.failed ? 'error' : 'live'
  const retryList = () => setTries((n) => n + 1)

  // ?thread= 로 들어온 글: 목록에 없을 수 있어 한 건을 따로 받아 맨 위에 붙인다
  const [pin, setPin] = useState<Post | null>(null)
  const pinThread = useCallback((id: string) => {
    const n = Number(id)
    if (!Number.isInteger(n) || n <= 0) return
    getPost(n).then((p) => setPin(fromServerPost(p)), () => setPin(null))
  }, [])

  const list = useMemo(() => {
    const local = view === 'live' || view === 'mine' ? added[code] || [] : []
    const lead = pin && (view === 'live' || view === 'search') && pin.code === code ? [pin] : []
    const seen = new Set<string>()
    return [...local, ...lead, ...(cur?.items ?? [])]
      .filter((p) => !mods.deleted[p.id] && !seen.has(p.id) && !!seen.add(p.id))
      .map((p) => refreshed[p.id] ?? p)
      .map((p) => (mods.edits[p.id] != null ? { ...p, text: mods.edits[p.id] } : p))
  }, [view, added, code, pin, cur, mods, refreshed])
  const total = list.length
  const shown = list
  const moreOn = !!cur && cur.next != null
  const loadingMore = !!cur && cur.more
  const loadMore = () => {
    if (!cur || cur.next == null || cur.more) return
    const key = cur.key
    setSrv({ ...cur, more: true })
    fetchPage(cur.next).then(
      (page) => setSrv((o) => (o && o.key === key ? { ...o, items: o.items.concat(page.items.map(fromServerPost)), next: page.nextCursor, more: false } : o)),
      () => setSrv((o) => (o && o.key === key ? { ...o, more: false } : o))
    )
  }


  // ===== 스크롤 =====
  const toListTop = useCallback((smooth: boolean) => {
    const behavior = smooth ? 'smooth' : 'auto'
    if (fixed) listRef.current?.scrollTo({ top: 0, behavior })
    else {
      const el = feedRef.current
      if (el && el.getBoundingClientRect().top < 0) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior })
    }
  }, [fixed, listRef, feedRef])

  // ===== 타이머(화면을 떠나면 모두 정리) =====
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => { timers.current.delete(t); fn() }, ms)
    timers.current.add(t)
    return t
  }, [])
  useEffect(() => {
    const set = timers.current
    return () => { set.forEach(clearTimeout); set.clear() }
  }, [])

  // ===== 글 하나에 대한 동작 =====
  // 글(p)·댓글(c) 좋아요: 키는 'p글id'·'c댓글id'. 서버가 돌려준 값으로 바꾼다
  const [lk, setLk] = useState<Record<string, { liked: boolean; likes: number }>>({})
  const like = (key: string) => {
    const id = key.slice(1)
    const post = key[0] === 'p'
    const base = post ? list.find((x) => x.id === id) : Object.values(cm).flatMap((c) => c.items).find((r) => r.id === id)
    if (!base) return
    const liked = (lk[key] ?? base).liked
    const call = post ? (liked ? unlikePost : likePost) : liked ? unlikeComment : likeComment
    call(Number(id)).then(
      (r) => setLk((m) => ({ ...m, [key]: { liked: r.liked, likes: r.likeCount } })),
      (e) => onToast(apiErrorMessage(e, '좋아요를 바꾸지 못했어요'))
    )
  }
  const toggleMore = (id: string) => setExpanded((m) => { const n = { ...m }; if (n[id]) delete n[id]; else n[id] = true; return n })
  const toggleMenu = (id: string) => setMenuState(menu === id ? null : { code, id })
  const closeMenu = useCallback(() => setMenuState(null), [])

  // 글을 찾아 스크롤 + 잠깐 강조(글이 아직 안 그려졌으면 잠깐씩 기다리며 다시 찾음)
  const scrollToPost = (id: string, smooth: boolean) => {
    const behavior = smooth ? 'smooth' : 'auto'
    const go = (n: number) => {
      const el = document.querySelector('[data-post="' + id + '"]')
      if (!el) { if (n < 20) later(() => go(n + 1), 80); return }
      const l = listRef.current
      if (fixed && l) l.scrollTo({ top: el.getBoundingClientRect().top - l.getBoundingClientRect().top + l.scrollTop - 8, behavior })
      else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior })
      later(() => setFlash({ id, on: false }), 150)
      later(() => setFlash(null), 1800)
    }
    later(() => go(0), 120)
  }
  // 내가 쓴 답글 줄에서 그 글로 이동: 더 많이 보여 주고 답글을 펼치고 글을 찾아 스크롤 + 잠깐 강조
  const focusPost = (_targetCode: string, id: string) => {
    pinThread(id)
    if (!cm[id]) loadReplies(id)
    setRepOpen((o) => ({ ...o, [id]: true }))
    setReplyAt(null)
    setFlash({ id, on: true })
    scrollToPost(id, true)
  }
  // 주소 ?thread= 로 들어왔으면 그 글로 스크롤(처음 한 번)
  useEffect(() => {
    if (thread) {
      pinThread(thread)
      loadReplies(thread)
      later(() => scrollToPost(thread, false), 600)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== 답글(서버 댓글) =====
  const loadReplies = useCallback((id: string, cursor?: number, silent = false) => {
    const n = Number(id)
    if (!Number.isInteger(n) || n <= 0) return
    if (cursor == null && !silent) setCm((m) => ({ ...m, [id]: { status: 'loading', items: [], next: null, more: false } }))
    else setCm((m) => (m[id] ? { ...m, [id]: { ...m[id], more: true } } : m))
    getComments(n, { cursor, size: 20 }).then(
      (page) => setCm((m) => ({ ...m, [id]: { status: 'live', items: (cursor == null ? [] : m[id]?.items ?? []).concat(page.items.map(fromServerComment)), next: page.nextCursor, more: false } })),
      () => setCm((m) => (silent ? m : { ...m, [id]: cursor == null ? { status: 'error', items: [], next: null, more: false } : { ...(m[id] ?? { status: 'live', items: [], next: null }), more: false } }))
    )
  }, [])
  const moreReps = (id: string) => {
    const c = cm[id]
    if (c && c.next != null && !c.more) loadReplies(id, c.next)
  }
  const toggleRep = (id: string) => {
    if (!repOpen[id] && !cm[id]) loadReplies(id)
    setRepOpen((o) => ({ ...o, [id]: !o[id] }))
    if (replyAt && replyAt.post === id) { setReplyAt(null); setReplyText('') }
  }
  const [delRepId, setDelRepId] = useState<string | null>(null) // 한 번 눌러 "정말 삭제"로 바뀐 내 댓글
  const removeReply = (postId: string, id: string) => {
    if (delRepId !== id) { setDelRepId(id); return }
    setDelRepId(null)
    deleteComment(Number(id)).then(
      () => {
        setCm((m) => (m[postId] ? { ...m, [postId]: { ...m[postId], items: m[postId].items.filter((r) => r.id !== id) } } : m))
        setRcDelta((d) => ({ ...d, [postId]: (d[postId] || 0) - 1 }))
        onMyChanged()
        onToast('답글을 삭제했어요')
      },
      (e) => onToast(apiErrorMessage(e, '답글을 삭제하지 못했어요'))
    )
  }
  // 답글 버튼: 그 답글 아래에 입력칸을 열고 "@닉네임 "을 채움
  const openBox = (postId: string, repId: string, target: string) => {
    setReplyAt({ post: postId, rep: repId, target })
    setReplyText('@' + target + ' ')
    setRepOpen((o) => ({ ...o, [postId]: true }))
    later(() => {
      const el = document.querySelector<HTMLInputElement>('[data-rbox="' + repId + '"] input')
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
    }, 40)
  }
  // 글 아래 입력칸에 커서를 두면 그 글에 바로 답글 쓰는 자리가 됨
  const focusBox = (postId: string) => {
    if (replyAt && replyAt.post === postId && !replyAt.rep) return
    setReplyAt({ post: postId, rep: null, target: null })
    setReplyText('')
  }
  const typeReply = (v: string) => setReplyText(v.slice(0, REPLY_MAX))
  const clearReply = () => setReplyAt(null)
  // 등록할 글: "@대상 "으로 시작하면 @닉네임 표시는 빼고 나머지만 본문(서버가 replyToNickname으로 @닉네임을 그림)
  let rBody = replyText
  if (replyAt && replyAt.target && rBody.startsWith('@' + replyAt.target)) rBody = rBody.slice(replyAt.target.length + 1)
  rBody = rBody.trim()
  const replyOk = !!replyAt && !!rBody
  const [replying, setReplying] = useState(false)
  const submitReply = () => {
    if (!replyAt || !replyOk || replying) return
    const postId = replyAt.post
    setReplying(true)
    writeComment(Number(postId), { content: rBody, replyToCommentId: replyAt.rep ? Number(replyAt.rep) : undefined }).then(
      (saved) => {
        setCm((m) => ({ ...m, [postId]: { status: 'live', items: (m[postId]?.items ?? []).concat(fromServerComment(saved)), next: m[postId]?.next ?? null, more: false } }))
        setRcDelta((d) => ({ ...d, [postId]: (d[postId] || 0) + 1 }))
        onMyChanged()
        setReplyAt(null)
        setReplyText('')
        setRepOpen((o) => ({ ...o, [postId]: true }))
        onToast('답글을 남겼어요')
      },
      (e) => onToast(apiErrorMessage(e, '답글을 남기지 못했어요'))
    ).finally(() => setReplying(false))
  }
  const replyKey = (e: { key: string; preventDefault: () => void; stopPropagation: () => void }) => {
    if (e.key === 'Enter') { e.preventDefault(); submitReply() }
    else if (e.key === 'Escape') { e.stopPropagation(); setReplyAt(null); setReplyText('') }
  }

  // 내가 쓴 답글 줄(내가 쓴 댓글 탭): 최근 20개만 받는다
  const [myReps, setMyReps] = useState<MyReply[]>([])
  useEffect(() => {
    if (view !== 'mine') return
    let alive = true
    getMyComments({ size: 20 }).then(
      (page) => alive && setMyReps(page.items.map((c) => ({ postId: String(c.postId), time: fromServerComment(c).time, text: c.content, target: c.replyToNickname }))),
      () => {}
    )
    return () => { alive = false }
  }, [view])

  // ===== 끼루: 호출이 끝날 때까지 주기적으로 다시 확인 =====
  const cmRef = useRef(cm)
  useEffect(() => { cmRef.current = cm })
  const pendingPosts = list.filter((p) => p.kkiru === 'PENDING').map((p) => p.id).join(',')
  usePending(pendingPosts, (ids) =>
    Promise.all(ids.map((id) => getPost(Number(id)))).then((ps) => {
      setRefreshed((m) => ({ ...m, ...Object.fromEntries(ps.map((p) => [String(p.id), fromServerPost(p)])) }))
      // 답이 달렸으면 펼쳐 둔 댓글 목록도 다시 받는다
      ps.filter((p) => p.kkiruStatus !== 'PENDING' && cmRef.current[String(p.id)]).forEach((p) => loadReplies(String(p.id), undefined, true))
      return ps.some((p) => p.kkiruStatus === 'PENDING')
    })
  )
  const pendingComments = Object.entries(cm).filter(([, c]) => c.items.some((r) => r.kkiru === 'PENDING')).map(([id]) => id).join(',')
  usePending(pendingComments, (ids) => {
    ids.forEach((id) => loadReplies(id, undefined, true))
    return true
  })
  const retryPost = (id: string) =>
    retryPostKkiru(Number(id)).then(
      (p) => setRefreshed((m) => ({ ...m, [id]: fromServerPost(p) })),
      (e) => onToast(apiErrorMessage(e, '다시 요청하지 못했어요'))
    )
  const retryReply = (postId: string, id: string) =>
    retryCommentKkiru(Number(id)).then(
      () => loadReplies(postId, undefined, true),
      (e) => onToast(apiErrorMessage(e, '다시 요청하지 못했어요'))
    )

  // ===== 글쓰기 =====
  const dt = draft.trim()
  const composing = compFocus || !!draft
  const typeDraft = (v: string) => setDraft(v.slice(0, POST_MAX))
  const [posting, setPosting] = useState(false)
  const submitPost = () => {
    if (!dt || posting) return
    setPosting(true)
    // 끼루에게 물어보기를 켜면 본문 맨 앞에 @끼루를 붙인다(서버는 본문의 @끼루로 호출을 판단함)
    const content = kAsk && !dt.includes('@끼루') ? '@끼루 ' + dt : dt
    writePost({ ticker: code === GEN ? undefined : code, content }).then(
      (saved) => {
        const p = fromServerPost(saved)
        setAdded((a) => ({ ...a, [code]: [p].concat(a[code] || []) }))
        onMyChanged()
        setKAsk(false)
        setDraft('')
        setCompFocus(false)
        setFresh(p.id)
        later(() => setFresh((f) => (f === p.id ? null : f)), FRESH_MS)
        onPosted()
        toListTop(true)
        onToast('글을 남겼어요')
      },
      (e) => onToast(apiErrorMessage(e, '글을 남기지 못했어요'))
    ).finally(() => setPosting(false))
  }

  // ===== 수정·삭제·신고 =====
  const startEdit = (p: Post) => { setMenuState(null); setEditing(p.id); setEditText(p.text) }
  const typeEdit = (v: string) => setEditText(v.slice(0, POST_MAX))
  const cancelEdit = () => setEditing(null)
  // 빈 글이면 저장하지 않고 수정 칸을 그대로 둠
  const saveEdit = (id: string) => {
    const v = editText.trim()
    if (!v) return
    editPost(Number(id), v).then(
      (saved) => {
        setEdits((m) => ({ ...m, [id]: saved.content }))
        setEditing(null)
        onToast('글을 수정했어요')
      },
      (e) => onToast(apiErrorMessage(e, '글을 수정하지 못했어요'))
    )
  }
  const askDelete = (id: string) => { setMenuState(null); setDelId(id) }
  const cancelDelete = () => setDelId(null)
  const confirmDelete = () => {
    if (!delId) return
    const id = delId
    setDelId(null)
    deletePost(Number(id)).then(
      () => {
        setDeleted((m) => ({ ...m, [id]: true }))
        onMyChanged()
        onToast('글을 삭제했어요')
      },
      (e) => onToast(apiErrorMessage(e, '글을 삭제하지 못했어요'))
    )
  }
  const openReport = (target: { postId?: number; commentId?: number }) => { setMenuState(null); setReport({ reason: null, ...target }) }
  const pickReason = (reason: ReportReason) => setReport((r) => r && { ...r, reason })
  const cancelReport = () => setReport(null)
  const submitReport = () => {
    if (!report || !report.reason) return
    const { reason, postId, commentId } = report
    setReport(null)
    reportTarget({ postId, commentId, reason }).then(
      () => onToast('신고를 접수했어요. 운영 정책에 따라 확인할게요'),
      (e) => onToast(apiErrorMessage(e, '신고하지 못했어요'))
    )
  }

  return { view, qOn, list, total, shown, status, retryList, moreOn, loadingMore, lk, like, expanded, toggleMore, menu, toggleMenu, closeMenu, loadMore, flash, fresh, toListTop, focusPost, myReps, retryPost, retryReply, draft, compFocus, setCompFocus, composing, canPost: !!dt && !posting, typeDraft, submitPost, kAsk, toggleKAsk: () => setKAsk((v) => !v), editing, editText, startEdit, typeEdit, cancelEdit, saveEdit, delId, askDelete, cancelDelete, confirmDelete, report, openReport, pickReason, cancelReport, submitReport, repOpen, replyAt, replyText, replyOk, replying, toggleRep, moreReps, cm, rcDelta, delRepId, removeReply, openBox, focusBox, typeReply, clearReply, submitReply, replyKey }
}

const POLL_MAX = 20 // 끼루 호출 상태를 다시 확인하는 최대 횟수

// key(쉼표로 이은 대상 id)가 있는 동안 3초부터 점점 길게(최대 8초) run을 부른다. run이 false를 돌려주면 멈춘다
function usePending(key: string, run: (ids: string[]) => Promise<boolean> | boolean) {
  const runRef = useRef(run)
  useEffect(() => { runRef.current = run })
  useEffect(() => {
    if (!key) return
    let alive = true
    let n = 0
    let t: ReturnType<typeof setTimeout>
    const tick = () => {
      Promise.resolve(runRef.current(key.split(','))).then((again) => again, () => true).then((again) => {
        if (alive && again && ++n < POLL_MAX) t = setTimeout(tick, Math.min(3000 + n * 1000, 8000))
      })
    }
    t = setTimeout(tick, 3000)
    return () => { alive = false; clearTimeout(t) }
  }, [key])
}
