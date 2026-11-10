import { useState } from 'react'
import '../../styles/tokens.css'
import { assetUrl } from './assetUrl'
import styles from './StockIcon.module.css'

interface StockIconProps {
  color?: string
  initial?: string
  size?: number
  logo?: string
  /** 종목 코드(국내 6자리·해외 티커) — public/stock-logos/{코드}.png 가 있으면 로고로 표시, 없으면 색 원 */
  code?: string
}

// 종목 아이콘 — 대표색 원 + 흰 이니셜. logo를 넘기면 원형 이미지로 표시
export function StockIcon({ color, initial, size, logo, code }: StockIconProps) {
  const [missing, setMissing] = useState('')
  const px = Number(size) || 28
  const ini = String(initial || '?')

  const src = logo || (code && code !== missing ? `stock-logos/${code}.png` : '')
  if (src) {
    return <img className={styles.logo} src={assetUrl(src)} alt="" style={{ width: px, height: px }} onError={() => setMissing(code ?? '')} />
  }

  const fontSize = Math.round(px * (ini.length > 1 ? 0.36 : 0.46))
  return (
    <span className={styles.initial} aria-hidden="true" style={{ width: px, height: px, background: color || 'var(--color-muted)', fontSize }}>
      {ini}
    </span>
  )
}
