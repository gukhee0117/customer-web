import { RETURNS_DATA as RD } from '../data/returns'
import type { ProfileKey } from '../data/returns'
import { accountStateOf, getProfile } from './profile'
import { apiClient } from './client'
import type { ApiResponse } from './client'
import { notifyNewsContextChanged } from '../lib/newsSessionEvents'

export interface InvestorStatus {
  investorType: string
  assessed: boolean // 설문을 마쳤는가. 미진단(UNASSIGNED)이면 false
  assessedAt: string | null // 진단 기록이 없는 고객(시드)은 null
  expiresAt: string | null
  expired: boolean // 진단 유효기간(24개월) 경과
}

export async function fetchAssessStatus(): Promise<InvestorStatus> {
  const res = await apiClient.get<ApiResponse<InvestorStatus>>('/api/customer/investor-assessment/me')
  return res.data.data
}

// 서버의 내 투자성향·계좌 상태를 화면이 공통으로 읽는 값(RD.serverState)에 반영한다.
// 미진단이면 홈·주식 패키지가 추천 대신 '진단하기' 안내를 보여 준다. 조회에 실패하면 성향만 비운다(이전 계정의 진단 완료가 남아 보이지 않게)
export async function syncAssessState(): Promise<void> {
  try {
    const res = await apiClient.get<ApiResponse<InvestorStatus>>('/api/customer/investor-assessment/me')
    const { investorType, assessed, expired } = res.data.data
    // 성향도 서버 값으로 — 같은 브라우저에서 계정이 바뀌어도 이전 계정의 성향이 남지 않게
    RD.setServerState({ assess: !assessed ? 'none' : expired ? 'expired' : 'ok', profile: assessed ? profileKeyOf(investorType) : null })
  } catch {
    // 조회 실패는 진단 여부를 모르는 것이라 '미진단·만료'로 단정하지 않는다(진단한 사람에게 진단 안내가 뜨지 않게). 성향만 비워 이전 계정 값이 남지 않게 한다
    RD.setServerState({ assess: 'ok', profile: null })
  }
  // 계좌 상태(없음·심사 중·반려·정상)도 서버 프로필 값으로. 실패하면 이전 계정의 상태가 남지 않게 계좌 없음으로 둔다
  try {
    RD.setServerState({ account: accountStateOf((await getProfile()).account) })
  } catch {
    RD.setServerState({ account: 'none' })
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
  const res = await apiClient.get<ApiResponse<SurveyQuestion[]>>('/api/customer/investor-assessment/questions')
  return res.data.data
}

// 점수 계산·성향 판정·저장은 서버가 한다. 재진단도 같은 호출이다
export async function submitAssessment(answers: SurveyAnswers): Promise<AssessmentResult> {
  const res = await apiClient.post<ApiResponse<AssessmentResult>>('/api/customer/investor-assessment', answers)
  const result = res.data.data
  notifyNewsContextChanged()
  return result
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
