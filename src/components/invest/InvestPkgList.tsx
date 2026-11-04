import '../../styles/tokens.css'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { StockIcon } from '../common/StockIcon'
import { cx } from '../common/cx'
import { iconsOf, toneOf } from './investPkgLogic'
import type { PkgSort, PkgView } from './investPkgLogic'
import styles from './InvestPkgList.module.css'

const SORTS: { key: PkgSort; label: string }[] = [
  { key: 'ret', label: '수익률순' },
  { key: 'new', label: '최근 만든 순' }
]

interface Props {
  className?: string
  rows: PkgView[] // 정렬이 끝난 목록
  sort: PkgSort
  onSort: (s: PkgSort) => void
  selected: string
  onSelect: (id: string) => void
  onNew?: () => void // 새 패키지 창 열기
}

// 내 패키지 목록 — 정렬 2종, 행 클릭 시 선택 표시
export function InvestPkgList({ className, rows, sort, onSort, selected, onSelect, onNew }: Props) {
  return (
    <Box
      className={cx(styles.box, className)}
      title="내 패키지"
      head={
        <>
          <span className={styles.count}>{rows.length}개</span>
          <span className={cx(styles.sorts, styles.sortWrap)}>
            {SORTS.map((s, i) => (
              <span key={s.key} className={styles.sorts}>
                {i > 0 && <span className={styles.dot}>·</span>}
                <button type="button" className={cx(styles.sort, sort === s.key && styles.on)} aria-pressed={sort === s.key} onClick={() => onSort(s.key)}>
                  {s.label}
                </button>
              </span>
            ))}
          </span>
          <button type="button" className={styles.newPkg} onClick={onNew}>
            + 새 패키지
          </button>
        </>
      }
    >
      {rows.map((v) => (
        <button key={v.id} type="button" className={cx(styles.item, v.id === selected && styles.sel)} aria-current={v.id === selected} onClick={() => onSelect(v.id)}>
          <span className={styles.left}>
            <span className={styles.name}>{v.name}</span>
            <span className={styles.sub}>
              <span className={styles.icons}>
                {iconsOf(v).map(([color, ini], i) => (
                  <span key={i} className={styles.icon}>
                    <StockIcon color={color} initial={ini} size={18} />
                  </span>
                ))}
              </span>
              <span className={styles.muted}>{v.items.length}종목</span>
            </span>
          </span>
          <span className={styles.right}>
            <b className={styles.amt}>₩{F.won(v.val)}</b>
            <span className={styles.line}>
              <span className={styles.muted}>오늘 {F.pct(v.todayPct)}</span>
              <span className={cx(styles.ret, styles[toneOf(v.ret)])}>{F.pct(v.ret)}</span>
            </span>
            <span className={styles.muted}>가중평균 {v.grade}등급</span>
          </span>
        </button>
      ))}
    </Box>
  )
}
