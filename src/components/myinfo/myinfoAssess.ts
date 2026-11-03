// 투자성향 다시 진단 창 — 결과 구간표·설명. 문항·점수 계산은 서버가 한다(총점 → 성향 구간은 서버 기준과 같다)

// 결과 단계 구간표 (위쪽이 높은 점수)
export const ASSESS_BANDS: [string, string][] = [
  ['41점 이상', 'aggressive'],
  ['31점 ~ 40점', 'active'],
  ['21점 ~ 30점', 'neutral'],
  ['11점 ~ 20점', 'stableSeek'],
  ['10점 이하', 'stable']
]

// 성향별 설명 첫 줄 (결과 단계 as.d1)
export const ASSESS_DESC: Record<string, string> = {
  stable: '원금을 지키는 것을 가장 중요하게 생각해요.',
  stableSeek: '손실은 작게, 예금보다 조금 높은 수익을 원해요.',
  neutral: '수익을 위해 어느 정도의 가격 변동은 받아들여요.',
  active: '높은 수익을 위해 큰 가격 변동도 감수할 수 있어요.',
  aggressive: '손실 위험이 커도 가장 높은 수익을 추구해요.'
}
