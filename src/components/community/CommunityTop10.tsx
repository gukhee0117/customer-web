import '../../styles/tokens.css'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { StockIcon } from '../common/StockIcon'
import { cx } from '../common/cx'
import { useStocks } from './stocksContext'
import styles from './CommunityTop10.module.css'

interface CommunityTop10Props {
  code: string // 선택된 종목
  fixed: boolean // 화면에 고정(박스가 칸을 채우고 목록만 스크롤)
  rowH: number // 행 높이(px)
  onSelect: (code: string) => void
}

const tone = (n: number) => (n > 0 ? styles.up : n < 0 ? styles.down : styles.flat)

// 많이 이야기하는 종목 — 순위·종목·등락·글 수. 행을 누르면 선택만 바뀜(가운데 피드 연결은 C-2부터)
export function CommunityTop10({ code, fixed, rowH, onSelect }: CommunityTop10Props) {
  const stocks = useStocks()
  const rows = stocks.rank.filter((r) => stocks.stock(r.ticker))
  return (
    <Box
      data-box="top10"
      className={cx(styles.box, fixed && styles.boxFixed)}
      head={
        <>
          <h2 className={styles.title}>많이 이야기하는 종목</h2>
          <span className={styles.scope}>오늘</span>
        </>
      }
    >
      <div className={cx(styles.list, fixed && styles.listFixed)}>
        {stocks.status === 'loading' && <p className={styles.status}>불러오는 중이에요</p>}
        {stocks.status === 'error' && (
          <p className={styles.status}>
            종목 순위를 불러오지 못했어요{' '}
            <button type="button" className={styles.retry} onClick={stocks.retry}>
              다시 시도
            </button>
          </p>
        )}
        {stocks.status === 'live' && rows.length === 0 && <p className={styles.status}>오늘 올라온 글이 아직 없어요</p>}
        {rows.map((r, i) => {
          const c = r.ticker
          const s = stocks.stock(c)!
          const qt = stocks.quote(c)
          const chg = qt.rate
          const on = c === code
          return (
            <button
              key={c}
              type="button"
              className={cx(styles.row, on && styles.on)}
              style={{ height: rowH }}
              aria-current={on ? 'true' : undefined}
              onClick={() => onSelect(c)}
            >
              <span className={cx(styles.num, i < 3 && styles.numTop)}>{r.rank}</span>
              <StockIcon color={s.color} initial={s.ini} size={20} code={s.code} />
              <span className={styles.name}>
                <span className={styles.nameText}>{s.name}</span> <span className={styles.code}>{c}</span>
              </span>
              <span className={styles.right}>
                <span className={cx(styles.chg, chg == null ? styles.flat : tone(chg))}>{chg == null ? (qt.pending ? '…' : '-') : F.pct(chg)}</span>
                <span className={styles.posts}>글 {r.postCount}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Box>
  )
}
