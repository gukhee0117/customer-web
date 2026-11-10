import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { tradeViewOf } from './myinfoProfile'
import { useTendency } from '../invest/useNewPkgData'
import styles from './MyInfoTradeBox.module.css'

interface Props {
  className?: string
  onOpenAssess: () => void // 다시 진단하기 창 열기
}

// 거래로 본 성향(참고용). 미진단일 때는 페이지가 이 박스를 아예 그리지 않음(원본)
export function MyInfoTradeBox({ className, onOpenAssess }: Props) {
  const { state, data } = useTendency()
  const tp = data ? tradeViewOf(data) : null
  return (
    <Box
      data-box="trade-profile"
      className={cx(styles.box, className)}
      title="거래로 본 성향"
    >
      {tp ? (
        <>
          <div className={styles.head}>{tp.head}</div>
          <div className={styles.rows}>
            {tp.rows.map((r) => (
              <div key={r.k} className={styles.row}>
                <span>{r.k}</span>
                <b>{r.v}</b>
              </div>
            ))}
          </div>
          <div className={styles.desc}>{tp.desc}</div>
          <div className={styles.foot}>
            <button type="button" className={styles.link} onClick={onOpenAssess}>
              다시 진단하기 ›
            </button>
          </div>
        </>
      ) : (
        <div className={styles.none}>{state === 'loading' ? '불러오는 중이에요' : state === 'ready' ? '체결된 매수가 쌓이면 보여드려요' : '불러오지 못했어요. 잠시 후 다시 확인해 주세요'}</div>
      )}
    </Box>
  )
}
