import { cx } from '../common/cx'
import styles from './InvestRiskGauge.module.css'

interface Props {
  className?: string
  allowedMin: number | null // 설문 허용 범위의 가장 위험한 쪽 등급(허용 범위는 allowedMin~6). 진단이 없거나 만료면 null
}

const GRADES = [1, 2, 3, 4, 5, 6]

// 위험등급 게이지 — 1(매우 높은 위험)~6(매우 낮은 위험) 가로 막대. 설문 허용 범위를 칠한다.
// 허용 범위를 말로 풀어 쓰지 않는다(부제목·내 추천 기준에 이미 있다): 눈금 숫자와 범례만 둔다
export function InvestRiskGauge({ className, allowedMin }: Props) {
  const inAllowed = (g: number) => allowedMin != null && g >= allowedMin
  const aria = '위험등급 1에서 6' + (allowedMin != null ? ', 허용 범위 ' + allowedMin + '~6등급' : '')

  return (
    <section className={cx(styles.box, className)} data-box="rec-gauge">
      <div className={styles.title}>위험등급</div>
      <div className={styles.bar} role="img" aria-label={aria}>
        <div className={styles.cells}>
          {GRADES.map((g) => (
            <span key={g} className={cx(styles.cell, styles['grade' + g], inAllowed(g) && styles.allowed)} />
          ))}
        </div>
        <div className={styles.ticks} aria-hidden="true">
          {GRADES.map((g) => (
            <span key={g}>{g}</span>
          ))}
        </div>
        <div className={styles.ends} aria-hidden="true">
          <span>높은 위험</span>
          <span>낮은 위험</span>
        </div>
      </div>

      <div className={styles.legend}>
        {allowedMin != null && (
          <span className={styles.item}>
            <i className={styles.swAllowed} aria-hidden="true">
              {GRADES.filter(inAllowed).map((g) => <span key={g} className={cx(styles.cell, styles['grade' + g], styles.allowed)} />)}
            </i>
            허용 범위
          </span>
        )}
      </div>
      {allowedMin == null && <div className={styles.note}>투자성향을 진단하면 허용 범위가 칠해져요</div>}
    </section>
  )
}
