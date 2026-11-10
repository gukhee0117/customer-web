import { Link } from 'react-router-dom'
import { ACCOUNT_STATUS_LABEL, formatAccountNo } from '../../api/profile'
import type { ProfileAccount } from '../../api/profile'
import { getGeneralAccounts } from '../../api/withdrawal'
import { F } from '../../lib/calc'
import { linkedAccountText } from '../account/linkedAccount'
import { useServerData } from '../account/useServerData'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import rows from './MyInfoRows.module.css'
import styles from './MyInfoAccountBox.module.css'

interface Props {
  className?: string
  onToast: (msg: string) => void
  account: ProfileAccount | null | undefined // 서버 값(계좌 없으면 null, 프로필을 못 받았으면 undefined)
  loaded: boolean
}

// 계좌 — 서버 프로필의 account 값. 계좌 없음이면 개설 안내만. 연결 일반계좌는 서버 연결 계좌 목록
export function MyInfoAccountBox({ className, onToast, account, loaded }: Props) {
  const { state: linked, retry } = useServerData(getGeneralAccounts)
  const copy = () => {
    try {
      navigator.clipboard.writeText(account?.accountNo ?? '')
    } catch {
      // 클립보드를 못 쓰는 환경에서도 안내는 보여 준다(원본과 동일)
    }
    onToast('계좌번호를 복사했어요')
  }

  return (
    <Box data-box="account" className={className} title="계좌">
      {!loaded ? (
        <div className={styles.none}>-</div>
      ) : account ? (
        <div className={rows.grid}>
          <span className={rows.label}>RIA 계좌</span>
          <span className={cx(rows.value, rows.nowrap)}>
            {`Returns RIA ${formatAccountNo(account.accountNo)}`}
          </span>
          <span className={cx(rows.label, styles.copyCell)}>
            <button type="button" className={styles.copy} onClick={copy}>
              복사
            </button>
          </span>
          <span className={rows.label}>상태</span>
          <span className={cx(rows.value, rows.span2)}>{ACCOUNT_STATUS_LABEL[account.status]}</span>
          <span className={rows.label}>개설일</span>
          <span className={cx(rows.value, rows.span2)}>{account.openedAt ? F.dot(account.openedAt.slice(0, 10)) : '-'}</span>
          <span className={cx(rows.label, rows.last)}>연결 일반계좌</span>
          <span className={styles.linked}>
            <span className={rows.nowrap}>{linkedAccountText(linked)}</span>
            {linked.status === 'error' && (
              <button type="button" className={styles.copy} onClick={retry}>
                다시 시도
              </button>
            )}
          </span>
        </div>
      ) : (
        <div className={styles.none}>
          RIA 계좌가 없어요 · <Link to="/account#open">계좌 개설하기 ›</Link>
        </div>
      )}
    </Box>
  )
}
