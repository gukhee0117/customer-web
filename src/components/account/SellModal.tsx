import { useEffect, useState, useSyncExternalStore } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { RETURNS_DATA as RD } from '../../data/returns'
import { cx } from '../common/cx'
import { assetUrl } from '../common/assetUrl'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { StockIcon } from '../common/StockIcon'
import { StockLabel } from '../common/StockLabel'
import { parseInt0 } from './accountApplyData'
import { AskClose } from './ApplyModal'
import {
  KK_FAIL,
  KK_PLACEHOLDER,
  SELL_CONFIRM_NOTE,
  SELL_FOOT_NOTE,
  SELL_NEXT,
  SELL_STEPS,
  clampQty,
  kkParse,
  kkReply,
  moreTitle,
  planView,
  sellRowsView,
  sellSum
} from './accountSellData'
import type { AddedSell, AddedSettle } from './accountSellData'
import styles from './SellModal.module.css'

interface SellModalProps {
  remainingLimit: number | null // 서버 남은 매도 한도(원). 못 받았으면 null
  onClose: () => void
  onGoHist: () => void // 완료 화면의 '내역 보기' → 매도 내역 탭
  onSubmit: (sells: AddedSell[], settle: AddedSettle) => void
}

// 창 너비 1000px 이상이면 종목 칸에 StockLabel, 미만이면 두 줄(원본 sellOne/sellStack)
const WIDE = '(min-width: 1000px)'
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(WIDE).matches
  )
}

const stockColor = (t: string): string => 'var(--stock-' + t.toLowerCase() + ')'

function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// 매도 신청 창(원본 modal sell) — 열릴 때마다 처음 상태로 시작(부모에서 열 때 새로 그림)
export function SellModal({ remainingLimit, onClose, onGoHist, onSubmit }: SellModalProps) {
  const [step, setStep] = useState(0)
  const [sellQ, setSellQ] = useState<Record<string, number>>({})
  const [agree, setAgree] = useState(false)
  const [kkEx, setKkEx] = useState<string[] | null>(null)
  const [kkIn, setKkIn] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const [askClose, setAskClose] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const wide = useWide()

  const rows = sellRowsView(sellQ)
  const picked = rows.filter((r) => r.on)
  const sum = sellSum(rows, remainingLimit)
  const plan = planView(kkEx)
  const nextOn = step === 0 ? sum.total > 0 : step === 1 ? agree : true

  // 입력 중이면 닫기 전에 확인(원본 dirty): 접수 전 단계에서 매도 수량이 하나라도 있을 때
  const dirty = step < 2 && Object.values(sellQ).some((v) => v > 0)
  const reqClose = () => (dirty ? setAskClose(true) : onClose())

  useEffect(() => {
    if (askClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (dirty) setAskClose(true)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [askClose, dirty, onClose])

  const setQ = (t: string, v: number, max: number) => setSellQ((q) => ({ ...q, [t]: clampQty(v, max) }))

  const submit = () => {
    onSubmit(
      picked.map((r) => ({ t: r.t, name: r.name, qty: r.q, amt: r.amtN })),
      { title: moreTitle(picked), amt: sum.total }
    )
    setDone(picked.length + '종목 · ₩' + sum.totalTxt)
    setStep(2)
  }
  const onNext = () => {
    if (!nextOn) return
    if (step === 0) setStep(1)
    else if (step === 1) submit()
    else onClose()
  }
  const onBack = () => (step === 1 ? setStep(0) : onGoHist())

  const sendKk = (e: FormEvent) => {
    e.preventDefault()
    const q = kkIn.trim()
    if (!q) return
    const ex = kkParse(q)
    setKkIn('')
    if (!ex) {
      setReply(KK_FAIL)
      return
    }
    setKkEx(ex)
    setReply(kkReply(ex))
  }

  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) reqClose()
  }

  return (
    <>
      {createPortal(
        <div className={styles.backdrop} onClick={onBackdrop}>
          <div className={styles.panel} role="dialog" aria-modal="true" aria-label="매도 신청">
            <div className={styles.head}>
              <h2 className={styles.title}>매도 신청</h2>
              <span className={styles.steps}>
                {SELL_STEPS.map((label, i) => (
                  <span key={label} className={styles.stepWrap}>
                    {i > 0 && <span className={styles.stepSep}>›</span>}
                    <span className={cx(styles.stepItem, i <= step && styles.stepOn, i === step && styles.stepCur)}>
                      <span className={cx(styles.stepNo, i < step ? styles.stepNoDone : i === step && styles.stepNoCur)}>{i + 1}</span>
                      {label}
                    </span>
                  </span>
                ))}
              </span>
              <span className={styles.headSum}>{sum.head}</span>
              <button type="button" className={styles.close} onClick={reqClose} aria-label="닫기">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {step === 0 && (
              <>
                <div className={styles.cols}>
                  <div className={styles.left}>
                    <div className={styles.secHead}>
                      보유 해외주식<span className={styles.secSub}>평가 ₩{sum.foreign}</span>
                    </div>
                    <div className={cx(styles.sCols, wide && styles.sColsWide, styles.thead)}>
                      <span />
                      <span>종목</span>
                      <span className={styles.right}>보유</span>
                      <span className={styles.center}>매도 수량</span>
                      <span className={styles.right}>매도 금액</span>
                      <span className={styles.right}>차익률</span>
                    </div>
                    {rows.map((r) => (
                      <div key={r.t} className={cx(styles.sCols, wide && styles.sColsWide, styles.sRow, r.on && styles.sRowOn)}>
                        <button
                          type="button"
                          className={cx(styles.cb, r.on && styles.cbOn)}
                          aria-pressed={r.on}
                          aria-label={r.t + ' 선택'}
                          onClick={() => setQ(r.t, r.on ? 0 : r.qty, r.qty)}
                        >
                          <CheckIcon size={12} />
                        </button>
                        <span className={styles.stockCell}>
                          {wide ? (
                            <StockLabel sym={r.t} size="sm" />
                          ) : (
                            <span className={styles.stack}>
                              <StockIcon color={stockColor(r.t)} initial={r.t[0]} size={20} />
                              <span className={styles.stackTxt}>
                                <b className={styles.stackTicker}>{r.t}</b>
                                <span className={styles.stackName}>{r.name}</span>
                              </span>
                            </span>
                          )}
                        </span>
                        <span className={styles.right}>{r.qty}주</span>
                        <span className={styles.stepper}>
                          <button type="button" className={styles.stepBtn} onClick={() => setQ(r.t, r.q - 1, r.qty)} aria-label={r.t + ' 수량 줄이기'}>
                            −
                          </button>
                          <input
                            className={styles.stepInput}
                            value={String(r.q)}
                            onChange={(e) => setQ(r.t, parseInt0(e.target.value), r.qty)}
                            inputMode="numeric"
                            aria-label={r.t + ' 매도 수량'}
                          />
                          <button type="button" className={styles.stepBtn} onClick={() => setQ(r.t, r.q + 1, r.qty)} aria-label={r.t + ' 수량 늘리기'}>
                            +
                          </button>
                        </span>
                        <b className={cx(styles.right, styles.bold)}>{r.amt}</b>
                        <span className={cx(styles.right, styles.up)}>{r.rate}</span>
                      </div>
                    ))}
                    <div className={styles.tableNote}>매도 금액은 현재가 기준 예시예요 · 차익률 높은 순</div>
                  </div>

                  <div className={styles.right2}>
                    <div className={styles.planHead}>
                      <b className={styles.planTitle}>한도를 꽉 채운 안</b>
                      <span className={styles.secSub0}>주 단위로 남은 한도 안에서 공제가 가장 커지는 조합이에요</span>
                    </div>
                    <div className={cx(styles.pCols, styles.pHead)}>
                      <span />
                      <span>종목</span>
                      <span className={styles.right}>수량</span>
                      <span className={styles.right}>금액</span>
                      <span className={styles.right}>차익률</span>
                      <span />
                    </div>
                    {plan.rows.map((r) => (
                      <div key={r.t} className={cx(styles.pCols, styles.pRow)}>
                        <span className={styles.pNo}>{r.n}</span>
                        <span className={styles.stockCell}>
                          <StockLabel sym={r.t} size="sm" />
                        </span>
                        <span className={styles.right}>{r.qty}주</span>
                        <b className={cx(styles.right, styles.bold)}>{r.amt}</b>
                        <span className={cx(styles.right, styles.up)}>{r.rate}</span>
                        {r.partial && <span className={styles.partial}>한도까지만</span>}
                      </div>
                    ))}
                    <div className={styles.planTotal}>
                      <b className={styles.bold}>합계</b>
                      <b className={styles.planTotalAmt}>{plan.total} 원</b>
                    </div>
                    <div className={styles.planGrid}>
                      <div>
                        <div className={styles.planLabel}>예상 공제</div>
                        <div className={cx(styles.planVal, styles.gold)}>{plan.ded} 원</div>
                      </div>
                      <div className={styles.planRight}>
                        <div className={styles.planLabel}>예상 절세</div>
                        <div className={styles.planVal}>약 {plan.save} 원</div>
                      </div>
                    </div>
                    <div className={styles.planRange}>주가·환율 변동 반영 약 {plan.range} · 예시</div>
                    <div className={styles.planBtns}>
                      <button type="button" className={styles.fill} onClick={() => setSellQ(plan.qtys)}>
                        이 안으로 채우기
                      </button>
                      {kkEx && (
                        <button
                          type="button"
                          className={styles.resetPlan}
                          onClick={() => {
                            setKkEx(null)
                            setReply(null)
                          }}
                        >
                          원래 안으로 ›
                        </button>
                      )}
                    </div>
                    <form className={styles.kkForm} onSubmit={sendKk}>
                      <KkiruAvatar profile={RD.CUSTOMER.profile} size={24} />
                      <input
                        className={styles.kkInput}
                        value={kkIn}
                        onChange={(e) => setKkIn(e.target.value.slice(0, 60))}
                        placeholder={KK_PLACEHOLDER}
                        aria-label="끼루에게 조건 말하기"
                      />
                      <button type="submit" className={styles.kkSend}>
                        보내기
                      </button>
                    </form>
                    {reply && (
                      <div className={styles.kkReply}>
                        <img className={styles.kkFace} src={assetUrl('assets/kkiru-ai-face.png')} alt="끼루" />
                        <div className={styles.kkBody}>
                          <div className={styles.kkBubble}>{reply}</div>
                          <div className={styles.kkNote}>끼루는 조건만 알아듣고 계산은 시스템이 해요</div>
                        </div>
                      </div>
                    )}
                    <p className={styles.planFoot}>공제액은 양도차익에 공제율을 곱해 정해져서, 같은 한도라면 차익률이 높은 종목부터 팔 때 공제가 커요. 매도 여부와 시점은 고객님이 결정해요.</p>
                  </div>
                </div>

                <div className={styles.sumBar}>
                  <div className={styles.sumMain}>
                    <div className={styles.sumTrack}>
                      <div className={styles.sumNavy} style={{ width: sum.navyW }} />
                      <div className={styles.sumRed} style={{ left: sum.navyW, width: sum.redW }} />
                    </div>
                    <div className={styles.sumLine}>
                      <span>
                        선택 합계 <b className={styles.sumTotal}>₩{sum.totalTxt}</b>
                      </span>
                      <span className={styles.sumItem}>
                        남은 한도 <b className={styles.sumB}>₩{sum.left}</b>
                      </span>
                      <span className={styles.sumItem}>
                        예상 양도차익 <b className={styles.sumB}>₩{sum.gain}</b>
                      </span>
                      <span className={styles.sumItem}>
                        예상 공제액 <b className={styles.sumB}>₩{sum.ded}</b>
                      </span>
                      <span className={styles.sumItem}>
                        예상 절세액 <b className={styles.sumSave}>₩{sum.save}</b>
                      </span>
                    </div>
                    {sum.over && <div className={styles.overMsg}>{sum.overMsg}</div>}
                  </div>
                  <button type="button" className={cx(styles.nextWide, nextOn && styles.nextOn)} disabled={!nextOn} onClick={onNext}>
                    다음
                  </button>
                </div>
              </>
            )}

            {step === 1 && (
              <div className={styles.pane}>
                <div className={styles.confirm}>
                  <div>
                    <div className={cx(styles.cCols, styles.cHead)}>
                      <span>종목</span>
                      <span className={styles.right}>수량</span>
                      <span className={styles.right}>금액</span>
                    </div>
                    {picked.map((r) => (
                      <div key={r.t} className={cx(styles.cCols, styles.cRow)}>
                        <span className={styles.stockCell}>
                          <StockLabel sym={r.t} size="sm" />
                        </span>
                        <span className={styles.right}>{r.q}주</span>
                        <b className={cx(styles.right, styles.bold)}>₩{r.amt}</b>
                      </div>
                    ))}
                    <div className={cx(styles.cCols, styles.cSum)}>
                      <b className={styles.bold}>합계</b>
                      <span />
                      <b className={cx(styles.right, styles.sumBold)}>₩{sum.totalTxt}</b>
                    </div>
                  </div>
                  {sum.over && <div className={styles.overMsg2}>{sum.overMsg}</div>}
                  <p className={styles.confirmNote}>{SELL_CONFIRM_NOTE}</p>
                  <button type="button" className={styles.agree} aria-pressed={agree} onClick={() => setAgree(!agree)}>
                    <span className={cx(styles.cb, agree && styles.cbOn)}>
                      <CheckIcon size={12} />
                    </span>
                    위 내용을 확인했어요
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={styles.pane2}>
                <div className={styles.doneWrap}>
                  <div className={styles.done}>
                    <span className={styles.doneIcon}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <h3 className={styles.doneTitle}>신청이 접수됐어요</h3>
                    <div className={styles.doneSum}>{done}</div>
                  </div>
                  <div>
                    <div className={styles.nextHead}>다음에 일어날 일</div>
                    {SELL_NEXT.map((text, i) => (
                      <div key={i} className={styles.nextRow}>
                        <span className={styles.nextNo}>{i + 1}</span>
                        <span className={styles.nextTxt}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step > 0 && (
              <div className={styles.foot}>
                <div className={styles.footIn}>
                  <button type="button" className={styles.back} onClick={onBack}>
                    {step === 1 ? '이전' : '내역 보기'}
                  </button>
                  <button type="button" className={cx(styles.next, nextOn && styles.nextOn)} disabled={!nextOn} onClick={onNext}>
                    {step === 1 ? '신청하기' : '닫기'}
                  </button>
                </div>
              </div>
            )}
            <div className={styles.note}>{SELL_FOOT_NOTE}</div>
          </div>
        </div>,
        document.body
      )}
      {askClose && <AskClose onKeep={() => setAskClose(false)} onLeave={onClose} />}
    </>
  )
}
