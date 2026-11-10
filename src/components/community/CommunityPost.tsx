import type { ReactNode } from 'react'
import '../../styles/tokens.css'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { StockLabel } from '../common/StockLabel'
import { cx } from '../common/cx'
import { GEN, GEN_NAME, LONG_CHARS, LONG_LINES, POST_MAX } from './communityData'
import type { KkiruStatus } from '../../api/community'
import { plOf, type Post } from './communityPosts'
import styles from './CommunityPost.module.css'

// 끼루 호출 상태 한 줄: [문구, 링크 글자]. 답한 경우(ANSWERED)는 답글에서 보게 안내
// NO_SOURCE·FOLLOW_UP의 링크는 끼루 챗봇 창을 여는 것(onBot), FAILED의 링크는 다시 요청(onRetry)
const KKIRU_LINES: Record<Exclude<KkiruStatus, 'ANSWERED'>, [string, string]> = {
  PENDING: ['끼루가 근거를 찾고 있어요...', ''],
  NO_SOURCE: ['확인된 자료가 없어 끼루가 답하지 않았어요 ·', '끼루 챗봇에서 물어보기 ›'],
  OUT_OF_SCOPE: ['끼루는 RIA 제도와 종목 정보만 안내해요', ''],
  FOLLOW_UP: ['후속 질문은 끼루 챗봇에서 이어서 물어볼 수 있어요 ·', '끼루 챗봇에서 물어보기 ›'],
  FAILED: ['끼루 답변을 불러오지 못했어요 ·', '다시 요청']
}

interface KkiruLineProps {
  status: KkiruStatus | null
  mine: boolean // 실패는 쓴 사람에게만 보임
  onRetry: () => void
  onBot: () => void
  onOpen: () => void // 답글(끼루 답변) 펼치기
}

export function KkiruLine({ status, mine, onRetry, onBot, onOpen }: KkiruLineProps) {
  if (!status || (status === 'FAILED' && !mine)) return null
  if (status === 'ANSWERED') {
    return (
      <div className={styles.kDone}>
        끼루가 답했어요 · <button type="button" className={styles.kLink} onClick={onOpen}>답글에서 보기</button>
      </div>
    )
  }
  const [text, link] = KKIRU_LINES[status]
  return (
    <div className={styles.kLine}>
      {text}
      {link && <button type="button" className={styles.kLink} onClick={status === 'FAILED' ? onRetry : onBot}>{link}</button>}
    </div>
  )
}

export const Segs = ({ text, q }: { text: string; q: string }) => {
  if (!q) return <span>{text}</span>
  const lo = text.toLowerCase()
  const ql = q.toLowerCase()
  const out: { t: string; hl: boolean }[] = []
  let i = 0
  let j: number
  while ((j = lo.indexOf(ql, i)) >= 0) {
    if (j > i) out.push({ t: text.slice(i, j), hl: false })
    out.push({ t: text.slice(j, j + q.length), hl: true })
    i = j + q.length
  }
  if (i < text.length) out.push({ t: text.slice(i), hl: false })
  return <>{out.map((g, n) => <span key={n} className={g.hl ? styles.hl : undefined}>{g.t}</span>)}</>
}

interface CommunityPostProps {
  p: Post
  pf: string // 작성자 성향(아바타)
  q: string // 검색어(일치 글자 강조). 검색 중이 아니면 빈 문자열
  multi: boolean // 여러 종목 글이 섞인 목록(내가 쓴 댓글·인기글 전체 종목)이면 종목 표시
  liked: boolean
  likes: number // 좋아요 수(서버가 돌려준 값)
  expanded: boolean
  menuOpen: boolean
  rn: number // 답글 수(내가 단 것 포함)
  repOpen: boolean
  fresh: boolean
  flash: 'on' | 'fade' | null
  onLike: (id: string) => void
  onMore: (id: string) => void
  onMenu: (id: string) => void
  onToggleRep: (id: string) => void
  onShare: (p: Post) => void
  kkiru: KkiruStatus | null // 끼루 호출 상태(없으면 끼루 영역 없음)
  onOpenReplies: () => void // 끼루 답변을 보려고 답글 펼치기
  editing: boolean // 이 글을 수정 중
  editText: string
  onRetry: () => void // 끼루 답변 "다시 요청"
  onBot: () => void // "끼루 챗봇에서 물어보기 ›"
  onEdit: (p: Post) => void
  onEditType: (v: string) => void
  onEditCancel: () => void
  onEditSave: (id: string) => void
  onDelete: (id: string) => void
  onReport: () => void
  children?: ReactNode // 펼친 답글 영역(CommunityReplies)
}

// 글 한 개: 아바타·닉네임·성향·시간 + "…" 메뉴 + 본문 + 좋아요/답글/공유 줄 + 끼루 답변
export function CommunityPost({ p, pf, q, multi, liked, likes, expanded, menuOpen, rn, repOpen, fresh, flash, onLike, onMore, onMenu, onToggleRep, onShare, kkiru, onOpenReplies, editing, editText, onRetry, onBot, onEdit, onEditType, onEditCancel, onEditSave, onDelete, onReport, children }: CommunityPostProps) {
  const lines = p.text.split('\n').length
  const long = p.text.length > LONG_CHARS || lines > LONG_LINES
  const exp = expanded || !!q
  const clamped = long && !exp

  return (
    <article
      data-post={p.id}
      className={cx(styles.post, fresh && styles.fresh, flash === 'on' && styles.flash, flash && styles.flashFade)}
    >
      {multi && p.code !== GEN && <div className={styles.stockLine}><StockLabel sym={p.code} size="sm" sector={false} /></div>}
      {multi && p.code === GEN && <div className={styles.genLine}>{GEN_NAME}</div>}
      <div className={styles.grid}>
        <KkiruAvatar profile={pf} size={28} />
        <div className={styles.body}>
          <div className={styles.head}>
            <span className={styles.nick}>{p.mine ? p.nick + ' (나)' : p.nick}</span>
            <span className={styles.meta}>{plOf(pf)}</span>
            <span className={styles.meta}>{p.time}</span>
            <span data-menu="1" className={styles.menuWrap}>
              <button type="button" className={styles.menuBtn} aria-label={p.mine ? '게시글 수정·삭제 메뉴' : '게시글 신고 메뉴'} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => onMenu(p.id)}>
                {p.mine ? '…' : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M7 18v-6a5 5 0 0 1 10 0v6M5 18h14v3H5z" />
                    <path d="M12 2v2M4.93 4.93l1.42 1.42M2 12h2M20 12h2M17.65 6.35l1.42-1.42" />
                  </svg>
                )}
              </button>
              {menuOpen && (
                <div role="menu" className={styles.menu}>
                  {!p.mine && <button type="button" role="menuitem" className={styles.menuItem} onClick={onReport}>신고하기</button>}
                  {p.mine && (
                    <>
                      {p.editable && <button type="button" role="menuitem" className={styles.menuItem} onClick={() => onEdit(p)}>수정</button>}
                      <button type="button" role="menuitem" className={styles.menuItem} onClick={() => onDelete(p.id)}>삭제</button>
                    </>
                  )}
                </div>
              )}
            </span>
          </div>
          {!editing && (
            <>
              <div className={cx(styles.text, clamped && styles.clamp)} style={clamped ? { WebkitLineClamp: LONG_LINES } : undefined}>
                <Segs text={p.text} q={q} />
              </div>
              {long && !q && <button type="button" className={styles.link} onClick={() => onMore(p.id)}>{expanded ? '접기' : '더보기'}</button>}
            </>
          )}
          {editing && (
            <div className={styles.editBox}>
              <textarea className={styles.editArea} value={editText} onChange={(e) => onEditType(e.target.value)} maxLength={POST_MAX} aria-label="글 수정" />
              <div className={styles.editBtns}>
                <button type="button" className={styles.editCancel} onClick={onEditCancel}>취소</button>
                <button type="button" className={styles.editSave} onClick={() => onEditSave(p.id)}>저장</button>
              </div>
            </div>
          )}
          <div className={styles.actions}>
            <button type="button" className={cx(styles.act, liked && styles.actOn)} aria-pressed={liked} onClick={() => onLike('p' + p.id)}>좋아요 {likes}</button>
            <button type="button" className={cx(styles.act, repOpen && styles.actOn)} aria-expanded={repOpen} onClick={() => onToggleRep(p.id)}>답글 {rn} {repOpen ? '∧' : '∨'}</button>
            <button type="button" className={styles.act} onClick={() => onShare(p)}>공유</button>
          </div>
          {kkiru && (
            <div className={styles.kiru}>
              <KkiruLine status={kkiru} mine={p.mine} onRetry={onRetry} onBot={onBot} onOpen={onOpenReplies} />
            </div>
          )}
          {children}
        </div>
      </div>
    </article>
  )
}
