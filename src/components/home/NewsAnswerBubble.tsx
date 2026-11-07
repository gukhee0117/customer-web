import { answerLabel, type Answer } from '../../api/news'
import { assetUrl } from '../common/assetUrl'
import type { Quote } from '../../api/stockPackage'
import { newsStockChange } from './newsStockChange'
import styles from './HomeNewsBox.module.css'

export function NewsAnswerBubble({ answer, summary = false, quotes = {}, quotesPending = false }: { answer: Answer; summary?: boolean; quotes?: Record<string, Quote>; quotesPending?: boolean }) {
  return <div className={styles.kk}>
    <img className={styles.face} src={assetUrl('assets/kkiru-ai-face.png')} alt="끼루" />
    <div className={styles.bubble}>
      {summary && <div className={styles.head}>이 기사 3줄로 요약해드릴게요</div>}
      <div className={styles.headTag}>{answerLabel(answer)}{answer.generatedAt && ` · ${new Date(answer.generatedAt).toLocaleString('ko-KR')}`}</div>
      {answer.points?.length ? <ul className={styles.sum}>{answer.points.map((point, i) => <li key={i}>{point}</li>)}</ul> : <div>{answer.explanation}</div>}
      {answer.quote && <div className={styles.quote}>기사 내용: ‘{answer.quote}’</div>}
      {summary && answer.evidence.risks.length > 0 && <div className={styles.quote}>함께 확인할 위험: {answer.evidence.risks.join(' ')}</div>}
      {!!answer.relatedStocks?.length && <div className={styles.quote}>뉴스 관련 종목</div>}
      {!!answer.relatedStocks?.length && <div className={styles.chips} aria-label="뉴스 관련 종목">
        {answer.relatedStocks.map(stock => {
          const change = newsStockChange(quotes[stock.ticker])
          return <span className={styles.chip} key={stock.ticker}>
            <strong>{stock.name}</strong><span className={styles.stockTicker}>{stock.ticker}</span>
            <span className={styles.stockSector}>{stock.sectorName || '분류 미제공'}</span>
            <span className={[styles.chg, change?.tone === 'up' ? styles.up : change?.tone === 'down' ? styles.down : ''].filter(Boolean).join(' ')}
              aria-label={`전일 대비 ${change?.label ?? (quotesPending ? '시세 확인 중' : '확인 불가')}`}>
              {change?.label ?? (quotesPending ? '시세 확인 중' : '확인 불가')}
            </span>
          </span>
        })}
      </div>}
    </div>
  </div>
}
