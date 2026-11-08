import '../../styles/tokens.css'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { StockLabel } from '../common/StockLabel'
import { GEN_HOLDINGS } from './accountData'
import styles from './AccountStateBox.module.css'
import type { ProfileAccount } from '../../api/profile'
import { linkedAccountText } from './linkedAccount'
import type { GeneralAccount } from '../../api/withdrawal'
import type { ServerState } from './useServerData'

interface AccountStateBoxProps {
  className?: string
  onOpen: () => void // 계좌 개설 신청
  account: ProfileAccount | null
  linked: ServerState<GeneralAccount[]>
}

// 계좌 상태 박스(data-box="acct-state") — 계좌 없음 / 심사 중 / 반려일 때만 보임(정상 계좌에서는 화면이 그리지 않음)
export function AccountStateBox({ className, onOpen, account, linked }: AccountStateBoxProps) {
  const none = account === null
  const review = account?.status === 'APPLIED'
  const reject = account?.status === 'REJECTED'
  const closed = account?.status === 'CLOSED'
  const applied = account?.appliedAt ? F.short(account.appliedAt.slice(0, 10)) : ''

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
              <div className={styles.headline}>계좌 개설 심사 중이에요{applied && ' · 신청 ' + applied}</div>
              <div className={styles.row}><span className={styles.rowKey}>연결 일반계좌</span><b className={styles.rowVal}>{linkedAccountText(linked)}</b></div>
              <p className={styles.reason}>신청 내용 확인이 필요하면 고객센터로 문의해 주세요.</p>
            </>
          )}
          {reject && (
            <>
              <div className={cx(styles.headline, styles.rejectHead)}>계좌 개설이 반려됐어요</div>
              <div className={styles.reason}>반려 사유와 재신청은 고객센터로 문의해 주세요.</div>
            </>
          )}
          {closed && <div className={styles.headline}>해지된 계좌예요. 재개설 가능 여부는 고객센터로 문의해 주세요.</div>}
          {none && (
            <button type="button" className={styles.open} onClick={onOpen}>
              계좌 개설 신청
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
