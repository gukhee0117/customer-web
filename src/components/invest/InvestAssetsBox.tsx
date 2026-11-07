import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { sign, toneOf, totalsOf } from './investPkgLogic'
import type { PkgView } from './investPkgLogic'
import styles from './InvestAssetsBox.module.css'

const signedWon = (n: number) => sign(n) + '₩' + F.won(Math.abs(n))

// 패키지 자산 박스 — 전체 패키지 합계. 합계는 서버 패키지 보유 기준
export function InvestAssetsBox({ className, views, cash, accountNo }: { className?: string; views: PkgView[]; cash: number; accountNo: string }) {
  const t = totalsOf(views)
  const partial = t.unpriced > 0 // 현재가를 못 받은 종목이 있으면 손익·수익률은 확인 불가로 보인다
  const tone = (n: number) => styles[toneOf(n)]

  return (
    <Box
      className={className}
      title="패키지 자산"
      head={
        <>
          <span className={styles.asOf}>{F.short(RD.C.BUSINESS_DATE)} 기준</span>
          <span className={styles.acct}>Returns RIA {accountNo}</span>
        </>
      }
    >
      <div className={styles.total}>
        <div className={styles.label}>총 평가금액{partial && ' (현재가 없는 종목 ' + t.unpriced + '개 제외)'}</div>
        <div className={styles.totalRow}>
          <b className={styles.val}>₩{F.won(t.val)}</b>
          {partial ? <b className={styles.ret}>-</b> : <b className={cx(styles.ret, tone(t.pnl))}>{F.pct(t.ret)}</b>}
        </div>
      </div>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.k}>평가손익</span>
          {partial ? <span>-</span> : <span className={tone(t.pnl)}>{signedWon(t.pnl)}</span>}
        </div>
        <div className={styles.row}>
          <span className={styles.k}>오늘 손익</span>
          <span className={tone(t.today)}>
            {signedWon(t.today)} ({F.pct(t.todayPct)})
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.k}>투자원금</span>
          <span>₩{F.won(t.cost)}</span>
        </div>
      </div>
      <div className={styles.cash}>
        <span className={styles.cashLabel}>주문 가능 금액</span>
        <span className={styles.cashRight}>
          {/* TODO: 백엔드 연결 시 주문 가능 금액 API 값으로 교체 */}
          <b className={styles.cashVal}>₩{F.won(cash)}</b>
          <Link to="/account" className={styles.acctLink}>
            내 계좌 ›
          </Link>
        </span>
      </div>
    </Box>
  )
}
