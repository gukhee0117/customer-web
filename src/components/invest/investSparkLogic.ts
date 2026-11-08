// 종가 목록으로 그리는 미니·30일 선 차트의 계산(순수 함수). 시드의 계단 구간도 보정하지 않고 값 그대로 그린다

// 0~1 좌표 한 점. y는 아래로 갈수록 커진다(SVG 방향)
export interface SparkPoint {
  x: number
  y: number
}

// 값 목록 → 0~1 좌표. 최소·최대에 위아래 여백(pad 비율)을 두고, 좌우에도 여백(padX)을 줄 수 있다.
// 값이 모두 같으면 가운데 수평선, 점이 하나면 가운데에 찍는다
export function sparkNorm(values: number[], pad = 0.1, padX = 0): SparkPoint[] {
  const n = values.length
  if (n === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  return values.map((v, i) => {
    const fx = n === 1 ? 0.5 : i / (n - 1)
    const t = span === 0 ? 0.5 : pad + ((v - min) / span) * (1 - 2 * pad) // 0 = 바닥, 1 = 꼭대기
    return { x: padX + fx * (1 - 2 * padX), y: 1 - t }
  })
}

// SVG polyline의 points 문자열(sparkNorm 좌표를 w×h로 키운 것)
export function sparkPoints(values: number[], w: number, h: number, pad = 0.1, padX = 0): string {
  return sparkNorm(values, pad, padX)
    .map((p) => (p.x * w).toFixed(1) + ',' + (p.y * h).toFixed(1))
    .join(' ')
}

// 최고가·최저가의 위치(같은 값이 여러 날이면 가장 최근 날). 점이 2개 미만이거나 값이 모두 같으면 null
export function extremes(values: number[]): { hi: number; lo: number } | null {
  if (values.length < 2) return null
  let hi = 0
  let lo = 0
  values.forEach((v, i) => {
    if (v >= values[hi]) hi = i
    if (v <= values[lo]) lo = i
  })
  return values[hi] === values[lo] ? null : { hi, lo }
}

// 처음 대비 마지막 종가의 변동률(%). 점이 2개 미만이거나 처음 값이 0 이하면 null
export function changePercent(values: number[]): number | null {
  if (values.length < 2 || !(values[0] > 0)) return null
  return (values[values.length - 1] / values[0] - 1) * 100
}

// 변동률 문구: +4.2% / -3.1% / 0.0% (소수 첫째 자리, "-0.0%"는 만들지 않는다)
export function pctLabel(p: number): string {
  const r = Math.round(p * 10) / 10
  if (r === 0) return '0.0%'
  return (r > 0 ? '+' : '') + r.toFixed(1) + '%'
}

// 문구와 같은 자리에서 반올림한 값(색 구분용): 문구가 0.0%이면 0
export const roundedPct = (p: number): number => Math.round(p * 10) / 10
