import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { cx } from '../common/cx'
import styles from './InvestUnsuitDialog.module.css'

// 내 투자성향보다 위험한 종목을 매수·담기 전에 한 번 확인받는 창(원본 uf)
export interface UnsuitState {
  codes: string[] // 확인이 필요한 종목(성향 밖이고 아직 확인하지 않은 것)
  agree: boolean
  then: () => void // "계속" 뒤에 이어갈 동작
  // 서버 값으로 열 때: 종목 이름·등급과 내 투자성향 글자(없으면 화면 예시 값을 씀)
  items?: { code: string; name: string; grade: number | null }[]
  mine?: string
}

interface Props {
  state: UnsuitState
  onToggle: () => void
  onCancel: () => void
  onOk: () => void
}

export function InvestUnsuitDialog({ state: u, onToggle, onCancel, onOk }: Props) {
  const prof = RD.CUSTOMER.profile
  const mine = u.mine ?? (RD.PROFILES[prof]?.label ?? '') + ' · ' + F.allowedLabel(prof)

  return createPortal(
    <div className={styles.backdrop}>
      <div role="alertdialog" aria-modal="true" aria-label="부적합 확인" className={styles.panel}>
        <h3 className={styles.title}>내 투자성향보다 위험한 상품이에요</h3>
        <div className={styles.table}>
          <div className={cx(styles.row, styles.rowMine)}>
            <span className={styles.k}>내 투자성향</span>
            <b className={styles.v}>{mine}</b>
          </div>
          {u.codes.map((c) => {
            const given = u.items?.find((i) => i.code === c)
            const g = given ? given.grade : F.meta(c).grade
            const name = given ? given.name : RD.SN[c] || c
            return (
              <div key={c} className={cx(styles.row, styles.rowItem)}>
                <span className={styles.k}>이 상품</span>
                <b className={cx(styles.v, styles.warn)}>{name + ' · ' + g + '등급 ' + F.gradeName(g as number)}</b>
              </div>
            )
          })}
        </div>
        <p className={styles.text}>리턴증권은 이 상품을 권유하지 않아요. 고객님 판단으로 진행하는 경우에만 담거나 살 수 있어요.</p>
        <button type="button" className={styles.agree} aria-pressed={u.agree} onClick={onToggle}>
          <span className={cx(styles.box, u.agree && styles.boxOn)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          권유 없이 제 판단으로 진행한다는 것을 확인했어요
        </button>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            취소
          </button>
          <button type="button" className={cx(styles.ok, u.agree && styles.okOn)} disabled={!u.agree} onClick={onOk}>
            계속
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
