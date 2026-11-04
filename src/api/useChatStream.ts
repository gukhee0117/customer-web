import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { BotMessage } from '../components/common/ChatbotFab'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:10000'
const MAX_HISTORY = 18 // 서버 허용 20개, 새 질문 2개 여유 확보
const MAX_Q_LEN = 1000
const MAX_MSG_LEN = 2000

function getXsrfToken(): string {
  const row = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('XSRF-TOKEN='))
  return row ? decodeURIComponent(row.slice('XSRF-TOKEN='.length)) : ''
}

/** BotMessage 배열을 서버 형식으로 변환 (최신 MAX_HISTORY개만, 스트리밍 중 빈 메시지 제외) */
function toHistory(msgs: BotMessage[]) {
  return msgs
    .filter((m) => !('kk' in m && m.text === '')) // 스트리밍 중 빈 메시지 제외
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: 'me' in m ? 'user' : 'assistant',
      content: m.text.slice(0, MAX_MSG_LEN),
    }))
}

/**
 * 끼루 AI 스트림 훅.
 * greeting 없이 호출하면 빈 대화로 시작 — AppLayout에서 공유 인스턴스로 사용.
 * 페이지마다 첫 마운트 시 addMessages([pageGreeting])으로 인사말 주입.
 */
export function useChatStream(greeting?: BotMessage) {
  // greeting은 렌더마다 새 객체가 될 수 있으므로 ref로 고정
  const greetingRef = useRef(greeting)
  const [messages, setMessages] = useState<BotMessage[]>(greetingRef.current ? [greetingRef.current] : [])
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (question: string) => {
      const q = question.trim().slice(0, MAX_Q_LEN)
      if (!q || busy) return

      // 이력은 사용자 메시지 추가 전 기준으로 계산
      const history = toHistory(messages)

      // 사용자 메시지 + 봇 답변 플레이스홀더 추가
      setMessages((prev) => [...prev, { me: true, text: q }, { kk: true, text: '' }])
      setBusy(true)

      const abort = new AbortController()
      abortRef.current = abort

      try {
        const response = await fetch(`${BASE_URL}/api/customer/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getXsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({ messages: history, question: q }),
          signal: abort.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            // Spring SseEmitter → "data:json" (공백 없음), 일부 구현 → "data: json" (공백 있음)
            const raw = line.slice(5)
            const event = JSON.parse(raw.startsWith(' ') ? raw.slice(1) : raw) as {
              type: string
              content?: string
            }
            if (event.type === 'token' && event.content) {
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if ('kk' in last)
                  return [...prev.slice(0, -1), { kk: true, text: last.text + event.content }]
                return prev
              })
            } else if (event.type === 'error') {
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if ('kk' in last && last.text === '')
                  return [
                    ...prev.slice(0, -1),
                    { kk: true, text: event.content ?? '오류가 발생했어요.' },
                  ]
                return prev
              })
            }
            // done: 루프 자연 종료
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          // 페이지 이탈로 취소 — 빈 플레이스홀더 제거
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if ('kk' in last && last.text === '') return prev.slice(0, -1)
            return prev
          })
        } else {
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if ('kk' in last && last.text === '')
              return [
                ...prev.slice(0, -1),
                { kk: true, text: '요청 처리 중 오류가 발생했어요.' },
              ]
            return prev
          })
        }
      } finally {
        setBusy(false)
      }
    },
    [messages, busy],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    setMessages(greetingRef.current ? [greetingRef.current] : [])
    setBusy(false)
  }, [])

  /** 메시지를 대화 끝에 직접 추가 (칩 mock 답변 등 AI 호출 없이 주입할 때 사용) */
  const addMessages = useCallback(
    (msgs: BotMessage[]) => {
      if (!busy) setMessages((prev) => [...prev, ...msgs])
    },
    [busy],
  )

  /** 외부 대화 내용을 가져와 현재 대화에 삽입 (인사말 뒤에 위치) */
  const importMessages = useCallback(
    (msgs: BotMessage[]) => {
      if (!busy)
        setMessages(greetingRef.current ? [greetingRef.current, ...msgs] : [...msgs])
    },
    [busy],
  )

  return { messages, busy, send, cancel, reset, addMessages, importMessages }
}

export type StreamApi = ReturnType<typeof useChatStream>

/** AppLayout에서 생성한 공유 스트림. 모든 페이지가 이 Context를 통해 같은 대화를 공유한다. */
export const StreamContext = createContext<StreamApi | null>(null)

export function useStream(): StreamApi {
  const ctx = useContext(StreamContext)
  if (!ctx) throw new Error('useStream은 StreamContext.Provider 안에서만 사용 가능합니다')
  return ctx
}
