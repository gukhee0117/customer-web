import '../../styles/tokens.css'
import { cx } from '../common/cx'
import { ModalFrame } from './ModalFrame'
import { getCustomerTaxBasis } from '../../api/briefing'
import { F } from '../../lib/calc'
import { basisRows } from './accountTaxData'
import { NO_DATA_CODES, useServerData } from './useServerData'
import styles from './TaxCalcModal.module.css'

interface TaxCalcModalProps {
  open: boolean
  onClose: () => void
}

// 세액 계산 근거 창 — 창이 열릴 때만 마운트돼 서버 계산을 한 번 받는다(자동 갱신 없음)
export function TaxCalcModal({ open, onClose }: TaxCalcModalProps) {
  return open ? <TaxCalcBody onClose={onClose} /> : null
}

function TaxCalcBody({ onClose }: { onClose: () => void }) {
  const { state, retry } = useServerData(getCustomerTaxBasis, NO_DATA_CODES)
  const basis = state.status === 'live' ? basisRows(state.data) : null

  return (
    <ModalFrame
      title="세액 계산 근거"
      sub={(state.status === 'live' ? F.short(state.data.calculatedAt.slice(0, 10)) + ' 기준 · ' : '') + '2027년 5월 신고 때 확정'}
      onClose={onClose}
      bodyClassName={styles.body}
      footClassName={styles.foot}
      footer={
        <>
          <button type="button" className={styles.ok} onClick={onClose}>닫기</button>
        </>
      }
    >
      {!basis ? (
        <div className={styles.note}>
          {state.status === 'loading' ? '계산 근거를 불러오는 중…' : state.status === 'none' ? '아직 계산할 매도 내역이 없어요' : '계산 근거를 불러오지 못했어요'}
          {state.status === 'error' && (
            <>
              {' '}
              <button type="button" className={styles.ok} onClick={retry}>다시 시도</button>
            </>
          )}
        </div>
      ) : (
        <>
          {basis.notice && <div className={styles.note}>{basis.notice}</div>}
          <div className={styles.thead}>
            <span>단계</span>
            <span>계산식</span>
            <span className={styles.right}>값</span>
          </div>
          {basis.rows.map((r) => (
            <div key={r.n} className={cx(styles.row, r.last && styles.rowLast)}>
              <span className={styles.name}>{r.n}. {r.name}</span>
              <span className={styles.formula}>{r.formula}</span>
              <b className={cx(styles.value, r.last && styles.valueLast)}>{r.value}</b>
            </div>
          ))}
          <div className={styles.note}>세액 박스는 저장해 둔 계산값이라 여기와 숫자가 다를 수 있어요.</div>
        </>
      )}
    </ModalFrame>
  )
}
