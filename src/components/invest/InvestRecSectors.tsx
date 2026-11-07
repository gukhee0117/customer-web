import { useState } from 'react'
import type { RecommendItem } from '../../api/stockPackage'
import { cx } from '../common/cx'
import { shadeOf } from './investChartLogic'
import styles from './InvestRecSectors.module.css'

interface Props {
  className?: string
  items: RecommendItem[] // 지금 표에 나온 추천 종목. 여기서 업종별 개수만 센다(추가 API 호출 없음)
}

const R = 68
const CIRC = 2 * Math.PI * R
const MAX_GROUPS = 5 // 도넛 색이 5단계라서 5조각까지. 넘으면 뒤쪽을 "기타"로 묶는다

interface Group {
  name: string
  count: number
}

// 업종별 종목 수. 펀드·ETF는 업종이 없어 한 묶음, 업종이 비어 있는 주식은 "기타". 많은 순(같으면 먼저 나온 순)
const groupBySector = (items: RecommendItem[]): Group[] => {
  const map = new Map<string, number>()
  for (const r of items) {
    const name = r.type === 'FUND' ? '펀드·ETF' : (r.sectorName ?? '기타')
    map.set(name, (map.get(name) ?? 0) + 1)
  }
  const groups = [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  if (groups.length <= MAX_GROUPS) return groups
  const head = groups.slice(0, MAX_GROUPS - 1)
  const rest = groups.slice(MAX_GROUPS - 1).reduce((a, g) => a + g.count, 0)
  return [...head, { name: '기타 업종', count: rest }]
}

// 추천 종목 업종 구성(종목 수 기준) — 종목 비중 도넛(InvestPkgWeight)과 같은 방식. 계좌 화면의 국내 투자 구성(매입금액 기준)과 다른 값이다
export function InvestRecSectors({ className, items }: Props) {
  const [hov, setHov] = useState<string | null>(null)
  const groups = groupBySector(items)
  const total = groups.reduce((a, g) => a + g.count, 0)
  if (total === 0) return null
  const n = groups.length
  const segs = groups.map((g, i) => ({
    g,
    shade: shadeOf(i, n),
    len: (g.count / total) * CIRC,
    off: -groups.slice(0, i).reduce((a, x) => a + x.count, 0) * (CIRC / total) // 앞 조각들의 비율 합 = 시작 각도
  }))

  return (
    <div className={cx(styles.box, className)} data-box="rec-sectors">
      <div className={styles.title}>추천 종목 업종 구성(종목 수 기준)</div>
      <div className={styles.body}>
        <div className={styles.donut}>
          <svg width="160" height="160" viewBox="0 0 160 160" className={styles.svg} aria-hidden="true">
            <g transform="rotate(-90 80 80)">
              <circle cx="80" cy="80" r={R} fill="none" className={styles.track} strokeWidth="24" />
              {segs.map(({ g, shade, len, off }) => (
                <circle
                  key={g.name}
                  cx="80"
                  cy="80"
                  r={R}
                  fill="none"
                  strokeWidth="24"
                  className={styles.seg}
                  style={{ stroke: hov === g.name ? 'var(--color-gold)' : shade }}
                  strokeDasharray={Math.max(0, len - (n > 1 ? 1.5 : 0)).toFixed(2) + ' ' + CIRC.toFixed(2)}
                  strokeDashoffset={off.toFixed(2)}
                  onMouseEnter={() => setHov(g.name)}
                  onMouseLeave={() => setHov(null)}
                />
              ))}
            </g>
          </svg>
          <span className={styles.count}>{`${total}종목`}</span>
        </div>
        <div className={styles.legend}>
          {segs.map(({ g, shade }) => (
            <div key={g.name} className={styles.row} onMouseEnter={() => setHov(g.name)} onMouseLeave={() => setHov(null)}>
              <span className={styles.dot} style={{ background: hov === g.name ? 'var(--color-gold)' : shade }} />
              <span className={cx(styles.name, hov === g.name && styles.nameOn)}>{g.name}</span>
              <b className={styles.w}>{`${g.count}종목`}</b>
              <span className={styles.pct}>{`${Math.round((g.count / total) * 100)}%`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
