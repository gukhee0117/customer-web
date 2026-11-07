import type { BotMessage } from '../common/ChatbotFab'

// 홈 챗봇 대화 한 줄. fromAsk는 "끼루에게 물어보기"에서 옮겨 온 줄(다시 옮길 때 교체)
export type HomeBotMsg = BotMessage & { fromAsk?: boolean }

// "끼루에게 물어보기" 대화에서 옮겨 올 한 줄
export type FullAskMsg = { me: true; text: string } | { kk: true; text: string; src: string }
