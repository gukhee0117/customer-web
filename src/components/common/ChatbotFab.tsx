import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { assetUrl } from './assetUrl'
import { cx } from './cx'
import styles from './ChatbotFab.module.css'

/** 끼루 말풍선 본문 + 링크 목록 */
function KkBody({ text, src }: { text: string; src?: string }) {
  const { body, links } = parseKkText(text)
  return (
    <div className={styles.kkBody}>
      <p className={styles.kkText}>{body}</p>
      {links.length > 0 && (
        <div className={styles.kkLinks}>
          {links.map((l, i) => (
            <Link key={i} to={l.to} className={styles.kkLink}>
              → {l.label}
            </Link>
          ))}
        </div>
      )}
      {src && <div className={styles.kkSrc}>근거: {src}</div>}
    </div>
  )
}

/** 메시지 텍스트에서 마크다운 링크를 추출한다.
 *  body: 링크 문법을 라벨 텍스트로 대체한 평문
 *  links: 추출된 링크 목록 (말풍선 아래에 별도 표시)
 */
function parseKkText(text: string): { body: string; links: { label: string; to: string }[] } {
  const links: { label: string; to: string }[] = []
  const body = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, to) => {
    links.push({ label, to })
    return ''
  }).trim()
  return { body, links }
}

export type BotMessage = { me: true; text: string } | { kk: true; text: string; src?: string }

export interface BotChat {
  messages: BotMessage[]
  chips?: { label: string; onClick: () => void }[]
  onSend: (text: string) => void
  busy?: boolean
  // true면 내 계좌용 간단한 창: panelWidth 폭, 입력칸·근거 줄 없이 말풍선 + 빠른 질문 버튼만
  simple?: boolean
  // 간단한 창에서 말풍선 목록이 늘어날 수 있는 최대 높이(px). 안 넘기면 360
  listMaxHeight?: number
}

interface ChatbotFabProps {
  // 열림 상태를 밖에서 관리하려면 open + onOpenChange, 아니면 생략(내부 상태)
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // 간단한 창(안내 문구 한 줄) — 계좌·패키지·커뮤니티·내 정보 화면
  children?: ReactNode
  panelWidth?: number // 간단한 창 폭(내 정보 340 · 계좌/패키지 360 · 커뮤니티 340)
  fabSize?: 'md' | 'sm' // md 60px · sm 56px(커뮤니티)
  titleSize?: 'md' | 'sm' // 창 제목: md 16px·800(기본) · sm 15px·600(커뮤니티)
  // 대화형 창(380×560) — 홈 화면
  chat?: BotChat
  // 첫 방문 안내 말풍선: 이 키가 localStorage에 없으면 보이고, 열거나 닫으면 키를 저장
  tipKey?: string
}

const CloseIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

const markTipSeen = (key?: string) => {
  if (!key) return
  try {
    localStorage.setItem(key, '1')
  } catch {
    // 저장소를 못 쓰면 이번 방문에서만 숨김
  }
}

const tipUnseen = (key?: string): boolean => {
  if (!key) return false
  try {
    return !localStorage.getItem(key)
  } catch {
    return false
  }
}

export function ChatbotFab({ open: openProp, onOpenChange, children, panelWidth = 360, fabSize = 'md', titleSize = 'md', chat, tipKey }: ChatbotFabProps) {
  const [innerOpen, setInnerOpen] = useState(false)
  const [tip, setTip] = useState(() => tipUnseen(tipKey))
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const open = openProp ?? innerOpen

  const setOpen = (next: boolean) => {
    // 밖에서 창을 열 때도 첫 방문 안내 말풍선은 사라지고 다시 뜨지 않음
    if (next) {
      markTipSeen(tipKey)
      setTip(false)
    }
    if (openProp === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }

  const toggle = () => {
    markTipSeen(tipKey)
    setTip(false)
    setOpen(!open)
  }

  const closeTip = () => {
    markTipSeen(tipKey)
    setTip(false)
  }

  // 새 메시지가 오거나 창을 열면 맨 아래로
  const messageCount = chat?.messages.length ?? 0
  useEffect(() => {
    // 내 계좌용 간단한 창은 원본처럼 자동으로 내리지 않음
    if (open && !chat?.simple && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [open, messageCount, chat?.simple])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!chat || !input.trim() || chat.busy) return
    chat.onSend(input)
    setInput('')
  }

  const small = fabSize === 'sm'
  const full = !!chat && !chat.simple // 홈용 대화형 창(380×560)

  return (
    <>
      {tip && !open && (
        <div className={styles.tip}>
          궁금한 건 끼루에게 물어보세요
          <button type="button" className={styles.tipClose} onClick={closeTip} aria-label="닫기">
            <CloseIcon size={14} />
          </button>
        </div>
      )}
      <button type="button" className={cx(styles.fab, small && styles.fabSm)} onClick={toggle} aria-label="끼루 AI 상담 열기">
        <img className={cx(styles.fabImage, small && styles.fabImageSm)} src={assetUrl('assets/face-white.png')} alt="" />
      </button>
      {open && (
        <div
          className={cx(styles.panel, full ? styles.panelChat : styles.panelSimple, small && !chat && styles.panelAboveSm)}
          style={full ? undefined : { width: panelWidth }}
          role="dialog"
          aria-label="끼루 AI 상담"
        >
          <div className={styles.head}>
            <img className={cx(styles.headFace, full && styles.headFaceChat)} src={assetUrl('assets/kkiru-ai-face.png')} alt="" />
            <b className={cx(styles.headTitle, titleSize === 'sm' && styles.headTitleSm)}>끼루 AI 상담</b>
            <button type="button" className={styles.close} onClick={toggle} aria-label="닫기">
              <CloseIcon size={18} />
            </button>
          </div>
          {chat?.simple ? (
            <>
              <div className={styles.simpleList} ref={listRef} style={chat.listMaxHeight ? { maxHeight: chat.listMaxHeight } : undefined}>
                {chat.messages.map((m, i) => (
                  <div key={i} className={cx(styles.simpleRow, 'me' in m && styles.simpleRowMe)}>
                    <span className={cx(styles.simpleMsg, 'me' in m && styles.simpleMsgMe)}>{m.text}</span>
                  </div>
                ))}
              </div>
              {chat.chips && chat.chips.length > 0 && (
                <div className={styles.simpleChips}>
                  {chat.chips.map((c) => (
                    <button key={c.label} type="button" className={styles.chip} onClick={c.onClick}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : chat ? (
            <>
              <div className={styles.messages} ref={listRef}>
                {chat.messages.map((m, i) => (
                  <div key={i} className={styles.message}>
                    {'me' in m ? (
                      <div className={styles.meRow}>
                        <span className={styles.meBubble}>{m.text}</span>
                      </div>
                    ) : (
                      <div className={styles.kkRow}>
                        <img className={styles.kkFace} src={assetUrl('assets/kkiru-ai-face.png')} alt="끼루" />
                        <KkBody text={m.text} src={m.src} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {chat.chips && chat.chips.length > 0 && (
                <div className={styles.chips}>
                  {chat.chips.map((c) => (
                    <button key={c.label} type="button" className={styles.chip} onClick={c.onClick}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              <form className={styles.form} onSubmit={submit}>
                <input className={styles.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder="궁금한 점을 입력하세요" aria-label="질문 입력" disabled={chat.busy} />
                <button type="submit" className={styles.send} disabled={chat.busy}>보내기</button>
              </form>
            </>
          ) : (
            <div className={styles.simpleBody}>
              <span className={styles.simpleBubble}>{children}</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}
