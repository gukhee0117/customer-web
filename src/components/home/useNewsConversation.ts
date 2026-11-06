import { useLayoutEffect, useRef, useState } from 'react'
import { newsApi, type Answer, type Article, type Message } from '../../api/news'
import { apiErrorMessage } from '../../api/client'
import { NewsRequestGate } from './newsRequestGate'
import type { NewsSummaryQueue } from './NewsSummaryQueue'

export interface NewsTurn { question: string; answer: Answer }
export function useNewsConversation(customerId: number, article: Article | null, queue?: NewsSummaryQueue) {
  const summaryGate = useRef(new NewsRequestGate())
  const questionGate = useRef(new NewsRequestGate())
  const sending = useRef(false)
  const [summary, setSummary] = useState<Answer | null>(null)
  const [turns, setTurns] = useState<NewsTurn[]>([])
  const [pendingSummary, setPendingSummary] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState(false)
  const [pendingText, setPendingText] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const id = article?.id
  const version = article?.version
  useLayoutEffect(() => {
    setSummary(null); setTurns([]); setError(''); setPendingQuestion(false); setPendingText('')
    sending.current = false
    const summaries = summaryGate.current
    const questions = questionGate.current
    summaries.cancel(); questions.cancel()
    if (!article) { setPendingSummary(false); return }
    const ticket = summaries.start(`${customerId}:${article.id}:${article.version}`)
    const ready = queue?.peek(article)
    if (ready) { queue?.select(article); setSummary(ready); setPendingSummary(false) }
    else {
      setPendingSummary(true)
      const request = queue ? queue.request(article, ticket.signal) : newsApi.summary(article, ticket.signal)
      void request.then(answer => {
        if (ticket.current() && answer.articleId === article.id && answer.articleVersion === article.version) setSummary(answer)
      }).catch(e => {
        if (ticket.current()) setError(apiErrorMessage(e, '기사 설명을 불러오지 못했어요.'))
      }).finally(() => { if (ticket.current()) setPendingSummary(false) })
    }
    return () => { summaries.cancel(); questions.cancel(); sending.current = false }
    // The article is identified by immutable id/version, not object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, id, version, attempt, queue])

  async function ask(value: string) {
    const question = value.trim()
    if (!article || !question || question.length > 1000 || sending.current || pendingSummary) return
    sending.current = true; setPendingQuestion(true); setPendingText(question); setError('')
    const ticket = questionGate.current.start(`${customerId}:${article.id}:${article.version}`)
    const history: Message[] = turns.flatMap(t => [
      { role: 'user' as const, content: t.question },
      { role: 'assistant' as const, content: t.answer.explanation },
    ]).slice(-6)
    try {
      const answer = await newsApi.question(article, question, history, ticket.signal)
      if (ticket.current() && answer.articleId === article.id && answer.articleVersion === article.version) {
        setTurns(previous => [...previous.slice(-2), { question, answer }])
      }
    } catch (e) {
      if (ticket.current()) setError(apiErrorMessage(e, '답변을 받지 못했어요. 다시 질문해 주세요.'))
    } finally {
      if (ticket.current()) { sending.current = false; setPendingQuestion(false); setPendingText('') }
    }
  }
  return { summary, turns, pendingSummary, pendingQuestion, pendingText, error, ask, retry: () => { if (article) queue?.invalidate(article); setAttempt(n => n + 1) } }
}
