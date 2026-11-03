import { RETURNS_DATA as RD } from '../data/returns'
import { apiClient } from './client'

interface InvestorStatus {
  investorType: string
  assessed: boolean // 설문을 마쳤는가. 미진단(UNASSIGNED)이면 false
  expired: boolean // 진단 유효기간(24개월) 경과
}

// 서버의 내 투자성향 상태를 화면의 진단 상태(시연 설정의 assess)에 반영한다.
// 미진단이면 홈·주식 패키지가 추천 대신 '진단하기' 안내를 보여 준다. 조회에 실패하면 화면 상태를 그대로 둔다
export async function syncAssessState(): Promise<void> {
  try {
    const res = await apiClient.get<{ data: InvestorStatus }>('/api/customer/investor-assessment/me')
    const { assessed, expired } = res.data.data
    RD.setDemo({ assess: !assessed ? 'none' : expired ? 'expired' : 'ok' })
  } catch {
    // 조회 실패는 건너뜀
  }
}
