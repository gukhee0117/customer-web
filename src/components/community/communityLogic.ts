import { DEFAULT_RECENT, GEN, GEN_NAME, GEN_RE, RECENT_KEY, RECENT_LIMIT } from './communityData'
import type { StocksValue } from './stocksContext'

const CODE = /^[0-9A-Z]{6}$/

// ===== 최근 본 종목 =====
// 처음: sessionStorage(없으면 기본값) → 지금 종목을 맨 앞으로
export function loadRecent(code: string): string[] {
  let r = DEFAULT_RECENT
  try {
    const v = JSON.parse(sessionStorage.getItem(RECENT_KEY) || 'null')
    if (Array.isArray(v)) r = v.filter((c): c is string => typeof c === 'string').slice(0, RECENT_LIMIT)
  } catch { /* 저장값이 깨져 있으면 기본값 */ }
  return (CODE.test(code) ? [code] : []).concat(r.filter((c) => c !== code && CODE.test(c))).slice(0, RECENT_LIMIT)
}
export const pushRecent = (recent: string[], code: string): string[] =>
  code === GEN ? recent : [code].concat(recent.filter((c) => c !== code)).slice(0, RECENT_LIMIT)

// ===== 종목 고르기 목록 =====
export interface Seg { t: string; hl: boolean }
export interface DdItem {
  code: string
  name: Seg[]
  codeSegs: Seg[]
  rank: number | null // 순위 묶음에서만 보임
  posts: string | null
  chg: number | null
  icon: { color: string; ini: string }
}
export interface DdGroup { title: string; rank: boolean; items: DdItem[] }

const hl = (t: string, dq: string): Seg[] => {
  if (!dq) return [{ t, hl: false }]
  const i = t.toLowerCase().indexOf(dq.toLowerCase())
  if (i < 0) return [{ t, hl: false }]
  return [{ t: t.slice(0, i), hl: false }, { t: t.slice(i, i + dq.length), hl: true }, { t: t.slice(i + dq.length), hl: false }].filter((x) => x.t)
}

export function ddGroups(dqRaw: string, recent: string[], stocks: StocksValue, withGen = true): DdGroup[] {
  const dq = dqRaw.trim()
  const dql = dq.toLowerCase()
  const item = (c: string, rankGroup: boolean): DdItem => {
    if (c === GEN) return { code: c, name: hl(GEN_NAME, dq), codeSegs: [], rank: null, posts: null, chg: null, icon: { color: 'var(--color-navy)', ini: 'R' } }
    const s = stocks.stock(c)
    const idx = stocks.rank.findIndex((r) => r.ticker === c)
    return {
      code: c,
      name: hl(s?.name ?? c, dq),
      codeSegs: hl(c, dq),
      rank: rankGroup && idx >= 0 ? idx + 1 : null,
      posts: idx >= 0 ? String(stocks.rank[idx].postCount) : null,
      chg: stocks.quote(c).rate,
      icon: { color: s?.color ?? 'var(--color-gray-600)', ini: s?.ini ?? c.slice(0, 1) },
    }
  }
  const genHit = withGen && (!dq || GEN_RE.test(dq)) // 게시판은 종목 고르기에만(관심 종목 추가에는 없음)
  const groups: DdGroup[] = []
  if (genHit) groups.push({ title: dq ? '' : '게시판', rank: false, items: [item(GEN, false)] })
  if (dq) groups.push({ title: '', rank: false, items: stocks.list.filter((s) => s.name.toLowerCase().includes(dql) || s.code.includes(dq)).map((s) => item(s.code, false)) })
  else {
    groups.push({ title: '최근 본 종목', rank: false, items: recent.filter((c) => stocks.stock(c)).slice(0, 3).map((c) => item(c, false)) })
    groups.push({ title: '많이 이야기하는 종목', rank: true, items: stocks.rank.filter((r) => stocks.stock(r.ticker)).map((r) => item(r.ticker, true)) })
  }
  return groups.filter((g) => g.items.length)
}

// ===== 오른쪽 열 인기글 박스 =====
export interface HotRowView { title: string; meta: string; code: string; id: string }
