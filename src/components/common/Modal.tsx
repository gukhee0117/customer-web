import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { cx } from './cx'
import styles from './Modal.module.css'

// form    : 머리줄(56px, 닫기 버튼) + 본문 + 아래 버튼줄 — 비밀번호 변경 같은 입력 창
// confirm : 제목 + 버튼 두 개 — "로그아웃할까요?" 같은 확인 창
// alert   : 제목 + 안내 문구 + 버튼 두 개 — 세션 만료 경고 같은 알림 창
export type ModalVariant = 'form' | 'confirm' | 'alert'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  variant?: ModalVariant
  children?: ReactNode
  cancelLabel?: string
  okLabel?: string
  onCancel?: () => void
  onOk?: () => void
  okDisabled?: boolean
}

export function Modal({ open, onClose, title, variant = 'form', children, cancelLabel = '취소', okLabel = '확인', onCancel, onOk, okDisabled = false }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const actions = (
    <div className={cx(styles.actions, variant === 'form' && styles.actionsForm)}>
      <button type="button" className={cx(styles.cancel, variant === 'alert' && styles.cancelHover)} onClick={onCancel ?? onClose}>
        {cancelLabel}
      </button>
      <button type="button" className={cx(styles.ok, variant === 'form' && styles.okWide, variant === 'alert' && styles.okHover)} disabled={okDisabled} onClick={onOk}>
        {okLabel}
      </button>
    </div>
  )

  return createPortal(
    <div className={cx(styles.backdrop, styles[variant + 'Backdrop'])}>
      {variant === 'form' ? (
        <div className={cx(styles.panel, styles.formPanel)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className={styles.formHead}>
            <h2 id={titleId} className={styles.formTitle}>{title}</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div className={styles.formBody}>{children}</div>
          <div className={styles.formFoot}>{actions}</div>
        </div>
      ) : (
        <div className={cx(styles.panel, styles.compactPanel, styles[variant + 'Panel'])} role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
          {variant === 'alert' ? (
            <h2 id={titleId} className={styles.alertTitle}>{title}</h2>
          ) : (
            <h3 id={titleId} className={styles.confirmTitle}>{title}</h3>
          )}
          {children}
          {actions}
        </div>
      )}
    </div>,
    document.body
  )
}
