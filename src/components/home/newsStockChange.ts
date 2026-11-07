import type { Quote } from '../../api/stockPackage'

export function newsStockChange(quote: Quote | undefined): { label: string; tone: 'up' | 'down' | 'flat' } | null {
  if (!quote?.available || quote.price == null || quote.previousClose == null ||
      !Number.isFinite(quote.price) || !Number.isFinite(quote.previousClose) ||
      quote.price <= 0 || quote.previousClose <= 0) return null
  const percent = Math.round((quote.price - quote.previousClose) / quote.previousClose * 10000) / 100
  if (!Number.isFinite(percent)) return null
  return { label: `${percent > 0 ? '+' : ''}${percent === 0 ? '0.00' : percent.toFixed(2)}%`,
    tone: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat' }
}
