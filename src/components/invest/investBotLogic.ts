import { F } from '../../lib/calc'
import type { BotMessage } from '../common/ChatbotFab'
import { splitPercent } from './investChartLogic'
import type { PkgView } from './investPkgLogic'

// 주식 패키지 상담 창의 문구와 답변 — 원본 invest.dc.html의 botMsgs·botChips·botAns 그대로

export const BOT_CHIPS = ['수익률이 가장 높은 패키지는?', '비중이 많이 어긋난 종목은?', '주문 가능 금액은?']

export const botGreeting = (): BotMessage => ({ kk: true, text: '패키지에 대해 물어보세요. 수익률, 비중, 주문 가능 금액을 알려드려요.' })

// [현행 유지] 패키지 상담은 서버 데이터(views·cash)로 계산한 답변이다. 끼루 AI 연결은 패키지 문맥을 받는 서버 API가 생기면 한다
export function botAnswer(q: string, views: PkgView[], cur: PkgView, cash: number): string {
  if (/가장|수익률/.test(q)) {
    const best = views.slice().sort((a, b) => b.ret - a.ret)[0]
    return best.name + ' 패키지가 ' + F.pct(best.ret) + '로 가장 높아요.'
  }
  if (/비중/.test(q)) {
    const w = splitPercent(cur.items.map((i) => i.val))
    const top = cur.items
      .map((it, k) => ({ it, gap: Math.abs(w[k] - it.target) }))
      .sort((a, b) => b.gap - a.gap)[0]
    return cur.name + " 패키지에서 목표와 가장 차이 나는 종목은 " + (top ? top.it.name || top.it.code : '-') + "이에요. 패키지 상세의 종목 표에서 '비중 / 목표' 열로 지금 비중과 목표 비중을 비교해 볼 수 있어요."
  }
  return '지금 주문 가능 금액은 ₩' + F.won(cash) + '이에요.'
}

export const botTurn = (q: string, views: PkgView[], cur: PkgView, cash: number): BotMessage[] => [{ me: true, text: q }, { kk: true, text: botAnswer(q, views, cur, cash) }]
