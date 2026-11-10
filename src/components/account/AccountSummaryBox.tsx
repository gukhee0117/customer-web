import '../../styles/tokens.css'
import { ACCOUNT_STATUS_LABEL, formatAccountNo } from '../../api/profile'
import type { ProfileAccount } from '../../api/profile'
import type { CustomerAssetBriefing } from '../../api/briefing'
import type { GeneralAccount } from '../../api/withdrawal'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import type { ServerState } from './useServerData'
import styles from './AccountSummaryBox.module.css'

interface AccountSummaryBoxProps {
  className?: string
  onCopy: () => void
  account: ProfileAccount | null | undefined // 서버 프로필의 계좌(프로필을 못 받았으면 undefined)
  assets: ServerState<CustomerAssetBriefing> // 서버 자산 브리핑(잔고 줄·총자산·해외 평가·전일 대비)
  linked: ServerState<GeneralAccount[]> // 서버 연결 일반계좌
  onRetry: () => void // 자산·연결 일반계좌 중 실패한 것 다시 받기
  onApply: (kind: 'in' | 'sell' | 'out') => void // 신청 창은 다음 단계에서 연결
}

const sg = (n: number) => (n > 0 ? '+' : n < 0 ? '-' : '')
const toneOf = (n: number) => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat')

// 계좌 요약 박스(data-box="summary") — 계좌번호·상태·개설일은 서버 프로필, 예수금·국내 평가·손익·총자산·해외 평가·전일 대비는 서버 자산 브리핑.
// 연결 일반계좌는 서버 연결 계좌 목록. 총자산·입고 해외주식·전일 대비는 서버 값(시세가 없으면 null → '확인 불가')
export function AccountSummaryBox({ className, onCopy, account, assets, linked, onRetry, onApply }: AccountSummaryBoxProps) {
  // 자산 값 한 줄: 받는 중·한도 없음·실패·서버 값(null이면 시세를 못 받은 것)
  const live = assets.status === 'live' ? assets.data : null
  const fallback = assets.status === 'loading' ? '…' : assets.status === 'error' ? '불러오지 못했어요' : '-'
  const money = (v: number | null | undefined) => (live ? (v == null ? '확인 불가' : '₩' + F.won(v)) : fallback)
  const profit = live?.valuationProfit
  const pnlTxt = live
    ? profit == null
      ? '확인 불가'
      : sg(profit) + '₩' + F.won(Math.abs(profit)) + (live.valuationReturnRate == null ? '' : ' (' + (live.valuationReturnRate > 0 ? '+' : '') + live.valuationReturnRate.toFixed(2) + '%)')
    : fallback

  const dayAmt = live?.domesticDayChangeAmount
  const dayTxt = live
    ? dayAmt == null
      ? '확인 불가'
      : sg(dayAmt) + '₩' + F.won(Math.abs(dayAmt)) + (live.domesticDayChangeRate == null ? '' : ' (' + (live.domesticDayChangeRate > 0 ? '+' : '') + live.domesticDayChangeRate.toFixed(2) + '%)')
    : fallback

  return (
    <Box
      data-box="summary"
      className={className}
      title="Returns RIA"
      head={
        <>
          <span className={styles.no}>{account ? formatAccountNo(account.accountNo) : '-'}</span>
          <button type="button" className={styles.copy} aria-label="계좌번호 복사" onClick={onCopy}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </button>
          <b className={styles.status}>{account ? ACCOUNT_STATUS_LABEL[account.status] : '-'}</b>
        </>
      }
    >
      <div className={styles.totalBlock}>
        <div className={styles.totalLabel}>총자산</div>
        <b className={styles.total}>{money(live?.totalAssetAmount)}</b>
      </div>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.label}>예수금</span>
          <span className={styles.value}>{money(live?.cashAmount)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>국내 주식 평가금액</span>
          <span className={styles.value}>{money(live?.domesticValuationAmount)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>입고 해외주식</span>
          <span className={styles.value}>{money(live?.foreignHeldValuationAmount)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>평가손익(국내)</span>
          <span className={cx(styles.value, styles[toneOf(profit ?? 0)])}>{pnlTxt}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>전일 대비(국내)</span>
          <span className={styles.todayValue}>
            <span className={cx(styles.value, styles[toneOf(dayAmt ?? 0)])}>{dayTxt}</span>
            {live && dayAmt != null && live.dayChangeBaseDate && <span className={styles.label}>{F.short(live.dayChangeBaseDate)} 대비</span>}
          </span>
        </div>
      </div>
      {(assets.status === 'error' || linked.status === 'error') && (
        <div className={styles.meta}>
          <button type="button" className={styles.retry} onClick={onRetry}>다시 시도</button>
        </div>
      )}
      <div className={styles.actions}>
        <button type="button" className={cx(styles.btn, styles.outline)} onClick={() => onApply('in')}>
          입고 신청
        </button>
        <button type="button" className={cx(styles.btn, styles.primary)} onClick={() => onApply('sell')}>
          매도 신청
        </button>
        <button type="button" className={cx(styles.btn, styles.outline)} onClick={() => onApply('out')}>
          인출 신청
        </button>
      </div>
    </Box>
  )
}
