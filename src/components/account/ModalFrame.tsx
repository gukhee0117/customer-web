import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { cx } from '../common/cx'
import styles from './ModalFrame.module.css'

interface ModalFrameProps {
  title: string
  sub?: string // 제목 옆 작은 안내(세액 계산 근거 창)
  onClose: () => void // 닫기 버튼 · Esc
  escape?: boolean // false면 Esc로 닫지 않음(위에 확인 창이 떠 있을 때)
  steps?: ReactNode // 머리줄 아래 단계 표시줄
  bodyClassName?: string
  footClassName?: string
  footer: ReactNode
  children: ReactNode
}

// 내 계좌의 큰 창(폭 560) 틀 — 어두운 막, 머리줄(56px, 제목·닫기), 본문(넘치면 스크롤), 바닥줄.
// 세액 계산 근거 창과 입고·인출·계좌 개설 신청 창이 함께 씀. 공통 Modal은 폭·바닥 줄이 달라서 따로 둠
export function ModalFrame({ title, sub, onClose, escape = true, steps, bodyClassName, footClassName, footer, children }: ModalFrameProps) {
  const titleId = useId()

  useEffect(() => {
    if (!escape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [escape, onClose])

  return createPortal(
    <div className={styles.backdrop}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          {sub && <span className={styles.sub}>{sub}</span>}
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        {steps}
        <div className={cx(styles.body, bodyClassName)}>{children}</div>
        <div className={cx(styles.foot, footClassName)}>{footer}</div>
      </div>
    </div>,
    document.body
  )
}
