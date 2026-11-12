import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import styles from './HomeAssessModal.module.css'

interface HomeAssessModalProps {
  onClose: () => void
}

// 투자성향 상태 알림 창: 진단 유효기간이 지났을 때 뜸
export function HomeAssessModal({ onClose }: HomeAssessModalProps) {
  // Esc는 이 창을 먼저 닫고, 아래 박스의 Esc 처리로는 넘기지 않음
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="aModalT">
        <h3 id="aModalT" className={styles.title}>
          투자성향 진단 유효기간이 지났어요
        </h3>
        <p className={styles.body}>진단 결과는 24개월 동안 유효해요. 다시 진단하면 성향에 맞는 주식 패키지 후보 등 다양한 서비스를 계속 이용할 수 있어요.</p>
        <div className={styles.actions}>
          <Link to="/myinfo#assess" className={styles.primary}>다시 진단하기</Link>
          <button type="button" className={styles.later} onClick={onClose}>
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}
