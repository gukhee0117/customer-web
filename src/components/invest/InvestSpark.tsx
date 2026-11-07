import { cx } from '../common/cx'
import { changePercent, pctLabel, roundedPct, sparkPoints } from './investSparkLogic'
import { toneOf } from './investPkgLogic'
import styles from './InvestSpark.module.css'

interface Props {
  values: number[] // 최근 종가(오래된 날 → 최근 날). 표에서는 뒤쪽 20개
}

// 표의 20일 미니 차트: 종가 선 하나. 처음 대비 마지막이 오르면 빨강, 내리면 파랑(전일 대비 등락률과 같은 색 규칙).
// 마우스를 올리면 "20일 +4.2%"처럼 기준 기간과 변동률을 보여 준다(처음 → 마지막 종가, 전일 대비가 아님)
export function InvestSpark({ values }: Props) {
  const p = changePercent(values)
  if (p == null) return <span className={styles.none}>–</span>
  const tip = values.length + '일 ' + pctLabel(p)
  return (
    <span className={styles.wrap} role="img" aria-label={tip}>
      <svg className={cx(styles.svg, styles[toneOf(roundedPct(p))])} viewBox="0 0 72 24" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={sparkPoints(values, 72, 24, 0.12)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className={styles.tip} aria-hidden="true">
        {tip}
      </span>
    </span>
  )
}
