import type { BotMessage } from '../common/ChatbotFab'

// 내 계좌 상담 창의 인사말·칩·알림 문구(답변은 서버 끼루 챗봇)

export const BOT_CHIPS = ['언제부터 인출할 수 있어요?', '남은 매도 한도 알려줘', '내 예상 감면액은?']

export const botGreeting = (): BotMessage => ({ kk: true, text: '내 계좌에 대해 물어보세요. 인출 일정, 남은 한도, 세액을 알려드려요.' })
