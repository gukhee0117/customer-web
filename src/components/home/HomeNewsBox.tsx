import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import type { Article } from '../../api/news'
import { useAuth } from '../../contexts/authState'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { NewsAnswerBubble } from './NewsAnswerBubble'
import { NEWS_Q } from './newsData'
import { useNewsBriefing } from './useNewsBriefing'
import { useNewsConversation } from './useNewsConversation'
import { useNewsSummaryQueue } from './useNewsSummaryQueue'
import { useNewsStockQuotes } from './useNewsStockQuotes'
import type { NewsSummaryQueue } from './NewsSummaryQueue'
import styles from './HomeNewsBox.module.css'


function ArticleConversation({ customerId, article, summaries }: { customerId: number; article: Article; summaries: NewsSummaryQueue }) {
  const conversation = useNewsConversation(customerId, article, summaries)
  const stockQuotes = useNewsStockQuotes(article.relatedStocks?.map(stock => stock.ticker) ?? [])
  const [input, setInput] = useState('')
  const conversationRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = conversationRef.current
    if (!el) return
    el.scrollTop = conversation.turns.length || conversation.pendingQuestion || conversation.error ? el.scrollHeight : 0
  }, [conversation.turns.length, conversation.pendingQuestion, conversation.error, conversation.summary])
  const disabled = conversation.pendingQuestion || conversation.pendingSummary
  function submit(e: FormEvent) { e.preventDefault(); if (!disabled && input.trim()) { void conversation.ask(input); setInput('') } }
  return <div className={styles.main}>
    <div className={styles.articleText}>
      <h3 className={styles.articleTitle}>{article.title}</h3>
      <div className={styles.articleMeta}>{article.source} · {article.publishedAt.replace('T', ' ')}</div>
      <div className={styles.headTag}>
        {article.demo ? '실제 보도가 아닌 직접 작성한 시연 기사' : '실제 뉴스 · 기사 내용을 바탕으로 AI가 설명해 드려요'}
        {!article.demo && article.url && /^https?:\/\//i.test(article.url) && <a className={styles.orig} href={article.url} target="_blank" rel="noopener noreferrer"> 원문 보기 ›</a>}
      </div>
    </div>
    <div ref={conversationRef} className={styles.conv} aria-live="polite" aria-busy={disabled}>
      {conversation.pendingSummary && <p role="status">기사 설명을 불러오고 있어요…</p>}
      {conversation.summary && <NewsAnswerBubble answer={conversation.summary} summary quotes={stockQuotes.quotes} quotesPending={stockQuotes.pending} />}
      {conversation.pendingSummary && article.facts.length > 0 && <div className={styles.evidence}>
        <ul className={styles.sum}>{article.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>
      </div>}
      {conversation.turns.map((turn, index) => <div key={index} className={styles.turn}>
        <div className={styles.meRow}><span className={styles.me}>{turn.question}</span></div>
        <NewsAnswerBubble answer={turn.answer} quotes={stockQuotes.quotes} quotesPending={stockQuotes.pending} />
      </div>)}
      {conversation.pendingQuestion && <div className={styles.turn}>
        <div className={styles.meRow}><span className={styles.me}>{conversation.pendingText}</span></div>
        <p className={styles.waiting} role="status">끼루가 기사에서 답을 찾고 있어요…</p>
      </div>}
      {conversation.error && <div role="alert">{conversation.error}<button type="button" onClick={conversation.retry}>기사 다시 불러오기</button></div>}
    </div>
    <div className={styles.qChips}>{NEWS_Q.map(q => <button key={q} disabled={disabled} type="button" className={styles.qChip} onClick={() => void conversation.ask(q)}>{q}</button>)}</div>
    <form className={styles.form} onSubmit={submit}>
      <input className={styles.input} value={input} disabled={disabled} maxLength={1000} onChange={e => setInput(e.target.value)} placeholder="이 기사에 대해 끼루에게 물어보세요" aria-label="뉴스 전용 질문" />
      <button type="submit" disabled={disabled || !input.trim()} className={styles.send}>전송</button>
    </form>
  </div>
}

function PersonalNews({ customerId }: { customerId: number }) {
  const { data, pending, error, reload } = useNewsBriefing(customerId)
  const summaries = useNewsSummaryQueue(customerId, data)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? data?.articles.find(item => item.article.id === selectedId) : undefined
  if (pending) return <p className={styles.main} role="status">보유 종목 뉴스를 불러오고 있어요…</p>
  if (error) return <div className={styles.main} role="alert">{error}<button type="button" onClick={reload}>다시 시도</button></div>
  if (!data?.articles.length) return <p className={styles.main}>{data?.themes?.length ? data.themes.join(', ') + ' 테마 관련 뉴스가 아직 없어요.' : '보유 종목에 등록된 테마가 없어 관련 뉴스를 찾지 못했어요.'}</p>
  if (!summaries) return <p className={styles.main} role="status">기사 요약을 준비하고 있어요…</p>
  return <>
    {!!data?.themes?.length && <p className={styles.notice}>보유 종목 테마: {data.themes.join(', ')}</p>}
    {data?.personalizationStatus !== 'ACTIVE' && <p className={styles.notice}>투자성향이 미진단이거나 만료되어 균형 잡힌 관점으로 설명해 드려요.</p>}
    <div className={styles.cols}>
      {selected ? <ArticleConversation key={`${customerId}:${selected.article.id}:${selected.article.version}`} customerId={customerId} article={selected.article} summaries={summaries} />
        : <div className={styles.welcome}>
          <h3>기사를 누르면 끼루가 요약해 드려요</h3>
          <p>보유 종목의 테마와 관련된 뉴스를 골라 보세요.</p>
        </div>}
      <div className={styles.list}>{data?.articles.map(item => <button key={item.article.id} type="button" className={cx(styles.item, item.article.id === selected?.article.id && styles.itemOn)} onClick={() => setSelectedId(item.article.id)}>
        <div className={styles.itemTitle}>{item.article.title}</div>
        <div className={styles.itemMeta}>{item.article.source} · {item.article.publishedAt.slice(0, 10)}</div>
      </button>)}</div>
    </div>
  </>
}

function CustomerNews({ customerId, className }: { customerId: number; className?: string }) {
  return <Box shadow className={cx(styles.news, className)} title="AI 뉴스">
    <PersonalNews customerId={customerId} />
  </Box>
}

export function HomeNewsBox({ className }: { className?: string }) {
  const { auth } = useAuth()
  if (auth.status !== 'authenticated') return <Box title="AI 뉴스" className={className}>로그인 후 뉴스를 확인해 주세요.</Box>
  // User replacement remounts the entire news subtree: no transient previous-user state.
  return <CustomerNews key={auth.me.customerId} customerId={auth.me.customerId} className={className} />
}
