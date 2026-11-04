import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { cx } from '../common/cx'
import styles from './InvestDialog.module.css'

// 주식 패키지 화면의 확인 창(원본 dlg) — 주문 확인·주문 거부·패키지 고르기
export interface DialogState {
  title: string
  body?: string
  rows?: [string, string][]
  okLabel?: string
  okTone?: 'navy' | 'up' | 'down' // 확인 버튼 색(주문은 매수 빨강·매도 파랑)
  onOk?: () => void
  reject?: { linkLabel: string; onLink: () => void } // 있으면 거부 창: 제목 빨강, 링크 + 닫기 버튼 한 개
  choices?: { name: string; sub: string; act: string; go: () => void }[] // 있으면 고르는 창("어느 패키지에 담을까요?"): 닫기 버튼 한 개
}

interface Props {
  dialog: DialogState
  onClose: () => void
}

export function InvestDialog({ dialog: d, onClose }: Props) {
  // 확인을 누르면 창을 닫고 그다음에 동작을 실행(원본 순서)
  const ok = () => {
    onClose()
    d.onOk?.()
  }

  return createPortal(
    <div className={styles.backdrop}>
      <div role="alertdialog" aria-modal="true" aria-label={d.title} className={styles.panel}>
        <h3 className={cx(styles.title, d.reject && styles.titleReject)}>{d.title}</h3>
        {d.body && <p className={styles.body}>{d.body}</p>}
        <div>
          {(d.rows ?? []).map(([k, v]) => (
            <div key={k} className={styles.row}>
              <span className={styles.k}>{k}</span>
              <b className={styles.v}>{v}</b>
            </div>
          ))}
        </div>
        {d.choices && (
          <div className={styles.choices}>
            {d.choices.map((c, i) => (
              <button key={c.name} type="button" className={cx(styles.choice, i > 0 && styles.choiceLine)} onClick={c.go}>
                <b className={styles.choiceName}>{c.name}</b>
                <span className={styles.choiceSub}>{c.sub}</span>
                <span className={styles.choiceAct}>{c.act}</span>
              </button>
            ))}
          </div>
        )}
        {d.reject || d.choices ? (
          <div className={styles.solo}>
            {d.reject && (
              <button type="button" className={styles.link} onClick={d.reject.onLink}>
                {d.reject.linkLabel}
              </button>
            )}
            <button type="button" className={cx(styles.btn, styles.close)} onClick={onClose}>
              닫기
            </button>
          </div>
        ) : d.onOk || d.okLabel ? (
          <div className={styles.std}>
            <button type="button" className={cx(styles.btn, styles.cancel)} onClick={onClose}>
              취소
            </button>
            <button type="button" className={cx(styles.btn, styles.ok, styles[d.okTone ?? 'navy'])} onClick={ok}>
              {d.okLabel}
            </button>
          </div>
        ) : (
          <div className={styles.solo}>
            <button type="button" className={cx(styles.btn, styles.close)} onClick={onClose}>
              확인
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
