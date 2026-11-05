import type { RefObject } from 'react'
import '../../styles/tokens.css'
import { cx } from '../common/cx'
import { FEED_EMPTY } from './communityData'
import { postPf, repCount, type Post } from './communityPosts'
import { CommunityPost } from './CommunityPost'
import { CommunityReplies } from './CommunityReplies'
import type { useCommunityFeed } from './useCommunityFeed'
import styles from './CommunityFeed.module.css'

type Feed = ReturnType<typeof useCommunityFeed>

interface CommunityFeedProps {
  feed: Feed
  q: string // 글 검색어(검색 중일 때만 값이 있음)
  scope: 'stock' | 'all'
  fixed: boolean
  myPf: string // 내 성향(아바타)
  listRef: RefObject<HTMLDivElement | null>
  onShare: (p: Post) => void
  onGoReply: (postId: string) => void // 내가 쓴 답글 줄 → 그 글로 이동
  onBot: () => void // 끼루 답변 줄의 "끼루 챗봇에서 물어보기 ›"
}

// 새 글 바 + 글 목록(고정 상태에서는 이 영역만 스크롤) + 이전 글 더 보기
export function CommunityFeed({ feed, q, scope, fixed, myPf, listRef, onShare, onGoReply, onBot }: CommunityFeedProps) {
  const multi = feed.view === 'mine' || (feed.view === 'hot' && scope === 'all')
  const empty = feed.status === 'live' && !feed.shown.length
  const emptyText = feed.qOn ? FEED_EMPTY.search(q) : feed.view === 'mine' ? FEED_EMPTY.mine : FEED_EMPTY.other

  return (
    <>
      <div ref={listRef} data-scroll="1" className={cx(styles.list, fixed && styles.listFixed)}>
        {feed.status === 'loading' && !feed.shown.length && <div className={styles.empty}>글을 불러오는 중이에요</div>}
        {feed.status === 'error' && (
          <div className={styles.empty}>
            글을 불러오지 못했어요 <button type="button" className={styles.more} onClick={feed.retryList}>다시 시도</button>
          </div>
        )}
        {empty && <div className={styles.empty}>{emptyText}</div>}
        {feed.shown.map((p) => (
          <CommunityPost
            key={p.id}
            p={p}
            pf={postPf(p.pfRaw, myPf)}
            q={feed.qOn ? q.trim() : ''}
            multi={multi}
            liked={(feed.lk['p' + p.id] ?? p).liked}
            likes={(feed.lk['p' + p.id] ?? p).likes}
            expanded={!!feed.expanded[p.id]}
            menuOpen={feed.menu === p.id}
            rn={repCount(p, feed.rcDelta)}
            repOpen={!!feed.repOpen[p.id]}
            fresh={feed.fresh === p.id}
            flash={feed.flash && feed.flash.id === p.id ? (feed.flash.on ? 'on' : 'fade') : null}
            onLike={feed.like}
            onMore={feed.toggleMore}
            onMenu={feed.toggleMenu}
            onToggleRep={feed.toggleRep}
            onShare={onShare}
            kkiru={p.kkiru}
            onOpenReplies={() => { if (!feed.repOpen[p.id]) feed.toggleRep(p.id) }}
            editing={feed.editing === p.id}
            editText={feed.editText}
            onRetry={() => feed.retryPost(p.id)}
            onBot={onBot}
            onEdit={feed.startEdit}
            onEditType={feed.typeEdit}
            onEditCancel={feed.cancelEdit}
            onEditSave={feed.saveEdit}
            onDelete={feed.askDelete}
            onReport={() => feed.openReport({ postId: Number(p.id) })}
          >
            {feed.repOpen[p.id] && <CommunityReplies p={p} feed={feed} myPf={myPf} q={feed.qOn ? q.trim() : ''} onBot={onBot} />}
          </CommunityPost>
        ))}
        {feed.view === 'mine' && (
          <>
            <div className={styles.myRepHead}>내가 쓴 답글 <span className={styles.myRepCount}>{feed.myReps.length}개</span></div>
            {feed.myReps.map((r, i) => (
              <a
                key={r.postId + i}
                className={styles.myRep}
                href="#"
                onClick={(e) => { e.preventDefault(); onGoReply(r.postId) }}
              >
                <div className={styles.myRepTop}>
                  <span className={styles.myRepMeta}>글 #{r.postId}에 남긴 답글 · {r.time}</span>
                </div>
                <div className={styles.myRepText}>{r.target && <span className={styles.at}>@{r.target} </span>}{r.text}</div>
              </a>
            ))}
          </>
        )}
        {feed.moreOn && <button type="button" className={styles.more} disabled={feed.loadingMore} onClick={feed.loadMore}>{feed.loadingMore ? '불러오는 중…' : '이전 글 더 보기'}</button>}
      </div>
    </>
  )
}

