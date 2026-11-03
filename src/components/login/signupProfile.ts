export type ProfileKey = 'stable' | 'stableSeek' | 'neutral' | 'active' | 'aggressive'

// 낮은 점수 → 높은 점수 순서
export const ORDER: ProfileKey[] = ['stable', 'stableSeek', 'neutral', 'active', 'aggressive']

interface ProfileInfo {
  label: string
  color: string // CSS 색(성향 막대)
  img: string
  desc: [string, string]
}

export const PROFILES: Record<ProfileKey, ProfileInfo> = {
  stable: { label: '안정형', color: 'var(--color-profile-stable)', img: 'assets/kkiru-stable.png', desc: ['원금을 지키는 것을 가장 중요하게 생각해요.', '예금에 가까운 안정적인 상품 위주로 안내해 드릴게요.'] },
  stableSeek: { label: '안정추구형', color: 'var(--color-profile-stable-seek)', img: 'assets/kkiru-stable-seek.png', desc: ['손실은 작게, 예금보다 조금 높은 수익을 원해요.', '채권·배당주 중심으로 안내해 드릴게요.'] },
  neutral: { label: '위험중립형', color: 'var(--color-profile-neutral)', img: 'assets/kkiru-neutral.png', desc: ['수익을 위해 어느 정도의 가격 변동은 받아들여요.', '대형 우량주 중심으로 안내해 드릴게요.'] },
  active: { label: '적극투자형', color: 'var(--color-profile-active)', img: 'assets/kkiru-active.png', desc: ['높은 수익을 위해 큰 가격 변동도 감수할 수 있어요.', '성장주 비중을 높인 구성을 안내해 드릴게요.'] },
  aggressive: { label: '공격투자형', color: 'var(--color-profile-aggressive)', img: 'assets/kkiru-aggressive.png', desc: ['손실 위험이 커도 가장 높은 수익을 추구해요.', '변동성이 큰 종목까지 함께 안내해 드릴게요.'] }
}
