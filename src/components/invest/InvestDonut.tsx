import styles from './InvestDonut.module.css'

interface DonutPart {
  key: string // 조각을 가리키는 값(마우스를 올린 조각 강조에 쓴다)
  shade: string // 조각 색
  frac: number // 전체에서 차지하는 비율(0~1, 모두 더하면 1)
}

interface Props {
  parts: DonutPart[]
  hov: string | null // 마우스를 올린 조각의 key
  onHov: (key: string | null) => void
  label: string // 도넛 가운데 글자
}

const R = 68
const CIRC = 2 * Math.PI * R

// 도넛 그래프: 종목 비중(InvestPkgWeight)과 추천 종목 업종 구성(InvestRecSectors)이 같이 쓴다. 범례는 쓰는 쪽이 그린다
export function InvestDonut({ parts, hov, onHov, label }: Props) {
  const n = parts.length
  return (
    <div className={styles.donut}>
      <svg width="160" height="160" viewBox="0 0 160 160" className={styles.svg} aria-hidden="true">
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={R} fill="none" className={styles.track} strokeWidth="24" />
          {parts.map((p, i) => {
            const len = p.frac * CIRC
            const off = -parts.slice(0, i).reduce((a, x) => a + x.frac, 0) * CIRC // 앞 조각들의 비율 합 = 시작 각도
            return (
              <circle
                key={p.key}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                strokeWidth="24"
                className={styles.seg}
                style={{ stroke: hov === p.key ? 'var(--color-gold)' : p.shade }}
                strokeDasharray={Math.max(0, len - (n > 1 ? 1.5 : 0)).toFixed(2) + ' ' + CIRC.toFixed(2)}
                strokeDashoffset={off.toFixed(2)}
                onMouseEnter={() => onHov(p.key)}
                onMouseLeave={() => onHov(null)}
              />
            )
          })}
        </g>
      </svg>
      <span className={styles.count}>{label}</span>
    </div>
  )
}
