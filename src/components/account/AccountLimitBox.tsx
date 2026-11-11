import '../../styles/tokens.css'
import { Box } from '../common/Box'
import { F } from '../../lib/calc'
import { limitValues } from './accountTaxData'
import type { SellLimitState } from './useSellLimit'
import styles from './AccountLimitBox.module.css'

interface AccountLimitBoxProps {
  className?: string
  onApply: () => void // 매도 신청 창은 다음 단계에서 연결
  limit: SellLimitState // 서버 매도 한도(이 박스만 로딩·실패 처리)
  onRetryLimit: () => void
}

// 매도 한도 박스(data-box="limit") — 사용 한도·한도(서버 값)·지금 공제율 구간·구간 마감
export function AccountLimitBox({ className, onApply, limit, onRetryLimit }: AccountLimitBoxProps) {
  const v = limitValues()

  return (
    <Box
      data-box="limit"
      className={className}
      title="매도 한도"
      actions={
        <button type="button" className={styles.link} onClick={onApply}>
          매도 신청 ›
        </button>
      }
    >
      <div className={styles.body}>
        {limit.status === 'live' && (
          <>
            <div className={styles.remainRow}>
              <span className={styles.remainLabel}>사용 한도</span>
              <b className={styles.remain}>{F.man(limit.data.usedAmount)} 원</b>
              <span className={styles.of}>/ {F.man(limit.data.limitAmount)}</span>
            </div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: (limit.data.limitAmount > 0 ? (limit.data.usedAmount / limit.data.limitAmount) * 100 : 0) + '%' }} />
            </div>
          </>
        )}
        {limit.status === 'loading' && <div className={styles.used}>사용 한도를 불러오고 있어요</div>}
        {limit.status === 'none' && <div className={styles.used}>한도 없음 · 계좌가 개설되면 확인할 수 있어요</div>}
        {limit.status === 'error' && (
          <div className={styles.used}>
            사용 한도를 불러오지 못했어요{' '}
            <button type="button" className={styles.guideLink} onClick={onRetryLimit}>다시 시도 ›</button>
          </div>
        )}
        <div className={styles.row}>
          <span className={styles.key}>지금 공제율 구간</span>
          <span className={styles.val}>{v.bandLabel}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>구간 마감</span>
          <span className={styles.val}>
            {v.bandEnd} (<span className={styles.dday}>D-{v.bandD}</span>)
          </span>
        </div>
        <div className={styles.guide}>
          <button type="button" className={styles.guideLink} onClick={onApply}>
            매도 신청에서 보기 ›
          </button>
        </div>
      </div>
    </Box>
  )
}
