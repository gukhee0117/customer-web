import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../../styles/tokens.css'
import { PROFILE_KEY, REC_DISCLAIMER, askRecommendation } from '../../api/stockPackage'
import type { RecommendBasis } from '../../api/stockPackage'
import { serverState } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { assetUrl } from '../common/assetUrl'
import { cx } from '../common/cx'
import { InvestStockName } from '../invest/InvestStockName'
import { useTendency } from '../invest/useNewPkgData'
import { useRecommendations } from '../invest/useRecommendations'
import { ASK_CHIPS_EMPTY, NO_REC_TEXT, askChips } from './homeRecData'
import type { FullAskMsg } from './homeBotLogic'
import styles from './HomeRecBox.module.css'

// 대화 한 줄: 내 질문 / 끼루 답(pkg가 있으면 그 종목의 "패키지에 담기" 버튼, wait는 답을 기다리는 중)
type AskMsg = { me: true; text: string } | { me?: false; text: string; pkg?: string; wait?: boolean; ai?: boolean }

// 홈에 보이는 추천 종목 수. 추천을 부를 때와 끼루에게 물을 때 같은 값을 써야 답이 화면과 같은 종목으로 나온다
const HOME_REC_COUNT = 3
const tone = (n: number) => (n > 0 ? styles.up : n < 0 ? styles.down : styles.flat)
const GRADE_WORD: Record<number, string> = { 1: '매우 높은 위험', 2: '높은 위험', 3: '다소 높은 위험', 4: '보통 위험', 5: '낮은 위험', 6: '매우 낮은 위험' }
const BASES: [RecommendBasis, string][] = [
  ['SURVEY', '설문으로 본 성향'],
  ['TRADING', '거래로 본 경향']
]
const allowedText = (min: number | null) => (min == null ? '' : min === 6 ? '6등급' : min + '~6등급')

interface HomeRecBoxProps {
  className?: string
  onOpenFullAsk?: (conv: FullAskMsg[]) => void // "전체 대화 보기 ›" — 지금까지의 대화를 챗봇 창으로 옮김
  onAskDeposit?: () => void // "예탁금으로 두면 어떻게 되나요? ›" — 챗봇 창에서 대신 물어봄
}

// 오늘의 종목 박스: 성향별 추천 3종목(서버) + 상세 카드 + 끼루에게 물어보기(서버)
export function HomeRecBox({ className, onOpenFullAsk, onAskDeposit }: HomeRecBoxProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
  const [ask, setAsk] = useState<AskMsg[]>([])
  const [askFocus, setAskFocus] = useState<string | null>(null)
  const [basis, setBasis] = useState<RecommendBasis>('SURVEY')
  const [input, setInput] = useState('')
  const asking = useRef(false)
  const askRef = useRef<HTMLDivElement>(null)

  const rec = useRecommendations('ALL', HOME_REC_COUNT, basis)
  const tendency = useTendency()
  const survey = tendency.data?.survey
  const data = rec.data
  const trading = basis === 'TRADING'
  const recs = data && data.basisAvailable ? data.items : []
  const profileKey = survey?.investorType ? (PROFILE_KEY[survey.investorType] ?? 'neutral') : 'neutral'
  const label = data?.profileLabel ?? survey?.label ?? ''
  const allow = allowedText(data?.allowedMinGrade ?? survey?.allowedMinGrade ?? null)
  // 패키지에 담으려면 RIA 계좌가 개설돼 있어야 한다 — 로그인 때 서버 프로필로 맞춰 둔 계좌 상태(홈 패키지 박스와 같은 값)
  const opened = serverState().account === 'opened'
  const off = rec.state === 'ready' && data !== null && !data.basisAvailable
  const none = !survey?.available && !survey?.expired
  const ready = rec.state === 'ready'
  const recEmpty = ready && !off && recs.length === 0
  const recEmptyT1 = trading ? '내 거래 경향에 맞는 상품이 지금은 없어요.' : label + '은 ' + allow + ' 상품을 추천받을 수 있어요.'

  // 상세 카드: 바깥 클릭·Esc·스크롤하면 닫힘
  useEffect(() => {
    if (open === null) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (!(t && t.closest && t.closest('[data-rec-pop],[data-rec-row]'))) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    const onScroll = () => setOpen(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  // 대화는 질문이 붙을 때와 답이 채워질 때마다 맨 아래로(답이 같은 칸을 채우면 줄 수는 그대로여도 높이가 늘어난다)
  useEffect(() => {
    const el = askRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [ask])

  // "패키지에 담기": 투자 페이지의 추천 탭에서 쓰던 담기 흐름(어느 패키지에 담을지 → 목표 비중)으로 이어 줌
  const addPkg = (ticker: string) => navigate('/invest?rec=' + encodeURIComponent(ticker))

  const doAsk = (q: string) => {
    const text = q.trim()
    if (!text || asking.current) return
    asking.current = true
    setAsk((a) => a.concat([{ me: true, text }, { text: '', wait: true }]))
    setInput('')
    askRecommendation(text, askFocus, basis, HOME_REC_COUNT)
      .then(
        (res): AskMsg => ({ text: res.answer, pkg: res.ticker ?? undefined, ai: res.aiGenerated }),
        (): AskMsg => ({ text: '지금은 답을 가져오지 못했어요. 잠시 뒤에 다시 물어봐 주세요.' })
      )
      .then((answer) => {
        setAsk((a) => {
          const i = a.map((m) => ('wait' in m && m.wait) || false).lastIndexOf(true)
          return i < 0 ? a : a.map((m, k) => (k === i ? answer : m))
        })
        asking.current = false
      })
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    doAsk(input)
  }

  const msgs: AskMsg[] =
    ask.length === 0 && ready && !off ? [{ text: (recEmpty ? recEmptyT1 : '추천 종목에 대해') + ' 궁금한 걸 물어보세요.' }] : ask
  const chips = recEmpty ? ASK_CHIPS_EMPTY : askChips(recs.length)

  const headRight = (
    <span className={styles.headRight}>
      {data?.basisAvailable ? data.subtitle + ' · ' : ''}
      <Link to="/invest#recommend">더보기 ›</Link>
    </span>
  )

  return (
    <Box shadow className={className} title="오늘의 종목" actions={headRight} style={{ zIndex: open !== null ? 20 : undefined }}>
      <div className={styles.gradeLine}>위험등급: 리턴증권 자체 산정 · 1 매우 높은 위험 ~ 6 매우 낮은 위험</div>

      <div className={styles.basisRow} role="group" aria-label="추천 기준">
        {BASES.map(([k, name]) => (
          <button
            key={k}
            type="button"
            className={cx(styles.basisBtn, basis === k && styles.basisBtnOn)}
            aria-pressed={basis === k}
            onClick={() => {
              setBasis(k)
              setOpen(null)
              setAskFocus(null)
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {rec.state === 'loading' && <div className={styles.gradeLine}>추천을 불러오고 있어요…</div>}
      {rec.state === 'unauthorized' && <div className={styles.gradeLine}>로그인이 필요해요. 로그인한 뒤 다시 열어 주세요.</div>}
      {rec.state === 'error' && <div className={styles.gradeLine}>추천을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.</div>}

      {ready && !off && (
        <>
          <div className={styles.cols}>
            {recs.map((r, i) => {
              const isOpen = open === r.ticker
              const q = rec.quotes[r.ticker]
              const info: [string, string][] = [
                ['유형', r.type === 'FUND' ? '펀드·ETF' : '주식'],
                ['업종', r.sectorName ?? '–'],
                ['연 변동성', r.volatilityPercent == null ? '계산 전' : r.volatilityPercent + '%'],
                ['테마', r.themes.length ? r.themes.join(' · ') : '–']
              ]
              return (
                <div key={r.ticker} className={cx(styles.cell, i === 2 && styles.cellLast)}>
                  <button
                    type="button"
                    data-rec-row="1"
                    aria-expanded={isOpen}
                    className={cx(styles.row, isOpen && styles.rowOpen)}
                    onClick={() => {
                      setOpen(isOpen ? null : r.ticker)
                      setAskFocus(r.ticker)
                    }}
                  >
                    <span className={styles.rowTop}>
                      <span className={styles.label}>
                        <InvestStockName code={r.ticker} name={r.name} />
                      </span>
                      <svg className={cx(styles.chevron, isOpen && styles.chevronOpen)} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                    <span className={styles.priceRow}>
                      {q ? (
                        <>
                          <b className={styles.price}>{q.price.toLocaleString('ko-KR')}</b>
                          <span className={cx(styles.chg, tone(q.chg))}>{F.pct(q.chg)}</span>
                        </>
                      ) : (
                        <b className={styles.price}>{Object.prototype.hasOwnProperty.call(rec.quotes, r.ticker) ? '확인 불가' : '…'}</b>
                      )}
                    </span>
                    <span className={styles.gradeText}>{'위험 ' + r.riskGrade + '등급 · ' + (GRADE_WORD[r.riskGrade] ?? '')}</span>
                  </button>

                  {isOpen && (
                    <div role="dialog" aria-label={r.name + ' 추천 상세'} data-rec-pop="1" className={styles.pop}>
                      <div className={styles.popTop}>
                        <img className={styles.face} src={assetUrl('assets/kkiru-ai-face.png')} alt="끼루" />
                        <div className={styles.minw}>
                          <div className={styles.popHead}>추천 이유</div>
                          <ul className={styles.reasons}>
                            {r.reasons.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div>
                        <div className={styles.popHead}>종목 정보</div>
                        <div className={styles.info}>
                          {info.map(([k, v]) => (
                            <div key={k} className={styles.infoRow}>
                              <span className={styles.infoKey}>{k}</span>
                              <b className={styles.infoVal}>{v}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className={styles.risk}>
                        <div className={styles.riskRow}>
                          <span className={styles.infoKey}>위험등급</span>
                          <b className={styles.riskVal}>{r.riskGrade + '등급 ' + (GRADE_WORD[r.riskGrade] ?? '') + ' · 근거 과거 3년 가격 변동'}</b>
                        </div>
                        <div className={styles.riaOk}>RIA 계좌에서 살 수 있어요</div>
                      </div>
                      <div className={styles.popBtns}>
                        {opened && (
                          <button type="button" className={styles.addPkg} onClick={() => addPkg(r.ticker)}>
                            패키지에 담기
                          </button>
                        )}
                        <Link to={'/community?stock=' + r.ticker} className={styles.chat}>종목 채팅방</Link>
                      </div>
                      <div className={styles.popNote}>{'교육용 프로젝트의 자체 분석 결과예요' + (survey?.assessedAt ? ' · 진단일 ' + F.dot(survey.assessedAt.slice(0, 10)) + ' 성향 기준' : '')}</div>
                    </div>
                  )}
                </div>
              )
            })}

            {recEmpty && (
              <div className={styles.empty}>
                <KkiruAvatar profile={profileKey} size={48} />
                <div className={styles.emptyBody}>
                  <div className={styles.emptyT1}>{recEmptyT1}</div>
                  <div className={styles.emptyT2}>{NO_REC_TEXT}</div>
                  <div className={styles.emptyLinks}>
                    <Link to="/myinfo#assess">투자성향 다시 확인하기 ›</Link>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        onAskDeposit?.()
                      }}
                    >
                      예탁금으로 두면 어떻게 되나요? ›
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.askHead}>
            <img className={styles.askFace} src={assetUrl('assets/kkiru-ai-face.png')} alt="" />
            <h3 className={styles.askTitle}>끼루에게 물어보기</h3>
            <div className={styles.askChips}>
              {chips.map((c) => (
                <button key={c} type="button" className={styles.askChip} onClick={() => doAsk(c)}>
                  {c}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.full}
              onClick={() =>
                onOpenFullAsk?.(ask.filter((m) => !('wait' in m && m.wait)).map((m): FullAskMsg => (m.me ? { me: true, text: m.text } : { kk: true, text: m.text, src: '오늘의 종목' })))
              }
            >
              전체 대화 보기 ›
            </button>
          </div>

          <div ref={askRef} className={styles.conv}>
            {msgs.map((m, i) =>
              m.me ? (
                <div key={i} className={styles.meRow}>
                  <span className={styles.me}>{m.text}</span>
                </div>
              ) : (
                <div key={i} className={styles.kk}>
                  <img className={styles.face} src={assetUrl('assets/kkiru-ai-face.png')} alt="끼루" />
                  <div className={styles.bubble}>
                    {m.ai && <span className={styles.aiTag}>AI</span>}
                    {m.wait ? '답을 찾고 있어요…' : m.text}
                    {m.pkg && opened && (
                      <div className={styles.bubbleBtn}>
                        <button type="button" className={styles.bubbleAdd} onClick={() => addPkg(m.pkg as string)}>
                          패키지에 담기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          <form className={styles.form} onSubmit={submit}>
            <input
              className={styles.input}
              value={input}
              maxLength={100}
              onChange={(e) => setInput(e.target.value)}
              placeholder="오늘의 종목에 대해 끼루에게 물어보세요"
              aria-label="추천 종목에 대해 끼루에게 질문"
            />
            <button type="submit" className={styles.send}>
              전송
            </button>
          </form>
          <div className={styles.foot}>{data?.disclaimer ?? REC_DISCLAIMER}</div>
        </>
      )}

      {off && trading && (
        <div className={styles.off}>
          <p className={styles.offMsg}>
            거래 기준 추천은 체결된 매수가 {data?.minBuyCount}건 이상일 때 볼 수 있어요. 지금은 {data?.tradeBuyCount}건이에요.
          </p>
        </div>
      )}

      {off && !trading && (
        <div className={styles.off}>
          <p className={styles.offMsg}>{none ? '투자성향을 진단하면 성향에 맞는 범위 안에서 추천을 받을 수 있어요.' : '진단 유효기간이 지나 추천을 보여드릴 수 없어요.'}</p>
          <Link to="/myinfo#assess" className={styles.offBtn}>{none ? '진단하기' : '다시 진단하기'}</Link>
        </div>
      )}
    </Box>
  )
}
