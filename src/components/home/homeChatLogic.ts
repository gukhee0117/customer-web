import { RETURNS_DATA as RD, type ChatRow } from '../../data/returns'
import { F } from '../../lib/calc'
import { GEN, GEN_NAME, KR_ALL } from '../community/communityData'
import { stockName, type StocksValue } from '../community/stocksContext'
import type { HotScope } from './homeChatData'

// 채팅 한 줄: 화면 행 + 어느 종목방 글인지 + 끼루가 답했는지
export interface ChatItem {
  row: ChatRow
  code: string
  kkiru: boolean
}

export interface Seg {
  t: string
  hl: boolean
}

const PRIVATE = 'private'
const plOf = (pf: string) => (pf === PRIVATE ? '' : (RD.PROFILES[pf]?.label ?? ''))

// 검색어와 일치하는 글자를 나눠 강조(검색 중이 아니면 통째로 한 조각)
export function splitMatch(text: string, q: string): Seg[] {
  if (!q) return [{ t: text, hl: false }]
  const out: Seg[] = []
  let i = 0
  let j: number
  while ((j = text.indexOf(q, i)) >= 0) {
    if (j > i) out.push({ t: text.slice(i, j), hl: false })
    out.push({ t: q, hl: true })
    i = j + q.length
  }
  if (i < text.length) out.push({ t: text.slice(i), hl: false })
  return out
}

// 드롭다운 종목명·코드: 첫 일치 글자만 강조(대소문자 무시)
export function splitFirst(str: string, dq: string): Seg[] {
  const i = dq ? str.toLowerCase().indexOf(dq.toLowerCase()) : -1
  if (i < 0) return [{ t: str, hl: false }]
  return [
    { t: str.slice(0, i), hl: false },
    { t: str.slice(i, i + dq.length), hl: true },
    { t: str.slice(i + dq.length), hl: false }
  ].filter((s) => s.t)
}

export interface ChatMsg {
  id: string
  to: string
  nick: string
  pf: string
  pl: string
  kkiru: boolean
  time: string
  segs: Seg[]
  likes: number
  replies: number
}

// 한 종목방의 글 목록: 최신 글이 앞(index 0)인 배열을 뒤집어 오래된 글 위 → 최신 글 아래. 검색 결과는 서버가 이미 걸러 준 글
export function chatMsgs(items: ChatItem[], view: 'live' | 'hot' | 'mine' | 'search', q: string): ChatMsg[] {
  const qOn = !!q && view === 'search'
  return items
    .slice()
    .reverse()
    .map(({ row: m, code, kkiru }) => {
      const pf = m[2]
      return {
        id: m[0],
        to: '/community?stock=' + code + '&thread=' + m[0],
        nick: m[7] ? m[1] + ' (나)' : m[1],
        pf,
        pl: plOf(pf),
        kkiru,
        time: m[3],
        segs: splitMatch(m[4], qOn ? q : ''),
        likes: m[5],
        replies: m[6]
      }
    })
}

export interface HotMsg {
  id: string
  to: string
  rank: number
  pf: string
  nick: string
  stock: string | null
  text: string
  likes: number
  replies: number
}

// 인기글: 서버가 인기 순으로 준 글. 전체 종목이면 종목명을 같이 보임
export function hotMsgs(items: ChatItem[], scope: HotScope, stocks: StocksValue): HotMsg[] {
  return items.map(({ row: m, code }, i) => ({
    id: m[0],
    to: '/community?stock=' + code + '&thread=' + m[0],
    rank: i + 1,
    pf: m[2],
    nick: m[7] ? m[1] + ' (나)' : m[1],
    stock: scope === 'all' ? (code === GEN ? GEN_NAME : stockName(stocks, code)) : null,
    text: m[4],
    likes: m[5],
    replies: m[6]
  }))
}

export interface DdItem {
  code: string
  flat: number
  on: boolean
  rank: number | null // 많이 이야기하는 종목에서만 순위·오늘 글 수
  top3: boolean
  posts: string
  sector: string
  color: string
  ini: string
  chg: string
  chgTone: number
  nameSegs: Seg[]
  codeSegs: Seg[]
}
export interface DdGroup {
  title: string
  items: DdItem[]
}

// 종목 드롭다운: 검색어가 있으면 이름·코드 일치 종목, 없으면 '최근 본 종목'과 '많이 이야기하는 종목'(서버 순위)
export function ddGroups(dq: string, code: string, recent: string[], stocks: StocksValue): { groups: DdGroup[]; flat: string[] } {
  const lc = dq.toLowerCase()
  const known = (c: string) => stocks.stock(c) != null
  const posts: Record<string, string> = {}
  stocks.rank.forEach((r) => (posts[r.ticker] = String(r.postCount)))
  const raw: { title: string; codes: string[]; rank?: boolean }[] = dq
    ? [{ title: '', codes: stocks.list.filter((s) => s.name.toLowerCase().includes(lc) || s.code.includes(dq)).map((s) => s.code) }]
    : [{ title: '최근 본 종목', codes: recent.filter(known) }, { title: '많이 이야기하는 종목', codes: stocks.rank.map((r) => r.ticker).filter(known), rank: true }]
  const flat: string[] = []
  const groups = raw
    .filter((g) => g.codes.length)
    .map((g) => ({
      title: g.title,
      items: g.codes.map((c, gi): DdItem => {
        const info = stocks.stock(c)!
        const rate = stocks.quote(c).rate
        flat.push(c)
        return {
          code: c,
          flat: flat.length - 1,
          on: c === code,
          rank: g.rank ? gi + 1 : null,
          top3: gi < 3,
          posts: g.rank ? (posts[c] ?? '0') : '',
          sector: KR_ALL[c]?.[0] ?? '',
          color: info.color,
          ini: info.ini,
          chg: rate == null ? '-' : F.pct(rate),
          chgTone: rate ?? 0,
          nameSegs: splitFirst(info.name, dq),
          codeSegs: splitFirst(c, dq)
        }
      })
    }))
  return { groups, flat }
}
