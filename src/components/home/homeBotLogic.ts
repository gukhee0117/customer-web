import type { MouseEvent } from 'react'
import type { BotMessage } from '../common/ChatbotFab'
import type { TopBarTodo } from '../common/TopBar'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { URGENT_TAG } from './homeBotData'

// 홈 챗봇 대화 한 줄. fromAsk는 "끼루에게 물어보기"에서 옮겨 온 줄(다시 옮길 때 교체)
export type HomeBotMsg = BotMessage & { fromAsk?: boolean }

// "끼루에게 물어보기" 대화에서 옮겨 올 한 줄
export type FullAskMsg = { me: true; text: string } | { kk: true; text: string; src: string }

export interface BotAnswer {
  text: string
  src: string | null
}

const kdate = (d: string, withYear?: boolean): string => {
  const [y, m, dd] = d.split('-').map(Number)
  return (withYear ? y + '년 ' : '') + m + '월 ' + dd + '일'
}

// 원본 botAnswer: 상품 가이드라인·내 계좌 숫자 안에서만 답함
export function botAnswer(q: string): BotAnswer {
  const C = RD.C, biz = F.today(), wd = F.addYears(C.SOLD.date, C.HOLD_YEARS)
  const asof = '내 계좌 기준 ' + F.short(biz)
  const g = F.plan({ biz })
  if (/인출/.test(q)) return { text: kdate(C.SOLD.date) + ' 매도분 ' + F.man(C.SOLD.amount) + ' 원은 ' + kdate(wd, true) + '부터 인출할 수 있어요. 오늘(' + F.short(biz) + ') 기준 D-' + F.days(biz, wd) + '예요. 그 전에 원금을 인출하면 세제 혜택이 모두 취소돼요.', src: 'RIA 상품 가이드라인 · ' + asof }
  if (/한도/.test(q)) return { text: '전 증권사 합산 기준으로 ' + F.man(C.SELL_LIMIT) + ' 원 중 ' + F.man(C.SOLD.amount) + ' 원을 매도해서 남은 매도 한도는 ' + F.man(F.remaining()) + ' 원이에요.', src: asof }
  if (/감면|절세|세금|세액/.test(q)) {
    const n = F.tax(0, biz), gg = F.tax(g.gain, biz)
    return { text: '확정된 감면액은 ' + F.won(n.cut) + '원이에요. 남은 한도까지 팔면(예상 공제 ' + F.man(g.ded) + ' 원) ' + F.won(gg.cut - n.cut) + '원이 더해져 ' + F.won(gg.cut) + '원이 돼요. 다른 계좌의 해외주식 순매수가 없다고 가정한 예시예요.', src: asof }
  }
  if (/예탁금|예수금/.test(q)) return { text: '예수금으로 두어도 인출하지 않으면 1년 원금 유지 기간은 그대로 이어져요. 운용하지 않은 돈이라 수익은 생기지 않아요. 자세한 조건은 상품 가이드라인을 확인해 주세요.', src: 'RIA 상품 가이드라인 · ' + asof }
  if (/공제율|마감|구간/.test(q)) {
    const be = F.bandEnd(biz)
    return { text: '지금은 공제율 ' + Math.round(F.band(biz).rate * 100) + '% 구간이고 ' + kdate(be) + '에 마감돼요(D-' + F.days(biz, be) + ').', src: 'RIA 상품 가이드라인' }
  }
  return { text: '아직 답할 수 없는 질문이에요. 아래 빠른 질문을 눌러 보세요.', src: null }
}

export const botGreeting = (): HomeBotMsg => ({ kk: true, text: '안녕하세요, ' + RD.CUSTOMER.name + ' 님. RIA 계좌·세액·인출 일정에 대해 물어보세요.' })

// 질문 하나에 대한 대화 두 줄(질문 + 답)
export function botTurn(q: string): HomeBotMsg[] {
  const a = botAnswer(q)
  return [{ me: true, text: q }, { kk: true, text: a.text, src: a.src ?? undefined }]
}

// 상단 종 알림의 "오늘 확인할 일" — 원본 todos. info가 아닌 것의 개수가 알림 수에 더해짐
export interface HomeTodo extends TopBarTodo {
  level: 'warn' | 'caution' | 'info'
}

// remainingLimit: 서버 남은 매도 한도(원). 못 받았으면 null → 그 안내는 뺀다
export function homeTodos(onToast: (msg: string) => void, remainingLimit: number | null): HomeTodo[] {
  const C = RD.C, biz = F.today(), be = F.bandEnd(biz), dl = F.days(biz, be)
  const bandPct = Math.round(F.band(biz).rate * 100) + '%', urgent = dl <= C.URGENT_DAYS
  const wd = F.addYears(C.SOLD.date, C.HOLD_YEARS)
  const go = (msg: string) => (e: MouseEvent) => {
    e.preventDefault()
    onToast(msg)
  }
  const tagOf = (l: HomeTodo['level']): [string, string | undefined] =>
    l === 'warn' ? ['경고', URGENT_TAG] : l === 'caution' ? ['주의', 'var(--color-orange)'] : ['안내', undefined]
  const rows: Omit<HomeTodo, 'tag' | 'tagColor'>[] = [
    { level: urgent ? 'warn' : 'caution', title: urgent ? '마감까지 ' + dl + '일' : bandPct + ' 구간 마감까지 ' + dl + '일', desc: kdate(be) + '까지 매도한 분에 공제율 ' + bandPct + '가 적용돼요', link: '매도 ›', to: '#', onClick: go('매도 화면으로 이동해요') },
    ...(remainingLimit == null ? [] : [{ level: 'info' as const, title: '남은 매도 한도 ' + F.man(remainingLimit) + ' 원', desc: '전 증권사 합산 기준이에요', link: '내 계좌 ›', to: '/account' }]),
    { level: 'info', title: kdate(C.SOLD.date) + ' 정산분 ' + F.man(C.SOLD.amount) + ' 원', desc: kdate(wd, true) + '부터 인출할 수 있어요', link: '자금 환류 ›', to: '#', onClick: go('자금 환류 화면으로 이동해요') }
  ]
  return rows.map((t) => {
    const [tag, tagColor] = tagOf(t.level)
    return { ...t, tag, tagColor }
  })
}
