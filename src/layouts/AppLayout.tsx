import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useChatStream, StreamContext } from '../api/useChatStream'
import { ChatbotFab } from '../components/common/ChatbotFab'
import type { BotChat } from '../components/common/ChatbotFab'
import { SiteFooter } from '../components/common/SiteFooter'
import { TopBar } from '../components/common/TopBar'
import type { TopBarActive } from '../components/common/TopBar'
import { RETURNS_DATA } from '../data/returns'
import type { AppShellApi, TopBarExtra } from './appShell'
import styles from './AppLayout.module.css'

interface BotConfig {
  text: string
  panelWidth: number
  fabSize?: 'md' | 'sm'
  titleSize?: 'md' | 'sm'
  tipKey?: string
}

// 화면별 챗봇 안내(원본 각 페이지의 값). 홈은 대화형 창(chat)을 페이지가 넘겨줌
const BOT: Record<TopBarActive, BotConfig> = {
  home: { text: '안녕하세요, ' + RETURNS_DATA.CUSTOMER.name + ' 님. RIA 계좌·세액·인출 일정에 대해 물어보세요.', panelWidth: 360, tipKey: 'rt_home_kkiru_tip' },
  account: { text: '내 계좌에 대해 물어보세요. 인출 일정, 남은 한도, 세액을 알려드려요.', panelWidth: 360 },
  invest: { text: '패키지에 대해 물어보세요. 수익률, 비중, 주문 가능 금액을 알려드려요.', panelWidth: 360 },
  community: { text: '경제 채팅방은 고객님들끼리 나누는 대화예요. 종목이나 계좌가 궁금하면 여기서 물어보세요.', panelWidth: 340, fabSize: 'sm', titleSize: 'sm' },
  myinfo: { text: '회원정보 변경이나 알림 설정이 궁금하면 물어보세요.', panelWidth: 340 }
}

const isActive = (key: string): key is TopBarActive => key in BOT

// 로그인 후 화면용 — 상단 바 + 푸터 + 챗봇 버튼. 현재 메뉴는 주소(/home …)로 정함
export function AppLayout() {
  const { pathname } = useLocation()
  const key = pathname.split('/')[1]
  const active: TopBarActive = isActive(key) ? key : 'home'
  const bot = BOT[active]
  // 페이지(홈)가 채워 주는 값 — 안 채우면 비어 있어 이전과 똑같이 동작
  const [topBar, setTopBar] = useState<TopBarExtra>({})
  const [chat, setChat] = useState<BotChat | null>(null)
  const [botOpen, setBotOpen] = useState(false)
  // 화면을 옮기면 챗봇은 닫힌 채로 시작(간단한 창도 예전처럼 화면마다 새로 시작)
  const [botActive, setBotActive] = useState(active)
  if (botActive !== active) {
    setBotActive(active)
    setBotOpen(false)
  }
  // 모든 페이지가 공유하는 끼루 스트림 — 페이지 이동 시 대화 이력 유지
  const stream = useChatStream()
  const shell = useMemo<AppShellApi>(() => ({ setTopBar, setChat, setBotOpen }), [])

  return (
    <StreamContext.Provider value={stream}>
    <div className={styles.shell}>
      {/* 원본은 다섯 화면 모두 검색창 없음 + 사용자 메뉴는 '내 정보'만 */}
      <TopBar active={active} noSearch simpleUserMenu {...topBar} />
      <main className={styles.main}>
        <Outlet context={shell} />
      </main>
      <SiteFooter />
      <ChatbotFab
        key={active}
        panelWidth={bot.panelWidth}
        fabSize={bot.fabSize}
        titleSize={bot.titleSize}
        tipKey={bot.tipKey}
        chat={chat ?? undefined}
        open={botOpen}
        onOpenChange={setBotOpen}
      >
        {bot.text}
      </ChatbotFab>
    </div>
    </StreamContext.Provider>
  )
}
