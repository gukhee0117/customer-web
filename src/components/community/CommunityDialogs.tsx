import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { cx } from '../common/cx'
import { REPORT_REASONS } from './communityData'
import type { useCommunityFeed } from './useCommunityFeed'
import styles from './CommunityDialogs.module.css'

type Feed = ReturnType<typeof useCommunityFeed>

// 글 삭제 확인 창 + 신고 사유 창. 뒤의 어두운 막을 눌러도 닫히지 않고, 취소·Esc로만 닫힘(원본 그대로)
export function CommunityDialogs({ feed }: { feed: Feed }) {
  const { delId, report } = feed
  return createPortal(
    <>
      {delId && (
        <div className={styles.backdrop}>
          <div className={styles.panel} role="alertdialog" aria-modal="true" aria-label="글 삭제">
            <h3 className={styles.title}>글을 삭제할까요?</h3>
            <p className={styles.desc}>삭제한 글은 되돌릴 수 없어요.</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={feed.cancelDelete}>취소</button>
              <button type="button" className={styles.ok} onClick={feed.confirmDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}
      {report && (
        <div className={styles.backdrop}>
          <div className={styles.panel} role="dialog" aria-modal="true" aria-label="신고 사유">
            <h3 className={styles.title}>신고 사유를 골라 주세요</h3>
            <div role="radiogroup" className={styles.list}>
              {REPORT_REASONS.map(([reason, label]) => (
                <button key={reason} type="button" role="radio" aria-checked={report.reason === reason} className={styles.opt} onClick={() => feed.pickReason(reason)}>
                  <span className={cx(styles.ring, report.reason === reason && styles.ringOn)} />
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={feed.cancelReport}>취소</button>
              <button type="button" className={styles.ok} disabled={!report.reason} onClick={feed.submitReport}>신고</button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}

interface PubDialogProps {
  agree: boolean
  onToggle: () => void
  onCancel: () => void
  onOk: () => void
}

// 내 투자성향 공개 창: 동의 체크 전에는 "공개하기"가 눌리지 않음. 막을 눌러도 안 닫히고 취소·Esc로만 닫힘(원본 그대로)
export function PubDialog({ agree, onToggle, onCancel, onOk }: PubDialogProps) {
  useEffect(() => {
    // 창이 열려 있으면 Esc는 이 창만 닫음(원본: 신고·성향 공개·삭제 창이 목록·검색보다 먼저) — 가운데 열의 Esc 처리보다 먼저 받아 거기로 안 넘김
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onCancel()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])
  return createPortal(
    <div className={styles.backdrop}>
      <div className={cx(styles.panel, styles.panelWide)} role="dialog" aria-modal="true" aria-label="성향 공개">
        <h3 className={styles.title}>내 투자성향을 공개할까요?</h3>
        <p className={styles.desc}>공개하면 내 글과 답글에 성향 끼루와 성향 이름이 보여요. 투자성향은 개인정보라서 공개에 동의한 경우에만 보여드려요. 언제든 끌 수 있어요.</p>
        <button type="button" role="checkbox" aria-checked={agree} className={styles.agree} onClick={onToggle}>
          <span className={cx(styles.cb, agree && styles.cbOn)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          공개에 동의해요
        </button>
        <div className={cx(styles.actions, styles.actionsTight)}>
          <button type="button" className={styles.cancel} onClick={onCancel}>취소</button>
          <button type="button" className={styles.ok} disabled={!agree} onClick={onOk}>공개하기</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
