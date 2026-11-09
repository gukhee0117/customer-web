import { cx } from '../common/cx'
import { InvestDonut } from './InvestDonut'
import { weightRowsOf } from './investChartLogic'
import type { PkgView } from './investPkgLogic'
import styles from './InvestPkgWeight.module.css'

interface Props {
  className?: string
  pkg: PkgView
  hov: string | null // 마우스를 올린 종목 코드(조각·줄이 함께 강조됨)
  onHov: (code: string | null) => void
}

// 종목 비중 — 도넛(가운데 종목 수)과 종목별 줄(지금 비중 / 목표 비중)
export function InvestPkgWeight({ className, pkg, hov, onHov }: Props) {
  const rows = weightRowsOf(pkg)
  return (
    <div className={cx(styles.box, className)}>
      <div className={styles.title}>종목 비중</div>
      <div className={styles.body}>
        <InvestDonut parts={rows.map((r) => ({ key: r.code, shade: r.shade, frac: r.frac }))} hov={hov} onHov={onHov} label={`${pkg.items.length}종목`} />
        <div className={styles.legend}>
          {rows.map((r) => (
            <div key={r.code} className={styles.row} onMouseEnter={() => onHov(r.code)} onMouseLeave={() => onHov(null)}>
              <span className={styles.dot} style={{ background: hov === r.code ? 'var(--color-gold)' : r.shade }} />
              <span className={cx(styles.name, hov === r.code && styles.nameOn)}>{r.name}</span>
              <b className={styles.w}>{`${r.w.toFixed(1)}%`}</b>
              <span className={cx(styles.target, r.tone !== 'flat' && styles.gap, styles[r.tone])}>/ {r.target}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
