import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { currentAdj } from './accountTaxData'
import type { BotMessage } from '../common/ChatbotFab'

// 내 계좌 상담 창의 문구와 답변 — 원본 account.dc.html의 botMsgs·botChips·botAns 그대로(숫자는 src/data·src/lib에서)

export const BOT_CHIPS = ['언제부터 인출할 수 있어요?', '남은 매도 한도 알려줘', '내 예상 감면액은?']

export const botGreeting = (): BotMessage => ({ kk: true, text: '내 계좌에 대해 물어보세요. 인출 일정, 남은 한도, 세액을 알려드려요.' })

export function botAnswer(q: string): string {
  const C = RD.C
  const biz = C.BUSINESS_DATE
  const wd = RD.WITHDRAW.availableDate
  if (/인출/.test(q)) {
    return F.dot(RD.WITHDRAW.paidDate) + ' 납입분 ' + F.man(RD.WITHDRAW.paidIn) + ' 원은 ' + F.dot(wd) + '부터 인출할 수 있어요(D-' + F.withdrawDday(biz) + '). 지금은 수익 초과분 ' + F.won(F.withdrawableNow()) + '원만 인출할 수 있어요.[내 계좌 › 인출 신청](/account?open=withdrawal)'
  }
  if (/한도/.test(q)) {
    return '전 증권사 합산 ' + F.man(C.SELL_LIMIT) + ' 원 중 ' + F.man(C.SOLD.amount) + ' 원을 매도해서 남은 매도 한도는 ' + F.man(F.remaining()) + ' 원이에요.[내 계좌 › 매도 신청](/account?open=sell)'
  }
  const t0 = F.tax(0, biz, currentAdj())
  return '예상 감면액은 ' + F.won(t0.cut) + '원이에요. 최종 납부 예상 세액은 ' + F.won(t0.ria) + '원이에요.[내 계좌 › 세액예상](/account#tax)'
}

export const botTurn = (q: string): BotMessage[] => [{ me: true, text: q }, { kk: true, text: botAnswer(q) }]

// ---- 상단 종 알림: 신청이 접수되면 1건 추가(원본 alerts) ----
export interface ApplyAlert {
  title: string
  tab: 'deposits' | 'sells' | 'withdraw'
}
export const ALERT_TAG = '신청'
export const ALERT_DESC = '심사 중 · 결과는 알림으로 알려드려요'
export const ALERT_LINK = '내역 보기'
