// 30일 그래프 선(원본 spark 그대로: seed로 정해지는 예시 곡선)
// 예전 추천 박스의 종목 평가 답변(recAnswer)은 투자 권유가 아닌 정보 제공 원칙에 맞지 않아 없앴다. 이 파일에는 나만의 주식 패키지 박스가 쓰는 그래프 선만 남겼다
export function spark(seed: number, up: boolean): string {
  let x = seed * 9301 + 49297
  const r = () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
  let v = 50
  const pts: number[] = []
  for (let i = 0; i < 30; i++) {
    v += (r() - 0.48 + (up ? 0.04 : -0.02)) * 8
    pts.push(v)
  }
  const mn = Math.min(...pts)
  const mx = Math.max(...pts)
  return pts.map((p, i) => (i ? 'L' : 'M') + ((i * 200) / 29).toFixed(1) + ' ' + (44 - ((p - mn) / (mx - mn || 1)) * 40).toFixed(1)).join(' ')
}
