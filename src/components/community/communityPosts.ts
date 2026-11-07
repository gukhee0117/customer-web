import { parseSources, type CommunityComment, type CommunityPost, type KkiruSource, type KkiruStatus } from '../../api/community'
import { RETURNS_DATA as RD, type ChatProfile } from '../../data/returns'
import { getBusinessToday } from '../../lib/clock'
import { GEN } from './communityData'

export interface Post {
  id: string
  nick: string
  pfRaw: string
  time: string
  text: string
  likes: number
  liked: boolean // 내가 좋아요를 눌렀는가
  rc: number // 답글 수(원래 있던 것)
  mine: boolean
  editable: boolean // 수정할 수 있는 글(끼루가 답했거나 답하는 중이면 서버가 막음)
  code: string
  kkiru: KkiruStatus | null // 본문에 @끼루가 있을 때 호출 진행 상태(없으면 null)
}
export interface Reply {
  id: string
  nick: string
  pfRaw: string
  time: string
  text: string
  likes: number
  liked: boolean
  target: string | null // 답하는 대상 닉네임(서버 replyToNickname)
  mine: boolean
  ai: boolean // 끼루 AI 댓글
  kkiru: KkiruStatus | null // 이 댓글에 @끼루가 있을 때 호출 진행 상태
  sources: KkiruSource[] // 끼루 댓글의 근거
}

export interface PostMods { deleted: Record<string, boolean>; edits: Record<string, string> }
// 서버 투자성향(공개 동의한 경우만 값이 옴) → 화면 성향 키. 모르는 값이면 비공개
const PROFILE_KEY: Record<string, string> = { STABLE: 'stable', CONSERVATIVE: 'stableSeek', NEUTRAL: 'neutral', ACTIVE: 'active', AGGRESSIVE: 'aggressive' }
export const profileKeyOf = (type: string | null): string | null => (type && PROFILE_KEY[type]) || null
const profileOf = (mine: boolean, type: string | null): string => (mine ? 'me' : (profileKeyOf(type) ?? 'private'))

// 서버 글 → 화면 글. 시간은 오늘이면 시:분, 아니면 월.일 시:분(서버 createdAt은 업무시계 기준)
export const timeLabel = (iso: string): string => (iso.slice(0, 10) === getBusinessToday() ? iso.slice(11, 16) : iso.slice(5, 10).replace('-', '.') + ' ' + iso.slice(11, 16))
export const fromServerPost = (p: CommunityPost): Post => ({
  id: String(p.id),
  nick: p.authorNickname ?? '익명',
  pfRaw: profileOf(p.mine, p.authorInvestorType),
  time: timeLabel(p.createdAt),
  text: p.content,
  likes: p.likeCount,
  liked: p.likedByMe,
  rc: p.commentCount,
  mine: p.mine,
  editable: p.editable,
  code: p.ticker ?? GEN,
  kkiru: p.kkiruStatus,
})
// 글 작성자 성향(아바타). 내 글은 내가 공개한 때만, 다른 사람은 서버가 공개 동의한 때만 값을 준다
export const postPf = (raw: string, myPf: string): string => (raw === 'me' ? myPf : raw)

export const fromServerComment = (c: CommunityComment): Reply => ({
  id: String(c.id),
  nick: c.authorNickname ?? '익명',
  pfRaw: profileOf(c.mine, c.authorInvestorType),
  time: timeLabel(c.createdAt),
  text: c.content,
  likes: c.likeCount,
  liked: c.likedByMe,
  target: c.replyToNickname,
  mine: c.mine,
  ai: c.authorType === 'AI',
  kkiru: c.kkiruStatus,
  sources: parseSources(c.sourcesJson),
})

// 작성자 성향: 내 글은 내가 공개한 때만 성향 표시, 다른 사람은 공개 동의한 닉네임만
export const plOf = (pf: string): string => (pf === 'private' ? '' : (RD.PROFILES[pf as ChatProfile]?.label ?? ''))
export const myProfile = (pubOn: boolean, key: string): string => (pubOn ? key : 'private')

// ===== 글 목록 보기 종류 =====
export type FeedView = 'live' | 'hot' | 'mine' | 'search'
export const repCount = (p: Post, delta: Record<string, number>): number => p.rc + (delta[p.id] || 0)
// 내가 쓴 답글(내가 쓴 댓글 탭 아래 줄)
export interface MyReply { postId: string; time: string; text: string; target: string | null }
