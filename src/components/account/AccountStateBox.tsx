import '../../styles/tokens.css'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { StockLabel } from '../common/StockLabel'
import { GEN_HOLDINGS } from './accountData'
import styles from './AccountStateBox.module.css'

interface AccountStateBoxProps {
  className?: string
  onOpen: () => void // 계좌 개설 신청
  onCancel: () => void // 신청 취소
}

// 계좌 상태 박스(data-box="acct-state") — 계좌 없음 / 심사 중 / 반려일 때만 보임(정상 계좌에서는 화면이 그리지 않음)
export function AccountStateBox({ className, onOpen, onCancel }: AccountStateBoxProps) {
  const state = RD.ACCOUNT_STATE
  const none = state === 'none'
  const review = state === 'reviewing'
  const reject = state === 'rejected'
  const states = RD.ACCOUNT_STATES
  const applied = states.reviewing.appliedAt ? F.short(states.reviewing.appliedAt) : ''
  const limitRows: [string, string][] = [
    ['이번 계좌 한도', '₩' + F.won(RD.ACCOUNT.sellLimit)],
    ['연결 일반계좌', RD.LINKED.name + ' ' + RD.LINKED.no]
  ]

  return (
    <Box
      data-box="acct-state"
      className={className}
      title={review ? '계좌 개설 심사' : 'RIA 계좌 개설'}
      actions={<span className={styles.asOf}>{F.short(RD.C.BUSINESS_DATE)} 기준</span>}
    >
      <div className={styles.body}>
        <div className={styles.left}>
          {none && <div className={styles.none}>해외주식을 팔고 돌아올 자금을 담는 계좌예요. 신청은 3분이면 끝나요.</div>}
          {review && (
            <>
              <div className={styles.headline}>계좌 개설 심사 중이에요 · 신청 {applied} · 보통 1~2영업일</div>
              <div className={styles.rowsWrap}>
                {limitRows.map(([k, v]) => (
                  <div key={k} className={styles.row}>
                    <span className={styles.rowKey}>{k}</span>
                    <b className={styles.rowVal}>{v}</b>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.cancel} onClick={onCancel}>
                신청 취소
              </button>
            </>
          )}
          {reject && (
            <>
              <div className={cx(styles.headline, styles.rejectHead)}>계좌 개설이 반려됐어요</div>
              <div className={styles.reason}>{states.rejected.reason}</div>
            </>
          )}
          {!review && (
            <button type="button" className={styles.open} onClick={onOpen}>
              {reject ? '한도 줄여서 다시 신청' : '계좌 개설 신청'}
            </button>
          )}
        </div>
        <div className={styles.right}>
          <div className={styles.holdHead}>
            <span>{F.dot(RD.FIXED.DEPOSIT_BASE)} 기준 보유</span>
            <span>{GEN_HOLDINGS.length}</span>
            <span>종목</span>
            <span className={styles.example}>예시</span>
          </div>
          {GEN_HOLDINGS.map(([ticker, , base]) => (
            <div key={ticker} className={styles.holdRow}>
              <span className={styles.holdLabel}>
                <StockLabel sym={ticker} size="sm" />
              </span>
              <span className={styles.holdQty}>{base}주</span>
            </div>
          ))}
        </div>
      </div>
    </Box>
  )
}
