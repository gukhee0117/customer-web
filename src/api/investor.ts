import { RETURNS_DATA as RD } from '../data/returns'
import type { ProfileKey } from '../data/returns'
import { apiClient } from './client'

interface InvestorStatus {
  investorType: string
  assessed: boolean // 설문을 마쳤는가. 미진단(UNASSIGNED)이면 false
  expired: boolean // 진단 유효기간(24개월) 경과
}

// 서버의 내 투자성향 상태를 화면의 진단 상태(시연 설정의 assess)에 반영한다.
// 미진단이면 홈·주식 패키지가 추천 대신 '진단하기' 안내를 보여 준다. 조회에 실패하면 미진단으로 둔다(이전 계정의 진단 완료가 남아 보이지 않게)
export async function syncAssessState(): Promise<void> {
  try {
    const res = await apiClient.get<{ data: InvestorStatus }>('/api/customer/investor-assessment/me')
    const { assessed, expired } = res.data.data
    RD.setDemo({ assess: !assessed ? 'none' : expired ? 'expired' : 'ok' })
  } catch {
    RD.setDemo({ assess: 'none' })
  }
}

export interface SurveyChoice {
  value: string // 제출할 때 보내는 값
  label: string
}

export interface SurveyQuestion {
  answerKey: string // 제출 본문에서 이 문항의 응답을 담는 이름
  category: string
  text: string
  multiple: boolean // 복수 선택
  choices: SurveyChoice[]
}

// 문항별 응답: 단일 선택은 값 하나, 복수 선택은 값 목록
export type SurveyAnswers = Record<string, string | string[]>

export interface AssessmentResult {
  totalScore: number
  investorType: string
  assessedAt: string
  expiresAt: string
}

export async function fetchQuestions(): Promise<SurveyQuestion[]> {
  const res = await apiClient.get<{ data: SurveyQuestion[] }>('/api/customer/investor-assessment/questions')
  return res.data.data
}

// 점수 계산·성향 판정·저장은 서버가 한다. 재진단도 같은 호출이다
export async function submitAssessment(answers: SurveyAnswers): Promise<AssessmentResult> {
  const res = await apiClient.post<{ data: AssessmentResult }>('/api/customer/investor-assessment', answers)
  return res.data.data
}

const PROFILE_OF_TYPE: Record<string, ProfileKey> = {
  STABLE: 'stable',
  CONSERVATIVE: 'stableSeek',
  NEUTRAL: 'neutral',
  ACTIVE: 'active',
  AGGRESSIVE: 'aggressive'
}

// 서버 투자성향 값 → 화면의 성향 키
export const profileKeyOf = (investorType: string): ProfileKey => PROFILE_OF_TYPE[investorType] ?? 'neutral'
