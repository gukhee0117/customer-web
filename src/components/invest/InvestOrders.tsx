import { F } from '../../lib/calc'
import { cx } from '../common/cx'
import type { OrderView } from './investHoldingData'
import { InvestStockName } from './InvestStockName'
import styles from './InvestOrders.module.css'

interface Props {
  className?: string
  orders: OrderView[] // 선택한 패키지의 주문(최근 것이 앞)
  open: boolean // 펼침 여부(주문이 들어오면 펼쳐짐)
  onOpen: (open: boolean) => void
}

// 주문 내역 — 선택한 패키지의 최근 5건. 제목 줄 오른쪽 화살표로 접고 펼침
export function InvestOrders({ className, orders, open, onOpen }: Props) {
  const list = orders.slice(0, 5)

  return (
    <section className={cx(styles.box, className)}>
      <div className={cx(styles.head, open && styles.headLine)}>
        <h2 className={styles.title}>주문 내역</h2>
        <span className={styles.note}>최근 5건</span>
        <button type="button" className={styles.toggle} aria-expanded={open} aria-label="주문 내역 접기·펼치기" onClick={() => onOpen(!open)}>
          <svg className={cx(!open && styles.chevClosed)} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {open && (
        <div className={styles.wrap}>
          <div className={styles.inner}>
            <div className={cx(styles.grid, styles.cols)}>
              <span>일시</span>
              <span>종목</span>
              <span>구분</span>
              <span className={styles.r}>수량</span>
              <span className={styles.r}>가격</span>
              <span>상태</span>
              <span />
            </div>
            {list.length === 0 && <div className={styles.empty}>주문 내역이 없어요</div>}
            {list.map((o, i) => (
              <div key={o.id} className={cx(styles.grid, styles.row, i < list.length - 1 && styles.rowLine)}>
                <span className={styles.time}>{o.time}</span>
                <span className={styles.stock}>
                  <InvestStockName code={o.code} name={o.name} size="sm" />
                </span>
                <b className={cx(styles.side, o.side === 'buy' ? styles.buy : styles.sell)}>{o.side === 'buy' ? '매수' : '매도'}</b>
                <span className={styles.r}>{`${o.qty}주`}</span>
                <span className={styles.r}>{o.status === 'reject' ? '-' : F.won(o.price)}</span>
                <span className={cx(styles.status, o.status === 'reject' && styles.reject)} title={o.reason ?? undefined}>
                  {o.status === 'done' ? '체결 완료' : '거부'}
                  {o.status === 'reject' && o.reason && <span className={styles.reason}>{o.reason}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
