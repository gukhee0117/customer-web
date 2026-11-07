import '../../styles/tokens.css'
import { assetUrl } from './assetUrl'
import styles from './StockIcon.module.css'

interface StockIconProps {
  color?: string
  initial?: string
  size?: number
  logo?: string
  /** 국내 종목 코드 — 로고 파일(public/stock-logos)이 있는 종목이면 로고로 표시 */
  code?: string
}

// public/stock-logos/{코드}.png 가 있는 종목. 파일을 추가하면 여기도 추가
const LOGO_CODES = new Set('000270 000660 005380 005490 005930 012330 017670 028260 034730 035420 035720 051910 055550 068270 069500 086790 105560 114260 122630 196170 207940 247540 316140 360750'.split(' '))

// 종목 아이콘 — 대표색 원 + 흰 이니셜. logo를 넘기면 원형 이미지로 표시
export function StockIcon({ color, initial, size, logo, code }: StockIconProps) {
  const px = Number(size) || 28
  const ini = String(initial || '?')

  const src = logo || (code && LOGO_CODES.has(code) ? `stock-logos/${code}.png` : '')
  if (src) {
    return <img className={styles.logo} src={assetUrl(src)} alt="" style={{ width: px, height: px }} />
  }

  const fontSize = Math.round(px * (ini.length > 1 ? 0.36 : 0.46))
  return (
    <span className={styles.initial} aria-hidden="true" style={{ width: px, height: px, background: color || 'var(--color-muted)', fontSize }}>
      {ini}
    </span>
  )
}
