import type { PkgView } from './investPkgLogic'

// ───── 종목 비중(도넛·줄) ─────

// 도넛 조각 색(원본 SHADES): 종목 수에 맞춰 5단계에서 고름
export const DONUT_SHADES = ['var(--color-navy)', 'var(--color-donut-2)', 'var(--color-donut-3)', 'var(--color-donut-4)', 'var(--color-line-strong)']
export const shadeOf = (i: number, n: number): string => DONUT_SHADES[n <= 1 ? 0 : Math.round((i * 4) / (n - 1))]

// 합이 정확히 100.0이 되도록 소수 첫째 자리로 나눔(원본 lr1: 큰 소수부부터 0.1씩 보탬)
export function splitPercent(vals: number[]): number[] {
  const tot = vals.reduce((a, b) => a + b, 0)
  if (!tot) return vals.map(() => 0)
  const raw = vals.map((v) => (v / tot) * 1000)
  const fl = raw.map(Math.floor)
  let left = 1000 - fl.reduce((a, b) => a + b, 0)
  raw
    .map((x, i) => [x - fl[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (left > 0) {
        fl[i]++
        left--
      }
    })
  return fl.map((v) => v / 10)
}

export interface WeightRow {
  code: string
  name: string
  frac: number // 평가금액 비율(도넛 각도용, 0~1)
  w: number // 지금 비중 %
  target: number // 목표 비중 %
  shade: string
  tone: 'up' | 'down' | 'flat' // 목표와 2%p 이상 벌어졌을 때 위(많음)·아래(적음)
}

// 평가금액이 있는 종목만, 목록 순서 그대로(원본 live/legend)
export function weightRowsOf(pkg: PkgView): WeightRow[] {
  const w = splitPercent(pkg.items.map((i) => i.val))
  const live = pkg.items.map((it, i) => ({ it, w: w[i] })).filter((x) => x.it.val > 0)
  return live.map(({ it, w: wi }, i) => ({
    code: it.code,
    name: it.name || it.code,
    frac: it.val / (pkg.val || 1),
    w: wi,
    target: it.target,
    shade: shadeOf(i, live.length),
    tone: Math.abs(wi - it.target) >= 2 ? (wi > it.target ? 'up' : 'down') : 'flat'
  }))
}
