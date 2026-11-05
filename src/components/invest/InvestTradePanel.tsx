import '../../styles/tokens.css'
import type { OrderFees } from '../../api/stockPackage'
import { F } from '../../lib/calc'
import { cx } from '../common/cx'
import { cleanInput, QUICK, quickInput, ratePct, tradeCalc } from './investOrderLogic'
import type { TradeCalc, TradeState } from './investOrderLogic'
import type { PkgView } from './investPkgLogic'
import { toneOf } from './investPkgLogic'
import { InvestSidePanel } from './InvestSidePanel'
import { InvestStockName } from './InvestStockName'
import styles from './InvestSidePanel.module.css'

interface Props {
  trade: TradeState
  pkg: PkgView
  cash: number
  fees: OrderFees
  onChange: (patch: Partial<TradeState>) => void
  onClose: () => void
  onSubmit: (calc: TradeCalc) => void
}

const NOTE = () => 'RIA 계좌의 국내주식 매매예요. 매도 대금은 RIA 계좌에 남고, 원금 인출 가능일은 바뀌지 않아요.'

// 오른쪽에서 열리는 매수·매도 주문 창. 값은 모두 tradeCalc(원본 계산 그대로)에서 온다
export function InvestTradePanel({ trade, pkg, cash, fees, onChange, onClose, onSubmit }: Props) {
  const c = tradeCalc(trade, pkg, cash, fees)
  const item = pkg.items.find((i) => i.code === trade.code)
  const buy = c.buy
  const qtyMode = trade.qtyMode === 'qty'
  const grade = item?.grade ?? null
  const label = qtyMode ? '수량' : '금액'
  const acct = 'RIA 계좌 · ' + (buy ? '주문 가능 ₩' + F.won(cash) : '매도 가능 ' + c.sellable + '주')

  return (
    <InvestSidePanel label="주문" onClose={onClose}>
        <div className={styles.head}>
          <span className={styles.who}>
            <InvestStockName code={trade.code} name={item?.name} size="md" />
            <span className={cx(styles.risk, item?.out === true && styles.warn)}>{grade == null ? '' : '위험 ' + grade + '등급 · ' + F.gradeName(grade)}</span>
          </span>
          <span className={styles.price}>
            <b className={styles.px}>{c.price ? F.won(c.price) : '-'}</b>
            <span className={cx(styles.chg, styles[toneOf(c.chg)])}>{F.pct(c.chg)}</span>
          </span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className={styles.acct}>{acct}</div>
        <div className={styles.sides}>
          <button type="button" className={cx(styles.side, buy ? styles.buyOn : styles.sideOff)} onClick={() => onChange({ side: 'buy', input: '' })}>
            매수
          </button>
          <button type="button" className={cx(styles.side, !buy ? styles.sellOn : styles.sideOff)} onClick={() => onChange({ side: 'sell', input: '' })}>
            매도
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.market}>시장가로 바로 체결돼요</div>
          <div>
            <div className={styles.labelRow}>
              <span className={styles.label}>{label}</span>
              <span className={styles.modes}>
                <button type="button" className={cx(styles.mode, qtyMode && styles.modeOn)} onClick={() => onChange({ qtyMode: 'qty', input: c.qty ? String(c.qty) : '' })}>
                  수량
                </button>
                <button type="button" className={cx(styles.mode, styles.modeAmt, !qtyMode && styles.modeOn)} onClick={() => onChange({ qtyMode: 'amt', input: c.qty ? String(c.qty * c.price) : '' })}>
                  금액
                </button>
              </span>
            </div>
            <label className={cx(styles.field, c.err && styles.fieldErr)}>
              <input className={styles.input} value={c.typed ? F.won(c.typed) : ''} onChange={(e) => onChange({ input: cleanInput(e.target.value) })} inputMode="numeric" placeholder="0" aria-label={label} />
              <span className={styles.unit}>{qtyMode ? '주' : '원'}</span>
            </label>
            <div className={styles.quick}>
              {QUICK.map(([p, text]) => (
                <button key={p} type="button" className={styles.quickBtn} onClick={() => onChange({ input: quickInput(trade, c, p) })}>
                  {text}
                </button>
              ))}
            </div>
            <div className={styles.hint}>{(qtyMode ? '' : '= ' + c.qty + '주 · ') + (buy ? '최대 ' + c.maxBuy + '주' : '매도 가능 ' + c.sellable + '주')}</div>
            {c.err && <div className={styles.err}>{c.err}</div>}
          </div>

          <div>
            <div className={styles.line}>
              <span className={styles.k}>예상 금액</span>
              <span className={styles.v}>₩{F.won(c.amount)}</span>
            </div>
            <div className={cx(styles.line, styles.lineGap)}>
              <span className={styles.k}>예상 수수료</span>
              <span className={styles.rate}>{ratePct(fees.commissionRatePercent)}</span>
              <span className={styles.v}>₩{F.won(c.fee)}</span>
            </div>
            {!buy && (
              <div className={styles.line}>
                <span className={styles.k}>증권거래세</span>
                <span className={cx(styles.rate, styles.rateTax)}>{item?.taxable ? ratePct(fees.securitiesTaxRatePercent) : '해당 없음'}</span>
                <span className={styles.v}>₩{F.won(c.tax)}</span>
              </div>
            )}
            <div className={styles.line}>
              <span>합계</span>
              <b className={styles.total}>₩{F.won(c.total)}</b>
            </div>
            <div className={cx(styles.line, styles.lineEnd)}>
              <span className={styles.k}>주문 후 예수금</span>
              <span className={styles.v}>₩{F.won(c.cashAfter)}</span>
            </div>
          </div>

          <div>
            <div className={styles.wLine}>
              주문 후 이 종목 비중 <b className={styles.wB}>{c.weightBefore.toFixed(1) + '%'}</b> → <b className={cx(styles.wB, styles.wA)}>{c.weightAfter.toFixed(1) + '%'}</b> <span className={styles.target}>목표 {c.target}%</span>
            </div>
            <div className={styles.bars}>
              <div className={styles.bar}>
                <div className={cx(styles.fill, styles.fillBefore)} style={{ width: c.weightBefore.toFixed(1) + '%' }} />
              </div>
              <div className={styles.bar}>
                <div className={cx(styles.fill, styles.fillAfter)} style={{ width: c.weightAfter.toFixed(1) + '%' }} />
              </div>
            </div>
          </div>

          <div className={styles.note}>
            {NOTE()}
            {!buy && <span className={styles.noteSell}>매도 대금을 1년 안에 인출하면 세제 혜택이 취소될 수 있어요.</span>}
          </div>
        </div>

        <div className={styles.foot}>
          <button type="button" className={cx(styles.submit, c.ok ? (buy ? styles.submitBuy : styles.submitSell) : styles.submitOff)} disabled={!c.ok} onClick={() => onSubmit(c)}>
            {buy ? '매수 주문' : '매도 주문'}
          </button>
        </div>
    </InvestSidePanel>
  )
}
