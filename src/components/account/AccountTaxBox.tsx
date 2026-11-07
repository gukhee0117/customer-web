import '../../styles/tokens.css'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import type { CustomerTaxBriefing } from '../../api/briefing'
import type { SellGuideState } from './useSellGuide'
import type { ServerState } from './useServerData'
import styles from './AccountTaxBox.module.css'

interface AccountTaxBoxProps {
  className?: string
  onOpenCalc: () => void
  benefitCanceled: boolean // 서버 혜택 상태가 취소(IMPOSSIBLE)인가
  tax: ServerState<CustomerTaxBriefing> // 서버 세액 브리핑(집계 기준)
  onRetryTax: () => void
  guide: SellGuideState // 서버 매도 가이드("남은 한도까지 팔면 감면" 한 줄만 이 값을 쓴다)
  onRetryGuide: () => void
}

// 세액 박스(data-box="tax") — 예상 감면액·RIA가 없었다면·최종 납부 예상 세액은 서버 세액 브리핑(집계 기준). 혜택 취소 안내와 숫자는 서버 혜택 상태(자금 흐름 relief API의 benefit)를 따르고, 예상 범위·조정비율 문구는 서버 값이 없어 뺐다
// 값이 없으면(받는 중·집계 전·실패) '-'
const won = (v: number | null) => (v == null ? '-' : '₩' + F.won(v))

export function AccountTaxBox({ className, onOpenCalc, benefitCanceled, tax, onRetryTax, guide, onRetryGuide }: AccountTaxBoxProps) {
  return (
    <Box
      data-box="tax"
      className={className}
      title="세액"
      head={<span className={styles.scope}>{tax.status === 'live' ? '집계 ' + tax.data.calculatedAt.slice(5, 16).replace('T', ' ').replace('-', '.') : ''}</span>}
      actions={
        <button type="button" className={styles.link} onClick={onOpenCalc}>
          계산 근거 ›
        </button>
      }
    >
      <div className={styles.body}>
        {benefitCanceled && (
          <div className={styles.cancelled}>
            <div className={styles.cancelledHead}>조기인출로 이 계좌의 세제 혜택이 취소됐어요</div>
            <div className={styles.cancelledDesc}>1년이 지나지 않은 원금이 인출돼 이 계좌에서 매도한 금액 전체가 일반 해외주식처럼 과세돼요.</div>
          </div>
        )}
        <div className={styles.cutLabel}>예상 감면액</div>
        <div className={styles.cut}>{won(tax.status === 'live' ? (benefitCanceled ? 0 : tax.data.current.reliefAmount) : null)}</div>
        {tax.status === 'none' && <div className={styles.adj}>아직 집계된 자료가 없어요. 집계가 끝나면 보여드려요.</div>}
        {tax.status === 'error' && (
          <div className={styles.adj}>
            세액을 불러오지 못했어요 <button type="button" className={styles.link} onClick={onRetryTax}>다시 시도</button>
          </div>
        )}
        <div className={styles.row}>
          <span className={styles.key}>RIA가 없었다면</span>
          <span className={styles.val}>{won(tax.status === 'live' ? tax.data.current.generalTax : null)}</span>
        </div>
        <div className={styles.row}>
          <span>최종 납부 예상 세액</span>
          <b className={styles.valBold}>{won(tax.status === 'live' ? (benefitCanceled ? tax.data.current.generalTax : tax.data.current.riaTax) : null)}</b>
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
            {guide.status === 'live' && (benefitCanceled ? '₩0' : guide.data.summary ? '₩' + F.won(guide.data.summary.estimatedReliefEffect) : '추천할 종목이 없어요')}
          </span>
        </div>
        {guide.status === 'live' && !guide.data.summary && guide.data.warnings.length > 0 && <div className={styles.adj}>{guide.data.warnings.join(' · ')}</div>}
      </div>
    </Box>
  )
}
