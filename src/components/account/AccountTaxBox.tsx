import '../../styles/tokens.css'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { taxValues } from './accountTaxData'
import type { SellGuideState } from './useSellGuide'
import styles from './AccountTaxBox.module.css'

interface AccountTaxBoxProps {
  className?: string
  onOpenCalc: () => void
  guide: SellGuideState // 서버 매도 가이드("남은 한도까지 팔면 감면" 한 줄만 이 값을 쓴다)
  onRetryGuide: () => void
}

// 세액 박스(data-box="tax") — 예상 감면액·RIA가 없었다면·최종 납부 예상 세액. 혜택 취소·조정비율 문구는 상태에 따라
export function AccountTaxBox({ className, onOpenCalc, guide, onRetryGuide }: AccountTaxBoxProps) {
  const t = taxValues()

  return (
    <Box
      data-box="tax"
      className={className}
      title="세액"
      head={<span className={styles.scope}>{t.bizShort} 기준</span>}
      actions={
        <button type="button" className={styles.link} onClick={onOpenCalc}>
          계산 근거 ›
        </button>
      }
    >
      <div className={styles.body}>
        {t.benX && (
          <div className={styles.cancelled}>
            <div className={styles.cancelledHead}>{t.benXMsg}</div>
            <div className={styles.cancelledDesc}>1년이 지나지 않은 원금이 인출돼 이 계좌에서 매도한 금액 전체가 일반 해외주식처럼 과세돼요.</div>
          </div>
        )}
        <div className={styles.cutLabel}>예상 감면액</div>
        <div className={styles.cut}>₩{t.cut}</div>
        {t.rangeOn && <div className={styles.range}>남은 한도까지 팔 경우 · 주가·환율 변동 반영 약 {t.range}(10번 중 8번 · 예시)</div>}
        <div className={styles.row}>
          <span className={styles.key}>RIA가 없었다면</span>
          <span className={styles.val}>₩{t.general}</span>
        </div>
        <div className={styles.row}>
          <span>최종 납부 예상 세액</span>
          <b className={styles.valBold}>₩{t.ria}</b>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>남은 한도까지 팔면 감면</span>
          <span className={styles.val}>
            {guide.status === 'loading' && '계산 중…'}
            {guide.status === 'none' && '한도 없음'}
            {guide.status === 'error' && (
              <>
                불러오지 못했어요{' '}
                <button type="button" className={styles.link} onClick={onRetryGuide}>다시 시도</button>
              </>
            )}
            {guide.status === 'live' && (guide.data.summary ? '₩' + F.won(guide.data.summary.estimatedReliefEffect) : '추천할 종목이 없어요')}
          </span>
        </div>
        {guide.status === 'live' && !guide.data.summary && guide.data.warnings.length > 0 && <div className={styles.adj}>{guide.data.warnings.join(' · ')}</div>}
        {t.adjOn && <div className={styles.adj}>{t.adjMsg}</div>}
      </div>
    </Box>
  )
}
