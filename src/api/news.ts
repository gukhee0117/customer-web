import { apiClient, type ApiResponse } from './client'

export interface Article {
  id: string; version: string; title: string; demo: boolean; source: string
  url: string | null; publishedAt: string; tickers: string[]; relatedStocks?: { ticker: string; name: string; sectorName?: string | null }[]; facts: string[]; risks: string[]
}
export interface Briefing {
  customerId: number; investorType: string; personalizationStatus: 'ACTIVE' | 'EXPIRED' | 'UNASSIGNED'
  contextVersion?: string; summaryVersion?: string; firstSummary?: Answer | null
  selectionRuleVersion: string; articles: { article: Article; score: number }[]; themes?: string[]
}
export interface Answer {
  articleId: string; articleVersion: string; evidence: { facts: string[]; risks: string[] }
  explanation: string; origin: 'LIVE_LLM' | 'CACHED_LLM' | 'PREPARED'
  preparedReason: 'DEMO_DEFAULT' | 'LLM_UNAVAILABLE' | 'POLICY_REFUSAL' | 'ARTICLE_EVIDENCE' | null; generatedAt: string | null
  points?: string[]; quote?: string | null; relatedStocks?: { ticker: string; name: string; sectorName?: string | null }[]
}
export interface Message { role: 'user' | 'assistant'; content: string }
export interface StockThemes { ticker: string; name: string; sectorName: string | null; themes: string[] }
export const newsApi = {
  async themes(signal: AbortSignal) {
    return (await apiClient.get<ApiResponse<StockThemes[]>>('/api/customer/news/themes', { signal })).data.data
  },
  async briefing(signal: AbortSignal) {
    return (await apiClient.get<ApiResponse<Briefing>>('/api/customer/news/briefing', { signal })).data.data
  },
  async summary(article: Article, signal: AbortSignal) {
    return (await apiClient.post<ApiResponse<Answer>>(`/api/customer/news/articles/${encodeURIComponent(article.id)}/summary`,
      { articleVersion: article.version }, { signal })).data.data
  },
  async question(article: Article, question: string, messages: Message[], signal: AbortSignal) {
    return (await apiClient.post<ApiResponse<Answer>>(`/api/customer/news/articles/${encodeURIComponent(article.id)}/questions`,
      { articleVersion: article.version, question, messages: messages.slice(-6) }, { signal })).data.data
  },
}

export function answerLabel(answer: Answer): string {
  switch (answer.origin) {
    case 'LIVE_LLM': return ''
    case 'CACHED_LLM': return ''
    case 'PREPARED': return answer.preparedReason === 'ARTICLE_EVIDENCE' ? '' : answer.preparedReason === 'POLICY_REFUSAL' ? '매매 조언 제한 안내' : answer.preparedReason === 'LLM_UNAVAILABLE' ? 'AI 연결 지연 · 준비된 대체 답변' : '시연용으로 준비한 설명'
    default: return answer.origin
  }
}
