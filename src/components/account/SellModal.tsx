import { useEffect, useState, useSyncExternalStore } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { apiErrorMessage } from '../../api/client'
import { placeSellOrder } from '../../api/sellGuide'
import type { SellGuide } from '../../api/sellGuide'
import { F } from '../../lib/calc'
import { cx } from '../common/cx'
import { StockIcon } from '../common/StockIcon'
import { parseInt0 } from './accountApplyData'
import { AskClose } from './ApplyModal'
import { SELL_CONFIRM_NOTE, SELL_FOOT_NOTE, SELL_NEXT, SELL_STEPS, clampQty, planView, sellRowsView, sellSum } from './accountSellData'
import type { SellSubmitResult } from './accountSellData'
import type { ServerState } from './useServerData'
import styles from './SellModal.module.css'

interface SellModalProps {
  guide: ServerState<SellGuide> // 서버 매도 가이드(보유 종목·추천 안)
  onRetryGuide: () => void
  remainingLimit: number | null // 서버 남은 매도 한도(원). 못 받았으면 null
  onClose: () => void
  onGoHist: () => void // 완료 화면의 '내역 보기' → 매도 내역 탭
  onSubmitted: (results: SellSubmitResult[]) => void // 종목별 제출이 모두 끝난 뒤
}

// 창 너비 1000px 이상이면 표 열을 넓게(원본 sellOne/sellStack)
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

const stockColor = (t: string): string => 'var(--stock-' + t.toLowerCase() + ', var(--color-muted))'

// 서버 종목(티커·이름) 칸 — 마스터에 없는 종목도 이름이 보이게 아이콘 + 티커 + 이름
function StockCell({ t, name }: { t: string; name: string }) {
  return (
    <span className={styles.stack}>
      <StockIcon color={stockColor(t)} initial={t[0]} size={20} />
      <span className={styles.stackTxt}>
        <b className={styles.stackTicker}>{t}</b>
        <span className={styles.stackName}>{name}</span>
      </span>
    </span>
  )
}

const RESULT_TEXT = (r: SellSubmitResult): string =>
  r.status === 'EXECUTED' ? '체결 · ₩' + F.won(r.amount ?? 0) : r.status === 'REJECTED' ? '한도 초과로 거부됐어요' : (r.message ?? '접수하지 못했어요')

function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// 매도 신청 창(원본 modal sell) — 열릴 때마다 처음 상태로 시작(부모에서 열 때 새로 그림)
export function SellModal({ guide, onRetryGuide, remainingLimit, onClose, onGoHist, onSubmitted }: SellModalProps) {
  const [step, setStep] = useState(0)
  const [sellQ, setSellQ] = useState<Record<number, number>>({})
  const [agree, setAgree] = useState(false)
  const [askClose, setAskClose] = useState(false)
  const [results, setResults] = useState<SellSubmitResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const wide = useWide()

  const g = guide.status === 'live' ? guide.data : null
  const products = g?.products ?? []
  const rows = sellRowsView(products, sellQ)
  const picked = rows.filter((r) => r.on)
  const sum = sellSum(rows, products, remainingLimit, g?.periodLabel ?? null)
  const plan = g ? planView(g) : null
  const okCount = results.filter((r) => r.status === 'EXECUTED').length
  const doneTitle = okCount === results.length ? '매도 주문이 체결됐어요' : okCount === 0 ? '매도 주문이 처리되지 않았어요' : '일부만 체결됐어요'
  const nextOn = step === 0 ? picked.length > 0 : step === 1 ? agree && !submitting : true

  // 입력 중이면 닫기 전에 확인(원본 dirty): 접수 전 단계에서 매도 수량이 하나라도 있을 때
  const dirty = step < 2 && Object.values(sellQ).some((v) => v > 0)
  const reqClose = () => (submitting ? undefined : dirty ? setAskClose(true) : onClose())

  useEffect(() => {
    if (askClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || submitting) return
      if (dirty) setAskClose(true)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [askClose, dirty, submitting, onClose])

  const setQ = (id: number, v: number, max: number) => setSellQ((q) => ({ ...q, [id]: clampQty(v, max) }))

  // 종목마다 따로 보낸다(부분 성공). 한 종목이 실패해도 나머지는 계속 보낸다
  const submit = async () => {
    setSubmitting(true)
    const out: SellSubmitResult[] = []
    for (const r of picked) {
      try {
        const res = await placeSellOrder(r.id, r.q)
        out.push({ t: r.t, qty: r.q, status: res.status, amount: res.totalAmount, message: null })
      } catch (e) {
        out.push({ t: r.t, qty: r.q, status: 'FAILED', amount: null, message: apiErrorMessage(e, '접수하지 못했어요') })
      }
    }
    setResults(out)
    setSubmitting(false)
    setStep(2)
    onSubmitted(out)
  }
  const onNext = () => {
    if (!nextOn) return
    if (step === 0) setStep(1)
    else if (step === 1) void submit()
    else onClose()
  }
  const onBack = () => (step === 1 ? setStep(0) : onGoHist())

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
                      보유 해외주식<span className={styles.secSub}>평가 {sum.foreign}</span>
                    </div>
                    <div className={cx(styles.sCols, wide && styles.sColsWide, styles.thead)}>
                      <span />
                      <span>종목</span>
                      <span className={styles.right}>보유</span>
                      <span className={styles.center}>매도 수량</span>
                      <span className={styles.right}>매도 금액</span>
                      <span className={styles.right}>차익률</span>
                    </div>
                    {(guide.status !== 'live' || products.length === 0) && (
                      <div className={styles.tableNote}>
                        {guide.status === 'loading' ? '보유 종목을 불러오는 중…' : guide.status === 'error' ? '보유 종목을 불러오지 못했어요' : '매도할 수 있는 보유 종목이 없어요'}
                        {guide.status === 'error' && (
                          <>
                            {' '}
                            <button type="button" className={styles.fill} onClick={onRetryGuide}>
                              다시 시도
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {rows.map((r) => (
                      <div key={r.id} className={cx(styles.sCols, wide && styles.sColsWide, styles.sRow, r.on && styles.sRowOn)}>
                        <button
                          type="button"
                          className={cx(styles.cb, r.on && styles.cbOn)}
                          aria-pressed={r.on}
                          aria-label={r.t + ' 선택'}
                          onClick={() => setQ(r.id, r.on ? 0 : r.qty, r.qty)}
                        >
                          <CheckIcon size={12} />
                        </button>
                        <span className={styles.stockCell}>
                          <StockCell t={r.t} name={r.name} />
                        </span>
                        <span className={styles.right}>{r.qty}주</span>
                        <span className={styles.stepper}>
                          <button type="button" className={styles.stepBtn} onClick={() => setQ(r.id, r.q - 1, r.qty)} aria-label={r.t + ' 수량 줄이기'}>
                            −
                          </button>
                          <input
                            className={styles.stepInput}
                            value={String(r.q)}
                            onChange={(e) => setQ(r.id, parseInt0(e.target.value), r.qty)}
                            inputMode="numeric"
                            aria-label={r.t + ' 매도 수량'}
                          />
                          <button type="button" className={styles.stepBtn} onClick={() => setQ(r.id, r.q + 1, r.qty)} aria-label={r.t + ' 수량 늘리기'}>
                            +
                          </button>
                        </span>
                        <b className={cx(styles.right, styles.bold)}>{r.amt}</b>
                        <span className={cx(styles.right, styles.up)}>{r.rate}</span>
                      </div>
                    ))}
                    <div className={styles.tableNote}>매도 금액은 전일 종가 기준 예상이에요 · 추천 종목 먼저</div>
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
                    {plan && plan.rows.length === 0 && (
                      <div className={styles.tableNote}>{products.some((p) => p.currentPriceKrw == null) ? '시세·환율을 받지 못한 종목이 있어 추천할 수 없어요' : '지금 추천할 종목이 없어요'}</div>
                    )}
                    {plan?.rows.map((r) => (
                      <div key={r.id} className={cx(styles.pCols, styles.pRow)}>
                        <span className={styles.pNo}>{r.n}</span>
                        <span className={styles.stockCell}>
                          <StockCell t={r.t} name={products.find((p) => p.foreignProductId === r.id)?.productName ?? ''} />
                        </span>
                        <span className={styles.right}>{r.qty}주</span>
                        <b className={cx(styles.right, styles.bold)}>{r.amt}</b>
                        <span className={cx(styles.right, styles.up)}>{r.rate}</span>
                        {r.partial && <span className={styles.partial}>한도까지만</span>}
                      </div>
                    ))}
                    <div className={styles.planTotal}>
                      <b className={styles.bold}>합계</b>
                      <b className={styles.planTotalAmt}>{plan?.total ?? '-'} 원</b>
                    </div>
                    <div className={styles.planGrid}>
                      <div>
                        <div className={styles.planLabel}>예상 공제(가중 차익)</div>
                        <div className={cx(styles.planVal, styles.gold)}>{plan?.ded ?? '-'} 원</div>
                      </div>
                      <div className={styles.planRight}>
                        <div className={styles.planLabel}>예상 절세</div>
                        <div className={styles.planVal}>약 {plan?.save ?? '-'} 원</div>
                      </div>
                    </div>
                    <div className={styles.planBtns}>
                      <button type="button" className={styles.fill} disabled={!plan || plan.rows.length === 0} onClick={() => plan && setSellQ(plan.qtys)}>
                        이 안으로 채우기
                      </button>
                    </div>
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
                        선택 합계 <b className={styles.sumTotal}>{sum.totalTxt}</b>
                      </span>
                      <span className={styles.sumItem}>
                        남은 한도 <b className={styles.sumB}>{sum.left}</b>
                      </span>
                      <span className={styles.sumItem}>
                        예상 양도차익 <b className={styles.sumB}>{sum.gain}</b>
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
                      <div key={r.id} className={cx(styles.cCols, styles.cRow)}>
                        <span className={styles.stockCell}>
                          <StockCell t={r.t} name={r.name} />
                        </span>
                        <span className={styles.right}>{r.q}주</span>
                        <b className={cx(styles.right, styles.bold)}>{r.amtN == null ? r.amt : '₩' + r.amt}</b>
                      </div>
                    ))}
                    <div className={cx(styles.cCols, styles.cSum)}>
                      <b className={styles.bold}>합계</b>
                      <span />
                      <b className={cx(styles.right, styles.sumBold)}>{sum.totalTxt}</b>
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
                    <h3 className={styles.doneTitle}>{doneTitle}</h3>
                    <div className={styles.doneSum}>
                      {results.map((r) => (
                        <div key={r.t}>
                          {r.t} {r.qty}주 · {RESULT_TEXT(r)}
                        </div>
                      ))}
                    </div>
                  </div>
                  {results.some((r) => r.status === 'EXECUTED') && (
                    <div>
                      <div className={styles.nextHead}>다음에 일어날 일</div>
                      {SELL_NEXT.map((text, i) => (
                        <div key={i} className={styles.nextRow}>
                          <span className={styles.nextNo}>{i + 1}</span>
                          <span className={styles.nextTxt}>{text}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
                    {step === 1 ? (submitting ? '접수 중…' : '신청하기') : '닫기'}
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
