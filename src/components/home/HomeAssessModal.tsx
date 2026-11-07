import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { snoozeRisky } from '../myinfo/riskySnooze'
import styles from './HomeAssessModal.module.css'

interface HomeAssessModalProps {
  kind: 'risky' | 'expired'
  profLabel: string
  onClose: () => void
}

// 투자성향 상태 알림 창: 거래 위험(최근 거래가 설문 성향보다 위험) · 진단 만료일 때 뜸
export function HomeAssessModal({ kind, profLabel, onClose }: HomeAssessModalProps) {
  const risky = kind === 'risky'

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
          {risky ? '투자성향을 다시 진단해 보시겠어요?' : '투자성향 진단 유효기간이 지났어요'}
        </h3>
        <p className={styles.body}>
          {risky
            ? '최근 거래가 설문으로 진단한 성향보다 위험한 쪽이에요. 성향보다 위험한 종목을 확인 후 매수했거나, 보유 종목의 위험등급이 바뀌었을 수 있어요. 추천은 지금처럼 설문 결과(' + profLabel + ') 기준으로 계속 드려요.'
            : '진단 결과는 24개월 동안 유효해요. 다시 진단하기 전까지는 추천과 주식 패키지 후보를 볼 수 없어요.'}
        </p>
        <div className={styles.actions}>
          <Link to="/myinfo#assess" className={styles.primary}>다시 진단하기</Link>
          <button type="button" className={styles.later} onClick={() => { if (risky) snoozeRisky(); onClose() }}>
            {risky ? '30일 동안 보지 않기' : '나중에'}
          </button>
        </div>
      </div>
    </div>
  )
}
