import type { MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import styles from './InvestSidePanel.module.css'

interface Props {
  label: string // 창 이름(읽어 주는 제목)
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

// 오른쪽에서 열리는 창의 바깥틀 — 주문·패키지 한 번에 사기·종목 추가가 함께 씀. 어두운 막을 누르면 닫힘
export function InvestSidePanel({ label, onClose, children, wide = false }: Props) {
  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }
  return createPortal(
    <div className={styles.backdrop} onClick={onBackdrop}>
      <aside role="dialog" aria-modal="true" aria-label={label} className={wide ? `${styles.panel} ${styles.wide}` : styles.panel}>
        {children}
      </aside>
    </div>,
    document.body
  )
}

// 머리줄 오른쪽 끝 닫기 버튼
export function PanelClose({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  )
}
