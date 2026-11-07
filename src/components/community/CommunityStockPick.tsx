import type { KeyboardEvent, RefObject } from 'react'
import '../../styles/tokens.css'
import { F } from '../../lib/calc'
import { StockIcon } from '../common/StockIcon'
import { cx } from '../common/cx'
import type { DdGroup, Seg } from './communityLogic'
import styles from './CommunityStockPick.module.css'

const tone = (n: number) => (n > 0 ? styles.up : n < 0 ? styles.down : styles.flat)

export const SearchIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.noShrink}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

function Segs({ segs }: { segs: Seg[] }) {
  return <>{segs.map((g, i) => <span key={i} className={g.hl ? styles.hl : undefined}>{g.t}</span>)}</>
}

interface CommunityStockPickProps {
  groups: DdGroup[]
  q: string
  hi: number // 키보드·마우스로 짚은 줄
  placeholder: string
  ariaLabel: string
  inputRef: RefObject<HTMLInputElement | null>
  onType: (v: string) => void
  onKey: (e: KeyboardEvent) => void
  onPick: (code: string) => void
  onHover: (idx: number) => void
  tag?: (code: string) => string // 주면 오른쪽에 글 수·등락 대신 이 글자(관심 종목 추가 목록의 '추가됨')
}

// 종목 고르기 목록 안쪽(검색칸 + 묶음 제목 + 줄들 + 없는 종목 문구). 바깥 상자(위치·폭)는 쓰는 쪽이 정함
export function CommunityStockPick({ groups, q, hi, placeholder, ariaLabel, inputRef, onType, onKey, onPick, onHover, tag }: CommunityStockPickProps) {
  const empty = !!q.trim() && !groups.length
  let k = 0
  return (
    <>
      <label className={styles.ddSearch}>
        <SearchIcon size={15} />
        <input ref={inputRef} className={styles.ddInput} value={q} onChange={(e) => onType(e.target.value)} onKeyDown={onKey} placeholder={placeholder} aria-label={ariaLabel} />
      </label>
      <div role="listbox" className={styles.ddList}>
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <div className={styles.grTitle}>{g.title}</div>}
            {g.items.map((o) => {
              const idx = k++
              const on = idx === hi
              return (
                <button
                  key={o.code}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={cx(styles.opt, on && styles.optOn)}
                  onClick={() => onPick(o.code)}
                  onMouseEnter={() => { if (hi !== idx) onHover(idx) }}
                >
                  {g.rank && <span className={cx(styles.rank, o.rank != null && o.rank <= 3 && styles.rankTop)}>{o.rank}</span>}
                  <StockIcon color={o.icon.color} initial={o.icon.ini} size={24} code={o.code} />
                  <span className={styles.optName}>
                    <span className={styles.optNameText}><Segs segs={o.name} /></span>
                    <span className={styles.optCode}><Segs segs={o.codeSegs} /></span>
                  </span>
                  {tag ? (
                    <span className={styles.tag}>{tag(o.code)}</span>
                  ) : (
                    <span className={styles.optRight}>
                      {o.posts != null && <span className={styles.optPosts}>오늘 글 {o.posts}</span>}
                      <span className={cx(styles.optChg, o.chg == null ? styles.flat : tone(o.chg))}>{o.chg == null ? '' : F.pct(o.chg)}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
        {empty && <div className={styles.empty}>‘{q}’에 맞는 종목이 없어요</div>}
      </div>
    </>
  )
}
