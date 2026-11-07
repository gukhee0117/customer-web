import { apiClient } from './client'
import type { ApiResponse } from './client'

export type KkiruStatus = 'PENDING' | 'ANSWERED' | 'NO_SOURCE' | 'OUT_OF_SCOPE' | 'FOLLOW_UP' | 'FAILED'
export type CommunityStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED'
export type ReportReason = 'ABUSE' | 'SPAM' | 'PRIVACY' | 'ETC'

export interface CommunityPost {
  id: number
  ticker: string | null // 종목 없는 글(게시판 "RIA 제도·일반")은 null
  authorNickname: string | null
  authorInvestorType: string | null // 공개에 동의하지 않았으면 null
  mine: boolean
  content: string // 숨김·삭제 글은 안내 문구
  status: CommunityStatus
  likeCount: number
  commentCount: number
  likedByMe: boolean
  kkiruStatus: KkiruStatus | null
  edited: boolean
  editable: boolean
  createdAt: string // 업무시계 기준 LocalDateTime(시간대 없음)
}

export interface CommunityComment {
  id: number
  postId: number
  authorType: 'CUSTOMER' | 'AI'
  authorNickname: string | null // 끼루 댓글은 "끼루 AI"
  authorInvestorType: string | null
  mine: boolean
  postAuthor: boolean
  content: string
  status: CommunityStatus
  likeCount: number
  likedByMe: boolean
  replyToCommentId: number | null
  replyToNickname: string | null
  kkiruStatus: KkiruStatus | null
  sourcesJson: string | null // 끼루 댓글의 근거: [{id, label, url}]
  createdAt: string
}

export interface CommunityPage<T> {
  items: T[]
  nextCursor: number | null // 없으면 마지막 쪽
}

export interface TickerInfo {
  ticker: string
  name: string
  market: string
}

export interface TickerRank {
  rank: number
  ticker: string
  name: string | null
  postCount: number
  commentCount: number
  reason: string | null
}

export interface MySummary {
  nickname: string | null
  postCount: number
  commentCount: number
  investorTypePublic: boolean
}

export interface LikeResult {
  liked: boolean
  likeCount: number
}

export interface PostListParams {
  ticker?: string // 'GENERAL'이면 종목 없는 글, 비우면 전체
  q?: string
  cursor?: number
  size?: number
}

const BASE = '/api/customer/community'

async function get<T>(path: string, params?: object): Promise<T> {
  const res = await apiClient.get<ApiResponse<T>>(BASE + path, { params })
  return res.data.data
}
async function send<T>(method: 'post' | 'put' | 'delete', path: string, body?: object): Promise<T> {
  const res = await apiClient.request<ApiResponse<T>>({ method, url: BASE + path, data: body })
  return res.data.data
}

export const getTickers = () => get<TickerInfo[]>('/tickers')
export const getTickerRanking = (size = 12) => get<TickerRank[]>('/tickers/ranking', { size })

export const getPosts = (p: PostListParams = {}) => get<CommunityPage<CommunityPost>>('/posts', p)
export const getPopularPosts = (p: { ticker?: string; size?: number } = {}) => get<CommunityPage<CommunityPost>>('/posts/popular', p)
export const getMyPosts = (p: { ticker?: string; cursor?: number; size?: number } = {}) => get<CommunityPage<CommunityPost>>('/me/posts', p)
export const getPost = (id: number) => get<CommunityPost>(`/posts/${id}`)
export const writePost = (body: { ticker?: string; content: string }) => send<CommunityPost>('post', '/posts', body)
export const editPost = (id: number, content: string) => send<CommunityPost>('put', `/posts/${id}`, { content })
export const deletePost = (id: number) => send<void>('delete', `/posts/${id}`)
export const retryPostKkiru = (id: number) => send<CommunityPost>('post', `/posts/${id}/kkiru/retry`)

export const getComments = (postId: number, p: { cursor?: number; size?: number } = {}) => get<CommunityPage<CommunityComment>>(`/posts/${postId}/comments`, p)
/** 첫 쪽부터 이어서 받아 count개 이상(또는 끝)까지 하나로 합친다. 이미 더 본 댓글을 조용히 다시 받을 때 쓴다. 쪽 크기는 서버 상한 50. */
export async function getCommentsThrough(postId: number, count: number): Promise<CommunityPage<CommunityComment>> {
  const items: CommunityComment[] = []
  let cursor: number | undefined
  let nextCursor: number | null
  do {
    const page = await getComments(postId, { cursor, size: 50 })
    items.push(...page.items)
    nextCursor = page.nextCursor
    cursor = nextCursor ?? undefined
  } while (nextCursor != null && items.length < count)
  return { items, nextCursor }
}
export const writeComment = (postId: number, body: { content: string; replyToCommentId?: number }) => send<CommunityComment>('post', `/posts/${postId}/comments`, body)
export const deleteComment = (id: number) => send<void>('delete', `/comments/${id}`)
export const retryCommentKkiru = (id: number) => send<CommunityComment>('post', `/comments/${id}/kkiru/retry`)

export const likePost = (id: number) => send<LikeResult>('put', `/posts/${id}/like`)
export const unlikePost = (id: number) => send<LikeResult>('delete', `/posts/${id}/like`)
export const likeComment = (id: number) => send<LikeResult>('put', `/comments/${id}/like`)
export const unlikeComment = (id: number) => send<LikeResult>('delete', `/comments/${id}/like`)

export const reportTarget = (body: { postId?: number; commentId?: number; reason: ReportReason }) => send<void>('post', '/reports', body)

export const getMyComments = (p: { ticker?: string; cursor?: number; size?: number } = {}) => get<CommunityPage<CommunityComment>>('/me/comments', p)
export const getMySummary = () => get<MySummary>('/me/summary')
export interface KkiruSource {
  id: string
  label: string
  url: string | null
}

// 끼루 댓글의 근거 칩. 비었거나 깨진 JSON이면 빈 배열
export function parseSources(json: string | null): KkiruSource[] {
  if (!json) return []
  try {
    const list: unknown = JSON.parse(json)
    return Array.isArray(list) ? (list as KkiruSource[]).filter((s) => typeof s?.id === 'string' && typeof s?.label === 'string') : []
  } catch {
    return []
  }
}
