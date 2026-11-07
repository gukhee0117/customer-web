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

const kdate = (d: string, withYear?: boolean): string => {
  const [y, m, dd] = d.split('-').map(Number)
  return (withYear ? y + '년 ' : '') + m + '월 ' + dd + '일'
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
