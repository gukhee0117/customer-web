import styles from './MyInfoRiskyNotice.module.css'
import { cx } from '../common/cx'

interface Props {
  className?: string
  onOpenAssess: () => void // 다시 진단하기 창 열기
  onSnooze: () => void
}

// 최근 거래가 설문 성향보다 위험할 때(서버 거래 경향의 평균 매수 등급이 설문 허용 등급보다 위험할 때) 프로필 박스 아래에 나오는 안내
export function MyInfoRiskyNotice({ className, onOpenAssess, onSnooze }: Props) {
  return (
    <div role="status" className={cx(styles.box, className)}>
      <p>최근 거래가 설문으로 진단한 성향보다 위험한 쪽이에요. 성향보다 위험한 종목을 확인 후 매수했거나, 보유 종목의 위험등급이 바뀌었을 수 있어요.</p>
      <div className={styles.btns}>
        <button type="button" className={styles.primary} onClick={onOpenAssess}>
          다시 진단하기
        </button>
        <button type="button" className={styles.ghost} onClick={onSnooze}>
          30일 동안 보지 않기
        </button>
      </div>
    </div>
  )
}
