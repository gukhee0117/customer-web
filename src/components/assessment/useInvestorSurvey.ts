import { useCallback, useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { fetchQuestions } from '../../api/investor'
import type { SurveyAnswers, SurveyQuestion } from '../../api/investor'

const NONE = 'NONE' // 투자 경험의 "경험 없음"은 다른 보기와 함께 고를 수 없다

// 서버 설문 문항을 받아 응답을 들고 있는다. 가입 설문과 내 정보 재진단이 같이 쓴다
export function useInvestorSurvey() {
  const [questions, setQuestions] = useState<SurveyQuestion[] | null>(null)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<SurveyAnswers>({})

  const load = useCallback(async () => {
    setError('')
    try {
      setQuestions(await fetchQuestions())
    } catch (e) {
      setError(apiErrorMessage(e, '설문을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요'))
    }
  }, [])

  const reset = useCallback(() => setAnswers({}), [])

  const pick = (q: SurveyQuestion, value: string) =>
    setAnswers((prev) => {
      if (!q.multiple) return { ...prev, [q.answerKey]: value }
      const cur = (prev[q.answerKey] as string[] | undefined) ?? []
      if (value === NONE) return { ...prev, [q.answerKey]: cur.includes(NONE) ? [] : [NONE] }
      const rest = cur.filter((v) => v !== NONE)
      return { ...prev, [q.answerKey]: rest.includes(value) ? rest.filter((v) => v !== value) : [...rest, value] }
    })

  const isPicked = (q: SurveyQuestion, value: string) => {
    const a = answers[q.answerKey]
    return Array.isArray(a) ? a.includes(value) : a === value
  }

  const isAnswered = (q: SurveyQuestion) => {
    const a = answers[q.answerKey]
    return Array.isArray(a) ? a.length > 0 : !!a
  }

  return { questions, error, answers, load, reset, pick, isPicked, isAnswered }
}
