import { useEffect, useState } from 'react'
import { getMyPosts, getPopularPosts, getPosts } from '../../api/community'
import type { CommunityPage, CommunityPost } from '../../api/community'
import type { ChatProfile } from '../../data/returns'
import { GEN, FEED_LIMIT } from '../community/communityData'
import { profileKeyOf, timeLabel } from '../community/communityPosts'
import { usePollTick } from '../common/usePollTick'
import { useDebounced } from '../invest/useNewPkgData'
import { HOT_LIMIT, LIVE_POLL_MS, type HotScope } from './homeChatData'
import type { ChatItem } from './homeChatLogic'

export type ChatView = 'live' | 'hot' | 'mine' | 'search'
export interface HomeChat {
  status: 'loading' | 'live' | 'error'
  items: ChatItem[] // 최신 글이 앞(index 0)
}

// 서버 글 → 채팅 한 줄. 성향은 서버가 공개 동의한 때만 값을 주므로 없으면 비공개
const itemOf = (p: CommunityPost): ChatItem => ({
  code: p.ticker ?? GEN,
  kkiru: p.kkiruStatus === 'ANSWERED',
  row: [String(p.id), p.authorNickname ?? '익명', (profileKeyOf(p.authorInvestorType) ?? 'private') as ChatProfile, timeLabel(p.createdAt), p.content, p.likeCount, p.commentCount, p.mine ? 1 : 0]
})

// 홈 채팅 박스 글: 실시간·검색은 종목 글, 인기글은 이 종목/전체 인기순, 내가 쓴 글은 내 글.
// 실시간 탭은 주기로 다시 받는다. 종목이 바뀌면 이전 종목 글이 잠깐 보이지 않게 key로 구분한다
export function useHomeChat(code: string, view: ChatView, q: string, scope: HotScope): HomeChat {
  const dq = useDebounced(q, 300)
  const tick = usePollTick(LIVE_POLL_MS, view === 'live')
  const key = [code, view, view === 'search' ? dq : '', view === 'hot' ? scope : ''].join('|')
  const [res, setRes] = useState<{ key: string; status: 'live' | 'error'; items: ChatItem[] } | null>(null)

  useEffect(() => {
    if (view === 'search' && !dq) return
    let alive = true
    const ticker = code === GEN ? 'GENERAL' : code
    const req: Promise<CommunityPage<CommunityPost>> =
      view === 'hot' ? getPopularPosts({ ticker: scope === 'stock' ? ticker : undefined, size: HOT_LIMIT })
      : view === 'mine' ? getMyPosts({ ticker, size: FEED_LIMIT })
      : getPosts({ ticker, q: view === 'search' ? dq : undefined, size: FEED_LIMIT })
    req.then(
      (page) => alive && setRes({ key, status: 'live', items: page.items.map(itemOf) }),
      () => alive && setRes((prev) => ({ key, status: 'error', items: prev?.key === key ? prev.items : [] }))
    )
    return () => {
      alive = false
    }
    // tick은 실시간 탭의 주기 갱신용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])

  if (view === 'search' && !dq) return { status: 'live', items: [] }
  return res?.key === key ? res : { status: 'loading', items: [] }
}
