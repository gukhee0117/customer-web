import '../../styles/tokens.css'
import type { OrderFees } from '../../api/stockPackage'
import { F } from '../../lib/calc'
import { cx } from '../common/cx'
import { bulkAll, bulkCalc, cleanInput, ratePct } from './investOrderLogic'
import type { BulkCalc } from './investOrderLogic'
import type { PkgView } from './investPkgLogic'
import { InvestSidePanel, PanelClose } from './InvestSidePanel'
import { InvestStockName } from './InvestStockName'
import styles from './InvestSidePanel.module.css'

interface Props {
  pkg: PkgView
  cash: number
  accountNo: string
  fees: OrderFees
  amt: string
  onAmt: (v: string) => void
  onClose: () => void
  onSubmit: (c: BulkCalc) => void
}

const NOTE = () => 'RIA 계좌의 국내주식 매매예요. 매도 대금은 RIA 계좌에 남고, 원금 인출 가능일은 바뀌지 않아요.'

// "패키지 한 번에 사기" 창 — 살 금액을 목표 비중대로 나눠 종목별 주 수를 계산
export function InvestBulkPanel({ pkg, cash, accountNo, fees, amt, onAmt, onClose, onSubmit }: Props) {
  const c = bulkCalc(pkg, amt, cash, fees)
  const sums: [string, string, boolean][] = [
    ['예상 금액', '₩' + F.won(c.sum), false],
    ['예상 수수료(' + ratePct(fees.commissionRatePercent) + ')', '₩' + F.won(c.fee), false],
    ['합계', '₩' + F.won(c.total), true],
    ['남는 금액', '₩' + F.won(c.left), false]
  ]

  return (
    <InvestSidePanel label="패키지 한 번에 사기" onClose={onClose}>
      <div className={styles.planHead}>
        <h2 className={styles.planTitle}>패키지 한 번에 사기</h2>
        <span className={styles.planName}>{pkg.name}</span>
        <PanelClose onClose={onClose} />
      </div>
      <div className={styles.acct}>
        Returns RIA {accountNo} · 주문 가능 ₩{F.won(cash)}
      </div>
      <div className={styles.body}>
        <div>
          <div className={cx(styles.label, styles.amtLabel)}>살 금액</div>
          <div className={styles.amtRow}>
            <label className={cx(styles.field, styles.fieldGrow, c.err && styles.fieldErr)}>
              <input className={styles.input} value={c.amt ? F.won(c.amt) : ''} onChange={(e) => onAmt(cleanInput(e.target.value))} inputMode="numeric" placeholder="0" aria-label="살 금액" />
              <span className={styles.unit}>원</span>
            </label>
            <button type="button" className={styles.allBtn} onClick={() => onAmt(bulkAll(cash, fees))}>
              주문 가능 전부
            </button>
          </div>
          <div className={styles.hint}>목표 비중대로 종목별 주 수를 계산해요. 1주 미만은 사지 않아요.</div>
        </div>
        <div>
          <div className={cx(styles.planGrid, styles.planColHead)}>
            <span>종목</span>
            <span className={styles.r}>목표 비중</span>
            <span className={styles.r}>살 주 수</span>
          </div>
          {c.rows.map((r) => (
            <div key={r.code} className={cx(styles.planGrid, styles.planRow)}>
              <span className={styles.planStock}>
                <InvestStockName code={r.code} name={r.name} size="sm" />
              </span>
              <span className={cx(styles.r, styles.planC2)}>{r.target + '%'}</span>
              <span className={cx(styles.r, styles.planC3)}>{r.priced ? r.qty + '주 · ' + F.won(r.amount) : '-'}</span>
            </div>
          ))}
        </div>
        <div>
          {sums.map(([k, v, bold]) => (
            <div key={k} className={styles.sumLine}>
              <span className={styles.k}>{k}</span>
              <span className={cx(styles.v, bold && styles.bold)}>{v}</span>
            </div>
          ))}
          {c.err && <div className={styles.planErr}>{c.err}</div>}
        </div>
        <div className={styles.note}>{NOTE()}</div>
      </div>
      <div className={styles.foot}>
        <button type="button" className={cx(styles.submit, c.ok ? styles.submitNavy : styles.submitOff)} disabled={!c.ok} onClick={() => onSubmit(c)}>
          {c.count ? c.count + '건 주문' : '주문'}
        </button>
      </div>
    </InvestSidePanel>
  )
}
