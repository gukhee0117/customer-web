import { cx } from '../common/cx'
import styles from './MyInfoSwitch.module.css'

interface Props {
  on: boolean
  labelId: string // 이름 글자(span)의 id — aria-labelledby로 이어짐
  onToggle: () => void
  disabled?: boolean
}

// 36×20 켜고 끄는 스위치(알림 설정·수신 동의·성향 공개가 같이 씀)
export function MyInfoSwitch({ on, labelId, onToggle, disabled = false }: Props) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-labelledby={labelId} className={cx(styles.switch, on && styles.on)} onClick={onToggle} disabled={disabled}>
      <span className={styles.knob} />
    </button>
  )
}
