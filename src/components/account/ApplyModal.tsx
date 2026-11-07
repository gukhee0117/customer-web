import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { F } from '../../lib/calc'
import { cx } from '../common/cx'
import { StockLabel } from '../common/StockLabel'
import { ModalFrame } from './ModalFrame'
import { IN_NEXT, IN_SUBMIT_NOTE, LIMIT_MAX, LIMIT_MIN, SUBMIT_NOTE, applyConfig, clampLimit, openValues, outNext, parseInt0 } from './accountApplyData'
import type { ApplyKind } from './accountApplyData'
import type { HistTab } from './accountHistData'
import styles from './ApplyModal.module.css'
import { apiErrorMessage } from '../../api/client'
import {
  getForeignProducts,
  getInboundCandidates,
  submitInbound,
} from '../../api/inbound'
import type { ForeignProduct, InboundCandidate } from '../../api/inbound'
import {
  getGeneralAccounts,
  getWithdrawalAvailability,
  submitWithdrawal,
} from '../../api/withdrawal'
import type { GeneralAccount, WithdrawalAvailability } from '../../api/withdrawal'

// ---- 결과 타입 ----

export interface SubmittedInboundResult {
  ticker: string
  status: 'ok' | 'failed' | 'unknown'
  requestedQty?: number
  approvedQty?: number
  partialReason?: string | null
  failReason?: string
}

// ---- 내부 타입 ----

type CandidateResult =
  | { status: 'ok'; candidates: InboundCandidate[] }
  | { status: 'error' }

interface ApplyModalProps {
  kind: ApplyKind
  linkedText: string // 연결 일반계좌 한 줄(서버)
  riaAccountNo: string // RIA 계좌번호(서버, 개설 전이면 '-')
  onClose: () => void
  onGoHist: (tab: HistTab) => void
  onSubmitIn: (results: SubmittedInboundResult[]) => void
  onSubmitOut: (amt: number) => void
  onFinishOpen: () => void
}

interface DoneInfo {
  title?: string
  sum: string
  next: string[]
}

// ---- 헬퍼 ----

function isHttpStatus(e: unknown, code: number): boolean {
  return (e as { response?: { status?: number } })?.response?.status === code
}

function isAmbiguous(e: unknown): boolean {
  const s = (e as { response?: { status?: number } })?.response?.status
  return s == null || s >= 500
}

function daysUntil(dateStr: string, asOf: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - new Date(asOf).getTime()) / 86400000))
}

function normalizeQty(v: string): string {
  const cleaned = v.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace('.', '').slice(0, 4)
}

// ---- 하위 컴포넌트 ----

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function Box({ on }: { on: boolean }) {
  return (
    <span className={cx(styles.cb, on && styles.cbOn)}>
      <CheckIcon />
    </span>
  )
}

function DoneView({ title, sum, next }: { title: string; sum: string; next: string[] }) {
  return (
    <>
      <div className={styles.done}>
        <span className={styles.doneIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h3 className={styles.doneTitle}>{title}</h3>
        <div className={styles.doneSum}>{sum}</div>
      </div>
      {next.length > 0 && (
        <div>
          <div className={styles.nextHead}>다음에 일어날 일</div>
          {next.map((text, i) => (
            <div key={i} className={styles.nextRow}>
              <span className={styles.nextNo}>{i + 1}</span>
              <span className={styles.nextTxt}>{text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ---- 메인 ----

export function ApplyModal({ kind, linkedText, riaAccountNo, onClose, onGoHist, onSubmitIn, onSubmitOut, onFinishOpen }: ApplyModalProps) {
  const [step, setStep] = useState(0)
  const [inQ, setInQ] = useState<Record<string, string>>({})
  const [outAmt, setOutAmt] = useState('')
  const [outAgree, setOutAgree] = useState(false)
  const [opLimit, setOpLimit] = useState<number | null>(null)
  const [opAgree, setOpAgree] = useState(false)
  const [askClose, setAskClose] = useState(false)
  const [done, setDone] = useState<DoneInfo | null>(null)

  // 공통
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 입고 API 상태
  const [products, setProducts] = useState<ForeignProduct[]>([])
  const [candidateMap, setCandidateMap] = useState<Record<number, CandidateResult>>({})
  const [srcPick, setSrcPick] = useState<Record<string, number>>({})
  const [inDoneResults, setInDoneResults] = useState<SubmittedInboundResult[] | null>(null)
  const [inDoneSkipped, setInDoneSkipped] = useState(0)

  // 인출 API 상태
  const [availability, setAvailability] = useState<WithdrawalAvailability | null>(null)
  const [destAccounts, setDestAccounts] = useState<GeneralAccount[]>([])
  const [destId, setDestId] = useState<number | null>(null)

  // ---- 입고 fetch ----
  useEffect(() => {
    if (kind !== 'in') return
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    setProducts([])
    setCandidateMap({})
    getForeignProducts()
      .then(async (prods) => {
        if (cancelled) return
        setProducts(prods)
        if (prods.length === 0) return
        const results = await Promise.allSettled(
          prods.map((p) => getInboundCandidates(p.foreignProductId)),
        )
        if (cancelled) return
        const map: Record<number, CandidateResult> = {}
        const initSrc: Record<string, number> = {}
        results.forEach((r, i) => {
          const id = prods[i].foreignProductId
          if (r.status === 'fulfilled') {
            map[id] = { status: 'ok', candidates: r.value }
            if (r.value.length >= 2) {
              initSrc[String(id)] = r.value[0].sourceGeneralAccountId
            }
          } else {
            map[id] = { status: 'error' }
          }
        })
        setCandidateMap(map)
        setSrcPick(initSrc)
      })
      .catch(() => {
        if (!cancelled) setFetchError('조회 중 오류가 발생했어요. 다시 시도해 주세요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [kind, fetchKey])

  // ---- 인출 fetch ----
  useEffect(() => {
    if (kind !== 'out') return
    let cancelled = false
    setOutAgree(false)
    setLoading(true)
    setFetchError(null)
    setAvailability(null)
    setDestAccounts([])
    setDestId(null)
    Promise.all([getWithdrawalAvailability(), getGeneralAccounts()])
      .then(([avail, accounts]) => {
        if (cancelled) return
        setAvailability(avail)
        setDestAccounts(accounts)
        if (accounts.length > 0) setDestId(accounts[0].generalAccountId)
      })
      .catch(() => {
        if (!cancelled) setFetchError('조회 중 오류가 발생했어요. 다시 시도해 주세요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [kind, fetchKey])

  const retry = () => {
    setFetchError(null)
    if (kind === 'out') setOutAgree(false)
    setFetchKey((k) => k + 1)
  }

  const cfg = applyConfig(kind, linkedText, riaAccountNo)
  const isOpen = kind === 'open'
  const last = cfg.steps.length - 1

  // ---- 입고 계산 ----

  interface InApiRow {
    foreignProductId: number
    ticker: string
    candidates: InboundCandidate[]
    activeCand: InboundCandidate
    sel: boolean
    qv: string
    qFloat: number
    overAvail: boolean
  }

  // 로드된 종목 중 후보가 있는 것만 행으로 표시
  const inApiRows: InApiRow[] = products.flatMap((p) => {
    const cr = candidateMap[p.foreignProductId]
    if (!cr || cr.status !== 'ok' || cr.candidates.length === 0) return []
    const key = String(p.foreignProductId)
    const sel = Object.prototype.hasOwnProperty.call(inQ, key)
    const qv = sel ? (inQ[key] ?? '') : ''
    const qFloat = parseFloat(qv) || 0
    const activeCand =
      cr.candidates.length === 1
        ? cr.candidates[0]
        : (cr.candidates.find((c) => c.sourceGeneralAccountId === srcPick[key]) ?? cr.candidates[0])
    return [{
      foreignProductId: p.foreignProductId,
      ticker: p.ticker,
      candidates: cr.candidates,
      activeCand,
      sel,
      qv,
      qFloat,
      overAvail: sel && qFloat > 0 && qFloat > activeCand.estimatedAvailableQty,
    }]
  })

  const inErrorProducts = products.filter((p) => candidateMap[p.foreignProductId]?.status === 'error')
  const inEmptyProducts = products.filter((p) => {
    const cr = candidateMap[p.foreignProductId]
    return cr?.status === 'ok' && (cr as { status: 'ok'; candidates: InboundCandidate[] }).candidates.length === 0
  })

  // 제출할 항목 — 선택되고 수량이 유효한 것
  const pickedSubmitItems = inApiRows
    .filter((r) => r.sel && r.qFloat > 0)
    .map((r) => ({
      foreignProductId: r.foreignProductId,
      ticker: r.ticker,
      sourceGeneralAccountId:
        r.candidates.length === 1
          ? r.candidates[0].sourceGeneralAccountId
          : srcPick[String(r.foreignProductId)],
      requestedQty: r.qv,
    }))
    .filter((item) => item.sourceGeneralAccountId != null)

  // ---- 인출 계산 ----
  const oAmt = parseInt0(outAmt)
  const avail = availability
  const earnings = avail ? avail.earningsAmount : 0
  const maturedPrincipal = avail
    ? avail.leftAmounts.filter((la) => la.matured).reduce((s, la) => s + la.curAmount, 0)
    : 0
  const noDest = destAccounts.length === 0
  const oRisky = !!avail && oAmt > avail.withdrawableWithoutPenalty
  const oTooMuch = !!avail && oAmt > avail.requestableAmount
  const oOk =
    !!avail && oAmt > 0 && !oTooMuch && (!oRisky || outAgree) && !noDest && destId != null
  const selectedDest = destAccounts.find((a) => a.generalAccountId === destId)
  const destLabel = selectedDest ? selectedDest.accountNo : '—'

  // 계좌 개설
  const ov = openValues(linkedText, riaAccountNo)
  const opLim = opLimit == null ? ov.defaultLimit : opLimit
  const opTot = opLim + ov.other
  const opOver = opTot > LIMIT_MAX
  const bar = {
    navy: ((Math.min(opTot, LIMIT_MAX) / Math.max(opTot, LIMIT_MAX)) * 100).toFixed(2) + '%',
    red: ((Math.max(0, opTot - LIMIT_MAX) / Math.max(opTot, LIMIT_MAX)) * 100).toFixed(2) + '%',
  }

  const nextOn = isOpen
    ? step === 1 ? !opOver : step === 2 ? opAgree : true
    : step === 0
      ? kind === 'in'
        ? pickedSubmitItems.length > 0 && !loading
        : oOk && !loading
      : !submitting

  const dirty =
    step < 2 &&
    (kind === 'in'
      ? Object.keys(inQ).length > 0
      : kind === 'out'
        ? !!outAmt
        : false)
  const reqClose = () => (dirty ? setAskClose(true) : onClose())

  const submit = async () => {
    if (kind === 'open') {
      setStep(3)
      return
    }
    if (kind === 'in') {
      if (submitLock.current) return
      submitLock.current = true
      setSubmitting(true)
      setSubmitError(null)
      const results: SubmittedInboundResult[] = []
      let auth401 = false
      try {
        for (const item of pickedSubmitItems) {
          try {
            const res = await submitInbound({
              foreignProductId: item.foreignProductId,
              sourceGeneralAccountId: item.sourceGeneralAccountId,
              requestedQty: item.requestedQty,
            })
            results.push({
              ticker: res.ticker,
              status: 'ok',
              requestedQty: res.requestedQty,
              approvedQty: res.approvedQty,
              partialReason: res.partialReason,
            })
          } catch (e) {
            if (isHttpStatus(e, 401)) { auth401 = true; break }
            results.push(
              isAmbiguous(e)
                ? { ticker: item.ticker, status: 'unknown' }
                : { ticker: item.ticker, status: 'failed', failReason: apiErrorMessage(e, '처리 중 오류가 발생했어요') },
            )
          }
        }
      } finally {
        submitLock.current = false
        setSubmitting(false)
      }
      if (auth401 && results.length === 0) {
        setSubmitError('로그인이 만료됐어요. 다시 로그인해 주세요.')
      } else {
        setInDoneSkipped(auth401 ? pickedSubmitItems.length - results.length : 0)
        setInDoneResults(results)
        onSubmitIn(results)
        setStep(2)
      }
    } else {
      // kind === 'out'
      if (!avail || destId == null) return
      setSubmitting(true)
      setSubmitError(null)
      try {
        await submitWithdrawal({
          requestedAmount: oAmt,
          destinationGeneralAccountId: destId,
          earlyWithdrawalAgreed: outAgree,
        })
        setDone({ sum: '₩' + F.won(oAmt) + ' → ' + destLabel, next: outNext(oRisky) })
        onSubmitOut(oAmt)
        setStep(2)
      } catch (e) {
        if (isAmbiguous(e)) {
          setDone({ title: '처리 여부를 확인해 주세요', sum: '인출 내역에서 직접 확인해 주세요', next: [] })
          setStep(2)
        } else {
          setSubmitError(apiErrorMessage(e, '신청 중 오류가 발생했어요'))
        }
      } finally {
        setSubmitting(false)
      }
    }
  }

  const backLabel = step === 0 ? '취소' : step < last ? '이전' : isOpen ? '닫기' : '내역 보기'
  const nextLabel =
    step < last - 1 ? '다음' : step === last - 1 ? (submitting ? '처리 중...' : '신청하기') : '닫기'
  const onBack = () => {
    if (step === 0) reqClose()
    else if (step < last) setStep(step - 1)
    else if (isOpen) onFinishOpen()
    else if (cfg.histTab) onGoHist(cfg.histTab)
  }
  const onNext = () => {
    if (!nextOn) return
    if (step < last - 1) setStep(step + 1)
    else if (step === last - 1) void submit()
    else if (isOpen) onFinishOpen()
    else onClose()
  }

  const stepBar = (
    <div className={styles.steps}>
      {cfg.steps.map((label, i) => (
        <span key={label} className={styles.stepWrap}>
          {i > 0 && <span className={styles.stepSep}>›</span>}
          <span className={cx(styles.stepItem, i <= step && styles.stepOn, i === step && styles.stepCur)}>
            <span className={cx(styles.stepNo, i < step ? styles.stepNoDone : i === step && styles.stepNoCur)}>{i + 1}</span>
            {label}
          </span>
        </span>
      ))}
    </div>
  )

  let body: ReactNode = null

  // ---- 입고 ----
  if (kind === 'in' && step === 0) {
    body = (
      <div>
        {loading && <div className={styles.loading}>불러오는 중...</div>}
        {fetchError && !loading && (
          <div className={styles.fetchErr}>
            <span>{fetchError}</span>
            <button type="button" className={styles.retryBtn} onClick={retry}>다시 시도</button>
          </div>
        )}
        {!loading && !fetchError && products.length > 0 && (
          <>
            <div className={styles.secTitle}>일반계좌의 해외주식</div>
            <div className={cx(styles.inCols, styles.thead)}>
              <span />
              <span>종목</span>
              <span className={styles.right}>기준일 수량</span>
              <span className={styles.right}>예상 입고 가능</span>
              <span className={styles.right}>신청 수량</span>
            </div>
            {inApiRows.map((r) => {
              const key = String(r.foreignProductId)
              return (
                <div key={r.foreignProductId} className={styles.line}>
                  <div className={cx(styles.inCols, styles.inRow)}>
                    <button
                      type="button"
                      className={styles.cbBtn}
                      aria-pressed={r.sel}
                      aria-label={r.ticker + ' 선택'}
                      onClick={() =>
                        setInQ((q) => {
                          const n = { ...q }
                          if (Object.prototype.hasOwnProperty.call(n, key)) delete n[key]
                          else n[key] = String(r.activeCand.estimatedAvailableQty)
                          return n
                        })
                      }
                    >
                      <Box on={r.sel} />
                    </button>
                    <span className={styles.stockCell}>
                      <StockLabel sym={r.ticker} size="sm" />
                      {r.candidates.length >= 2 && (
                        <select
                          className={styles.srcSelect}
                          value={srcPick[key] ?? r.candidates[0].sourceGeneralAccountId}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setSrcPick((s) => ({ ...s, [key]: v }))
                          }}
                          aria-label={r.ticker + ' 출처 계좌'}
                        >
                          {r.candidates.map((c) => (
                            <option key={c.sourceGeneralAccountId} value={c.sourceGeneralAccountId}>
                              {c.brokerName} {c.accountNo}
                            </option>
                          ))}
                        </select>
                      )}
                      {r.candidates.length === 1 && (
                        <span className={styles.srcNote}>{r.candidates[0].brokerName} {r.candidates[0].accountNo}</span>
                      )}
                    </span>
                    <span className={styles.right}>{r.activeCand.snapshotQty}주</span>
                    <b className={cx(styles.right, styles.bold)}>{r.activeCand.estimatedAvailableQty}주</b>
                    <span className={styles.qtyCell}>
                      <input
                        className={cx(styles.qtyInput, r.overAvail && styles.qtyOver)}
                        value={r.qv}
                        onChange={(e) => {
                          const v = normalizeQty(e.target.value)
                          setInQ((q) => ({ ...q, [key]: v }))
                        }}
                        disabled={!r.sel}
                        inputMode="decimal"
                        aria-label={r.ticker + ' 신청 수량'}
                        placeholder="0"
                      />
                      <span className={styles.unit}>주</span>
                    </span>
                  </div>
                  {r.overAvail && (
                    <div className={styles.overBox}>
                      <div className={styles.overMsg}>{r.activeCand.estimatedAvailableQty}주까지 신청할 수 있어요</div>
                    </div>
                  )}
                </div>
              )
            })}
            {inEmptyProducts.length > 0 && (
              <div className={styles.note}>
                {inEmptyProducts.map((p) => p.ticker).join(', ')} — 입고 가능한 수량이 없어요
              </div>
            )}
            {inErrorProducts.length > 0 && (
              <div className={styles.fetchErr}>
                {inErrorProducts.map((p) => p.ticker).join(', ')} — 조회 실패
                <button type="button" className={styles.retryBtn} onClick={retry}>전체 재시도</button>
              </div>
            )}
          </>
        )}
        {!loading && !fetchError && products.length === 0 && Object.keys(candidateMap).length > 0 && (
          <div className={styles.note}>입고 가능한 해외주식이 없어요</div>
        )}
      </div>
    )
  } else if (kind === 'in' && step === 1) {
    body = (
      <div>
        <div className={cx(styles.confCols, styles.thead)}>
          <span>종목</span>
          <span>출처 계좌</span>
          <span className={styles.right}>신청 수량</span>
        </div>
        {pickedSubmitItems.map((item) => {
          const row = inApiRows.find((r) => r.foreignProductId === item.foreignProductId)
          const cand = row?.candidates.find((c) => c.sourceGeneralAccountId === item.sourceGeneralAccountId)
          return (
            <div key={item.foreignProductId} className={cx(styles.confCols, styles.confRow)}>
              <span className={styles.stockCell}>
                <StockLabel sym={item.ticker} size="sm" />
              </span>
              <span className={styles.sub}>{cand ? cand.brokerName + ' ' + cand.accountNo : ''}</span>
              <span className={styles.right}><b className={styles.bold}>{item.requestedQty}주</b></span>
            </div>
          )
        })}
        {submitError && <div className={styles.fetchErr}>{submitError}</div>}
        <p className={styles.submitNote}>{IN_SUBMIT_NOTE}</p>
      </div>
    )
  } else if (kind === 'in' && step === 2 && inDoneResults) {
    const inDoneTitle = inDoneResults.every((r) => r.status === 'ok')
      ? '입고 신청 완료'
      : inDoneResults.every((r) => r.status === 'failed')
        ? '신청이 처리되지 않았어요'
        : '처리 여부를 확인해 주세요'
    body = (
      <>
        <div className={styles.done}>
          <span className={styles.doneIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h3 className={styles.doneTitle}>{inDoneTitle}</h3>
        </div>
        <div>
          {inDoneResults.map((r, i) => (
            <div key={i} className={styles.nextRow}>
              <span className={styles.nextTxt}>
                {r.status === 'ok' && !r.partialReason && (
                  <b>{r.ticker} {r.approvedQty}주 입고 신청 완료</b>
                )}
                {r.status === 'ok' && r.partialReason && (
                  <><b>{r.ticker}</b>: 신청 {r.requestedQty}주 · 승인 {r.approvedQty}주</>
                )}
                {r.status === 'failed' && (
                  <><b>{r.ticker}</b> 처리 실패 — {r.failReason}</>
                )}
                {r.status === 'unknown' && (
                  <><b>{r.ticker}</b> 처리 여부를 확인해 주세요 · 입고 내역에서 확인 가능</>
                )}
              </span>
            </div>
          ))}
        </div>
        {inDoneSkipped > 0 && (
          <div className={styles.fetchErr}>
            로그인이 만료됐어요. {inDoneSkipped}개 종목은 신청되지 않았어요. 다시 로그인 후 시도해 주세요.
          </div>
        )}
        <div>
          <div className={styles.nextHead}>다음에 일어날 일</div>
          {IN_NEXT.map((text, i) => (
            <div key={i} className={styles.nextRow}>
              <span className={styles.nextNo}>{i + 1}</span>
              <span className={styles.nextTxt}>{text}</span>
            </div>
          ))}
        </div>
      </>
    )

  // ---- 인출 ----
  } else if (kind === 'out' && step === 0) {
    body = (
      <>
        {loading && <div className={styles.loading}>불러오는 중...</div>}
        {fetchError && !loading && (
          <div className={styles.fetchErr}>
            <span>{fetchError}</span>
            <button type="button" className={styles.retryBtn} onClick={retry}>다시 시도</button>
          </div>
        )}
        {!loading && !fetchError && avail && (
          <>
            <div>
              <div className={styles.outLabel}>지금 바로 인출할 수 있는 금액</div>
              <div className={styles.outNow}>₩{F.won(avail.withdrawableWithoutPenalty)}</div>
              <div className={styles.outLabel2}>1년이 지난 납입금 {F.won(maturedPrincipal)}원 + 수익 초과분 {F.won(earnings)}원</div>
            </div>
            <div>
              <div className={cx(styles.payCols, styles.payHead)}>
                <span>납입일</span>
                <span className={styles.right}>금액</span>
                <span>인출 가능일</span>
                <span className={styles.right}>남은 기간</span>
              </div>
              {avail.leftAmounts.length === 0 && (
                <div className={styles.note}>납입 내역이 없어요</div>
              )}
              {avail.leftAmounts.map((la, i) => {
                const days = la.matured ? 0 : daysUntil(la.maturesAt, avail.asOf)
                return (
                  <div key={i} className={cx(styles.payCols, styles.payRow)}>
                    <span>{F.dot(la.finalAt.slice(0, 10))}</span>
                    <b className={cx(styles.right, styles.bold)}>{F.won(la.curAmount)}</b>
                    <span>{F.dot(la.maturesAt.slice(0, 10))}</span>
                    <b className={cx(styles.right, styles.bold, la.matured ? styles.green : styles.navy)}>
                      {la.matured ? '만기됨' : 'D-' + days}
                    </b>
                  </div>
                )
              })}
              <div className={styles.fifo}>먼저 들어온 돈부터 인출돼요</div>
            </div>
            <div>
              <div className={styles.amtTitle}>목적지 계좌</div>
              {noDest && (
                <div className={styles.note}>연결된 일반계좌가 없어요</div>
              )}
              {!noDest && destAccounts.length === 1 && (
                <div className={styles.sub}>{destLabel}</div>
              )}
              {!noDest && destAccounts.length >= 2 && (
                <select
                  className={styles.srcSelect}
                  value={destId ?? ''}
                  onChange={(e) => {
                    setDestId(Number(e.target.value))
                    setOutAgree(false)
                  }}
                  aria-label="목적지 계좌"
                >
                  {destAccounts.map((a) => (
                    <option key={a.generalAccountId} value={a.generalAccountId}>
                      {a.accountNo}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <div className={styles.amtTitle}>인출 금액</div>
              <div className={styles.amtRow}>
                <label className={cx(styles.amtField, oTooMuch && styles.amtOver)}>
                  <input
                    className={styles.amtInput}
                    value={oAmt ? F.won(oAmt) : ''}
                    onChange={(e) => {
                      setOutAmt(e.target.value.replace(/\D/g, '').slice(0, 10))
                      setOutAgree(false)
                    }}
                    inputMode="numeric"
                    placeholder="0"
                    aria-label="인출 금액"
                  />
                  <span className={styles.amtUnit}>원</span>
                </label>
                <button
                  type="button"
                  className={styles.fillAll}
                  onClick={() => {
                    setOutAmt(String(Math.floor(avail.withdrawableWithoutPenalty)))
                    setOutAgree(false)
                  }}
                >
                  인출 가능액 전부
                </button>
              </div>
              {oTooMuch && (
                <div className={styles.tooMsg}>신청 가능 금액 ₩{F.won(avail.requestableAmount)}까지 인출할 수 있어요</div>
              )}
            </div>
            {oRisky && (
              <div className={styles.risk}>
                <div className={styles.riskTxt}>1년이 지나지 않은 납입금이 포함돼요. 지금 인출하면 이 계좌의 세제 혜택이 모두 취소돼요.</div>
                <div className={styles.riskCut}>
                  <span>1년 미경과 원금</span>
                  <b className={styles.riskAmt}>₩{F.won(avail.immaturePrincipalAmount)}</b>
                </div>
                <button type="button" className={styles.agree} aria-pressed={outAgree} onClick={() => setOutAgree(!outAgree)}>
                  <Box on={outAgree} />위 내용을 이해했어요
                </button>
              </div>
            )}
            {submitError && <div className={styles.fetchErr}>{submitError}</div>}
          </>
        )}
      </>
    )
  } else if (kind === 'out' && step === 1) {
    body = (
      <div>
        <div className={styles.sumRow}>
          <span className={styles.sub}>인출 금액</span>
          <b className={styles.sumBig}>₩{F.won(oAmt)}</b>
        </div>
        <div className={styles.sumRow}>
          <span className={styles.sub}>목적지 계좌</span>
          <b className={cx(styles.bold, styles.sumEnd)}>{destLabel}</b>
        </div>
        <div className={styles.sumRow}>
          <span className={styles.sub}>세제 혜택</span>
          <b className={cx(styles.bold, styles.sumEnd, oRisky ? styles.red : styles.green)}>
            {oRisky ? '모두 취소돼요' : '유지돼요'}
          </b>
        </div>
        {submitError && <div className={styles.fetchErr}>{submitError}</div>}
        <p className={styles.submitNote}>{SUBMIT_NOTE}</p>
      </div>
    )

  // ---- 계좌 개설 ----
  } else if (isOpen && step === 0) {
    body = (
      <div>
        <div className={styles.secTitle}>가입 조건을 자동으로 확인했어요</div>
        {ov.checks.map((c) => (
          <div key={c.label} className={styles.checkRow}>
            <span className={styles.checkLabel}>{c.label}</span>
            <b className={cx(styles.checkRes, c.ok ? styles.green : styles.red)}>{c.ok ? '확인됐어요' : '확인이 필요해요'}</b>
          </div>
        ))}
      </div>
    )
  } else if (isOpen && step === 1) {
    body = (
      <>
        <div>
          <div className={styles.limitHead}>
            <span className={styles.limitTitle}>이번 계좌 한도</span>
            <b className={styles.limitAmt}>₩{F.won(opLim)}</b>
          </div>
          <input
            className={styles.range}
            type="range"
            min={LIMIT_MIN}
            max={LIMIT_MAX}
            step={1000000}
            value={opLim}
            onChange={(e) => setOpLimit(clampLimit(e.target.value))}
            aria-label="이번 계좌 한도"
          />
          <div className={styles.rangeLabels}>
            <span>100만 원</span>
            <span className={styles.rangeMax}>5,000만 원</span>
          </div>
        </div>
        <div className={styles.otherRow}>
          <span className={styles.sub}>다른 증권사 RIA 한도 합계</span>
          <span className={styles.mydata}>마이데이터 조회</span>
          <b className={cx(styles.bold, styles.sumEnd)}>₩{F.won(ov.other)}</b>
        </div>
        <div>
          <div className={styles.totRow}>
            <span className={styles.sub}>전 증권사 합계</span>
            <b className={cx(styles.totAmt, opOver ? styles.red : styles.navy)}>₩{F.won(opTot)}</b>
            <span className={styles.sub}>/ 5,000만 원</span>
          </div>
          <div className={styles.bar}>
            <div className={styles.barNavy} style={{ width: bar.navy }} />
            <div className={styles.barRed} style={{ left: bar.navy, width: bar.red }} />
          </div>
          {opOver && <div className={styles.overWarn}>합계가 5,000만 원을 넘어요. 이번 계좌 한도를 줄여 주세요.</div>}
        </div>
        <div>
          <div className={styles.amtTitle}>연결 일반계좌</div>
          <div className={styles.radio} role="radio" aria-checked="true">
            <span className={styles.radioDot} />
            <span className={styles.radioTxt}>
              <b className={styles.radioName}>{ov.linked}</b>
              <span className={styles.radioNote}>{ov.linkedNote}</span>
            </span>
          </div>
        </div>
      </>
    )
  } else if (isOpen && step === 2) {
    body = (
      <>
        <div>
          {ov.rowsFor(opLim).map(([k, v]) => (
            <div key={k} className={styles.confirmRow}>
              <span className={cx(styles.sub, styles.noShrink)}>{k}</span>
              <b className={styles.confirmVal}>{v}</b>
            </div>
          ))}
        </div>
        <button type="button" className={cx(styles.agree, styles.agreeWrap)} aria-pressed={opAgree} onClick={() => setOpAgree(!opAgree)}>
          <Box on={opAgree} />1년 안에 원금을 인출하면 세제 혜택이 모두 취소된다는 점을 확인했어요
        </button>
      </>
    )
  } else if (isOpen && step === 3) {
    body = <DoneView title="계좌 개설 신청이 접수됐어요" sum={'한도 ₩' + F.won(opLim) + ' · ' + ov.linked} next={ov.next} />
  } else if (done) {
    body = <DoneView title={done.title ?? '인출 처리 완료'} sum={done.sum} next={done.next} />
  }

  return (
    <>
      <ModalFrame
        title={cfg.title}
        onClose={reqClose}
        escape={!askClose}
        steps={stepBar}
        bodyClassName={styles.body}
        footClassName={styles.foot}
        footer={
          <>
            <button type="button" className={styles.back} onClick={onBack}>
              {backLabel}
            </button>
            <button type="button" className={cx(styles.next, nextOn && styles.nextOn)} disabled={!nextOn} onClick={onNext}>
              {nextLabel}
            </button>
          </>
        }
      >
        {step < 2 && !isOpen && (
          <div className={styles.acct}>
            <span className={styles.sub}>보내는 계좌</span>
            <b className={styles.bold}>{cfg.from}</b>
            <span className={styles.arrow}>→</span>
            <span className={styles.sub}>받는 계좌</span>
            <b className={styles.bold}>{kind === 'out' && selectedDest ? destLabel : cfg.to}</b>
          </div>
        )}
        {body}
      </ModalFrame>
      {askClose && <AskClose onKeep={() => setAskClose(false)} onLeave={onClose} />}
    </>
  )
}

export function AskClose({ onKeep, onLeave }: { onKeep: () => void; onLeave: () => void }) {
  useEscape(onKeep)
  return createPortal(
    <div className={styles.askBackdrop}>
      <div className={styles.ask} role="alertdialog" aria-modal="true" aria-label="작성 중인 내용이 사라져요">
        <h3 className={styles.askTitle}>작성 중인 내용이 사라져요</h3>
        <p className={styles.askTxt}>지금 닫으면 입력한 내용은 저장되지 않아요.</p>
        <div className={styles.askBtns}>
          <button type="button" className={styles.askLeave} onClick={onLeave}>
            닫기
          </button>
          <button type="button" className={styles.askKeep} onClick={onKeep}>
            계속 작성
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function useEscape(fn: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fn()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fn])
}
