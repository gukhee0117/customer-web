import '../../styles/tokens.css'
import { StockIcon } from '../common/StockIcon'
import styles from './InvestStockName.module.css'

interface Props {
  code: string
  name?: string
  size?: 'sm' | 'md'
}

// 서버가 준 종목 이름·코드를 아이콘과 함께 한 줄로 보인다(종목별 대표색·업종은 서버에 없어 이름 첫 글자 아이콘만 쓴다)
export function InvestStockName({ code, name, size = 'sm' }: Props) {
  const label = name || code
  return (
    <span className={styles[size]}>
      <StockIcon color="var(--color-navy)" initial={String(label)[0]} size={size === 'sm' ? 20 : 28} code={code} />
      <b className={styles.name}>{label}</b>
      <span className={styles.code}>{code}</span>
    </span>
  )
}
