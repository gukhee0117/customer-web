import { useOutletContext } from 'react-router-dom'
import type { BotChat } from '../components/common/ChatbotFab'

// 페이지가 상단 바·챗봇에 넘겨주는 값(홈만 사용). 비어 있으면 AppLayout 기본값 그대로
export interface TopBarExtra {
  profLabel?: string
}

export interface AppShellApi {
  setTopBar: (v: TopBarExtra) => void
  setChat: (v: BotChat | null) => void
  setBotOpen: (v: boolean) => void
}

export const useAppShell = (): AppShellApi => useOutletContext<AppShellApi>()
