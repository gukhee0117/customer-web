import { useOutletContext } from 'react-router-dom'
import type { BotChat } from '../components/common/ChatbotFab'

export interface AppShellApi {
  setChat: (v: BotChat | null) => void
  setBotOpen: (v: boolean) => void
}

export const useAppShell = (): AppShellApi => useOutletContext<AppShellApi>()
