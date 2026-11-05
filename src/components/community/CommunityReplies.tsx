import '../../styles/tokens.css'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { assetUrl } from '../common/assetUrl'
import { cx } from '../common/cx'
import { REPLY_MAX } from './communityData'
import { plOf, postPf, type Post } from './communityPosts'
import { KkiruLine, Segs } from './CommunityPost'
import type { useCommunityFeed } from './useCommunityFeed'
import styles from './CommunityReplies.module.css'

type Feed = ReturnType<typeof useCommunityFeed>

interface CommunityRepliesProps {
  p: Post
  feed: Feed
  myPf: string // 내 성향(아바타)
  q: string // 검색어(일치 글자 강조). 검색 중이 아니면 빈 문자열
  onBot: () => void // "끼루 챗봇에서 물어보기 ›"
}

// 펼친 글의 답글: 서버 댓글 목록(오래된 것부터) + 답글 더 보기 + 글 아래 답글 입력칸
export function CommunityReplies({ p, feed, myPf, q, onBot }: CommunityRepliesProps) {
  const c = feed.cm[p.id]
  const all = c?.items ?? []
  const at = feed.replyAt
  const atPost = !!at && at.post === p.id
  const atRep = atPost && !!at.rep
  const boxOk = atPost && !atRep && feed.replyOk && !feed.replying
  const repOk = feed.replyOk && !feed.replying
  const submitOn = (ok: boolean) => cx(styles.submit, ok && styles.submitOn)

  return (
    <div className={styles.wrap}>
      {(!c || c.status === 'loading') && <div className={styles.older}>답글을 불러오는 중이에요</div>}
      {c?.status === 'error' && (
        <div className={styles.older}>
          답글을 불러오지 못했어요 <button type="button" className={styles.act} onClick={() => feed.toggleRep(p.id)}>닫고 다시 열어 주세요</button>
        </div>
      )}
      {all.map((r) => {
        const pf = postPf(r.pfRaw, myPf)
        const lk = feed.lk['c' + r.id] ?? r
        const shownNick = r.mine ? r.nick + ' (나)' : r.nick
        return (
          <div key={r.id} className={styles.rep}>
            {r.ai ? <img className={styles.aiFace} src={assetUrl('assets/kkiru/kkiru-ai-face.png')} alt="" /> : <KkiruAvatar profile={pf} size={24} />}
            <div className={styles.body}>
              <div className={styles.head}>
                <span className={styles.nick}>{shownNick}</span>
                <span className={styles.meta}>{plOf(pf)}</span>
                <span className={styles.meta}>{r.time}</span>
              </div>
              <div className={styles.text}>
                {r.target && <span className={styles.at}>@{r.target} </span>}
                <Segs text={r.text} q={q} />
              </div>
              {r.ai && r.sources.length > 0 && (
                <div className={styles.srcs}>
                  <span className={styles.srcHead}>근거</span>
                  {r.sources.map((src) => (
                    <div key={src.id} className={styles.src} title={src.label}>
                      {src.url ? <a href={src.url} target="_blank" rel="noopener noreferrer">{src.label}</a> : src.label}
                    </div>
                  ))}
                </div>
              )}
              {r.ai && <div className={styles.note}>끼루는 정보를 안내해요 · 교육용 프로젝트의 자체 분석 결과이며 수익을 보장하지 않아요</div>}
              <KkiruLine status={r.kkiru} mine={r.mine} onRetry={() => feed.retryReply(p.id, r.id)} onBot={onBot} onOpen={() => {}} />
              <div className={styles.actions}>
                <button type="button" className={cx(styles.act, lk.liked && styles.actOn)} aria-pressed={lk.liked} onClick={() => feed.like('c' + r.id)}>좋아요 {lk.likes}</button>
                <button type="button" className={styles.act} onClick={() => feed.openBox(p.id, r.id, r.nick)}>답글</button>
                {!r.mine && <button type="button" className={styles.act} onClick={() => feed.openReport({ commentId: Number(r.id) })}>신고</button>}
                {r.mine && (
                  <button type="button" className={styles.act} onClick={() => feed.removeReply(p.id, r.id)}>{feed.delRepId === r.id ? '정말 삭제' : '삭제'}</button>
                )}
              </div>
              {atRep && at.rep === r.id && (
                <div data-rbox={r.id} className={cx(styles.box, styles.boxRep)}>
                  <input
                    className={styles.input}
                    value={feed.replyText}
                    onChange={(e) => feed.typeReply(e.target.value)}
                    onKeyDown={feed.replyKey}
                    maxLength={REPLY_MAX}
                    aria-label="답글 입력"
                    placeholder="답글을 남겨주세요"
                  />
                  <button type="button" className={submitOn(repOk)} disabled={!repOk} onClick={feed.submitReply}>등록</button>
                </div>
              )}
            </div>
          </div>
        )
      })}
      {c && c.next != null && (
        <button type="button" className={styles.older} disabled={c.more} onClick={() => feed.moreReps(p.id)}>{c.more ? '불러오는 중…' : '답글 더 보기'}</button>
      )}
      {!atRep && (
        <div data-rbox="post" className={cx(styles.box, styles.boxPost)}>
          <input
            className={styles.input}
            value={atPost ? feed.replyText : ''}
            onChange={(e) => feed.typeReply(e.target.value)}
            onFocus={() => feed.focusBox(p.id)}
            onKeyDown={feed.replyKey}
            maxLength={REPLY_MAX}
            aria-label="답글 입력"
            placeholder="답글을 남겨주세요"
          />
          <button type="button" className={submitOn(boxOk)} disabled={!boxOk} onClick={() => { if (boxOk) feed.submitReply() }}>등록</button>
        </div>
      )}
    </div>
  )
}
