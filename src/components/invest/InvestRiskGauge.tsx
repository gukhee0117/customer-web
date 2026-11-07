import { Link } from 'react-router-dom'
import { cx } from '../common/cx'
import styles from './InvestRiskGauge.module.css'

interface Props {
  className?: string
  allowedMin: number | null // 설문 허용 범위의 가장 위험한 쪽 등급(허용 범위는 allowedMin~6). 진단이 없거나 만료면 null
  avgBuyGrade: number | null // 거래로 본 평균 매수 위험등급. 체결 매수가 모자라면 null
  minBuyCount: number // 평균 매수 등급을 보여 주는 데 필요한 최소 체결 매수 건수
  recRange: [number, number] | null // 거래 기준 탭에서만: 실제 추천 범위(gradeFrom~gradeTo)
  adjusted: boolean // 거래 기준에서 목표 등급을 허용 범위 경계로 보정했는가(targetAdjusted)
  label: string // 투자성향 이름
  assessPath: string // 투자성향 다시 진단하기 이동 경로
}

const GRADES = [1, 2, 3, 4, 5, 6]

// 위험등급 게이지 — 1(매우 높은 위험)~6(매우 낮은 위험) 가로 막대. 허용 범위·추천 범위를 칠하고 내 평균 매수 등급을 화살표로 가리킨다.
// 허용 범위를 말로 풀어 쓰지 않는다(부제목·내 추천 기준에 이미 있다): 눈금 숫자와 범례만 둔다
export function InvestRiskGauge({ className, allowedMin, avgBuyGrade, minBuyCount, recRange, adjusted, label, assessPath }: Props) {
  const inAllowed = (g: number) => allowedMin != null && g >= allowedMin
  const inRec = (g: number) => recRange != null && g >= recRange[0] && g <= recRange[1]
  // 등급 g의 칸 가운데가 (g-0.5)/6 지점이다. 소수 등급(1.21)은 그 사이에 놓인다
  const arrowAt = avgBuyGrade == null ? null : Math.min(6.5, Math.max(0.5, avgBuyGrade))
  const avgText = avgBuyGrade == null ? '' : String(avgBuyGrade)
  const aria =
    '위험등급 1에서 6' +
    (allowedMin != null ? ', 허용 범위 ' + allowedMin + '~6등급' : '') +
    (recRange ? ', 추천 범위 ' + recRange[0] + '~' + recRange[1] + '등급' : '') +
    (avgBuyGrade != null ? ', 내 평균 매수 ' + avgText + '등급' : '')

  return (
    <section className={cx(styles.box, className)} data-box="rec-gauge">
      <div className={styles.title}>위험등급</div>
      <div className={styles.bar} role="img" aria-label={aria}>
        {arrowAt != null && <span className={styles.arrow} style={{ left: ((arrowAt - 0.5) / 6) * 100 + '%' }} />}
        <div className={styles.cells}>
          {GRADES.map((g) => (
            <span key={g} className={cx(styles.cell, inAllowed(g) && styles.allowed, inRec(g) && styles.rec)} />
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
            <i className={cx(styles.swatch, styles.swAllowed)} />
            허용 범위
          </span>
        )}
        {recRange && (
          <span className={styles.item}>
            <i className={cx(styles.swatch, styles.swRec)} />
            추천 범위
          </span>
        )}
        {avgBuyGrade != null && (
          <span className={styles.item}>
            <i className={styles.swArrow} />
            {'내 평균 매수 ' + avgText}
          </span>
        )}
      </div>
      {avgBuyGrade == null && <div className={styles.note}>{'체결 매수 ' + minBuyCount + '건 이상부터 표시돼요'}</div>}
      {allowedMin == null && <div className={styles.note}>투자성향을 진단하면 허용 범위가 칠해져요</div>}

      {adjusted && avgBuyGrade != null && allowedMin != null && (
        <div className={styles.adjust}>
          {'최근 매수 평균 위험등급(' + avgText + '등급)이 투자성향(' + label + ', ' + allowedMin + '~6등급)보다 높아요. 투자성향 범위 안의 종목만 추천해요. '}
          <Link className={styles.adjustLink} to={assessPath}>
            투자성향 다시 진단하기
          </Link>
        </div>
      )}
    </section>
  )
}
