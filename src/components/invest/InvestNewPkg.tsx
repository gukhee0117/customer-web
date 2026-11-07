import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/tokens.css'
import { checkPackage } from '../../api/stockPackage'
import type { CandidateItem } from '../../api/stockPackage'
import { F } from '../../lib/calc'
import { StockIcon } from '../common/StockIcon'
import { StockLabel } from '../common/StockLabel'
import { cx } from '../common/cx'
import { cleanPct } from './investAddLogic'
import { NM_STEPS, ackClock, buyCalc, checkItemsOf, gradeLabel, labOf, phaseOf, pickedFrom, profileOf, rowsOf, sumOf } from './investNewPkgLogic'
import type { CkPhase, NewPkgState, NmBuyRow, NmLab } from './investNewPkgLogic'
import type { DialogState } from './InvestDialog'
import { InvestCheckResult } from './InvestCheckResult'
import { InvestNewPkgStart } from './InvestNewPkgStart'
import type { OrderFees } from '../../api/stockPackage'
import { ratePct } from './investOrderLogic'
import { useKeywordHits, useTendency } from './useNewPkgData'
import { useQuotes } from './useQuotes'
import styles from './InvestNewPkg.module.css'

type Patch = Partial<NewPkgState> | ((n: NewPkgState) => Partial<NewPkgState>)

interface Props {
  nm: NewPkgState
  cash: number
  fees: OrderFees | null // 오늘 기준 수수료율(서버). 아직 못 받았으면 null
  onPatch: (p: Patch) => void
  onClose: () => void
  onMake: (buy: NmBuyRow[] | null) => void // null이면 목표 비중만 정해 만들기, 목록이면 만들고 바로 사기
  onDialog: (d: DialogState) => void
}

// 종목 라벨 — 목록에 있는 종목은 공용 라벨, 그 밖의 국내 종목은 같은 모양으로 직접 그림
function StockName({ lab, sector, muted }: { lab: NmLab; sector: boolean; muted?: boolean }) {
  if (lab.kn) return <StockLabel sym={lab.code} size="sm" />
  return (
    <span className={styles.ulabel}>
      <StockIcon color={lab.ic} initial={lab.ini} size={20} code={lab.code} />
      <b className={cx(styles.uname, muted && styles.unameMuted)}>{lab.name}</b>
      <span className={cx(styles.ucode, sector && styles.ucodeSub)}>{lab.code}</span>
      {sector && <span className={styles.usector}>{lab.sector}</span>}
    </span>
  )
}

// "새 패키지" 창 — 이름 → 후보 찾기 → 목표 비중 → 살 금액
// 종목을 고르고 비중을 정하는 것은 고객이다. 서버는 후보를 조건으로 거르고, 고른 구성을 점검해 사실만 알려 준다(투자 권유 아님)
export function InvestNewPkg({ nm, cash, fees, onPatch, onClose, onMake, onDialog }: Props) {
  const tendency = useTendency()
  const kw = useKeywordHits(nm.q2)

  const st = nm.step
  const codes = Object.keys(nm.w)
  const sum = sumOf(nm.w)
  const empty = !codes.length
  const wOk = empty || sum === 100
  const quotes = useQuotes(codes, st === 3)
  const buy = buyCalc(nm.w, nm.amt, cash, nm.picked, quotes, fees)
  const { profL, maxG } = profileOf(tendency.data)
  const nextOn = st === 0 ? !!nm.name.trim() : st === 1 ? true : st === 2 ? wOk && !empty : buy.ok

  // 종목 담기: 진단이 없으면 막고, 내 성향보다 위험하면 한 번 확인(확인한 시각이 기록됨)
  const addCode = (c: CandidateItem) =>
    onPatch((n) => ({ w: { ...n.w, [c.ticker]: '0' }, picked: { ...n.picked, [c.ticker]: pickedFrom(c) }, q2: '' }))
  const pick = (c: CandidateItem) => {
    if (!c.selectable || nm.w[c.ticker] !== undefined) return
    if (tendency.state === 'ready' && !tendency.data?.survey.available) {
      onDialog({ title: '투자성향 진단이 필요해요', body: '진단이 없거나 유효기간이 지나 종목을 담을 수 없어요. 내 정보에서 투자성향을 진단해 주세요.' })
      return
    }
    if (!c.outOfProfile) return addCode(c)
    onDialog({
      title: '내 투자성향보다 위험한 종목이에요',
      body: c.name + '는 ' + c.riskGrade + '등급(' + F.gradeName(c.riskGrade as number) + ')이고, 고객님 성향(' + profL + ')은 ' + maxG + '예요. 그래도 담으시겠어요? 확인한 시각이 기록돼요.',
      okLabel: '확인하고 담기',
      okTone: 'navy',
      onOk: () => {
        addCode(c)
        onPatch((n) => ({ ack: { ...n.ack, [c.ticker]: ackClock() } }))
      }
    })
  }

  // 검사: 구성이 100%일 때만. 서버가 지표를 계산하고, 검사한 때의 구성으로 결과를 확정한다
  const ph: CkPhase = phaseOf(nm.chk, nm.w)
  const ckOn = !empty && sum === 100
  const busy = ph === 'loading'
  const can = ckOn && !busy
  const runCheck = () => {
    if (!ckOn || busy) return
    const items = checkItemsOf(nm.w, nm.picked)
    if (!items) {
      onPatch({ chk: { phase: 'error' } })
      return
    }
    const snap = JSON.stringify(nm.w)
    onPatch({ chk: { phase: 'loading' } })
    checkPackage(items).then(
      (result) => onPatch({ chk: { phase: 'done', snap, result } }),
      () => onPatch({ chk: { phase: 'error' } })
    )
  }
  const shown = nm.chk?.result

  const next = () => {
    if (st < 2) {
      if (nextOn) onPatch({ step: (st + 1) as NewPkgState['step'] })
    } else if (st === 2) {
      if (empty && wOk) onMake(null)
      else if (wOk) onPatch({ step: 3 })
    } else if (buy.ok) {
      const rows = buy.rows.filter((r) => r.q > 0)
      onDialog({
        title: '패키지를 만들고 바로 살까요?',
        rows: rows.map((r): [string, string] => [r.name, r.q + '주 · ₩' + r.amt]).concat([
          ['수수료', '₩' + F.won(buy.fee)],
          ['합계', '₩' + F.won(buy.total)]
        ]),
        okLabel: '만들고 주문',
        okTone: 'navy',
        onOk: () => onMake(buy.rows)
      })
    }
  }
  const back = () => (st === 0 ? onClose() : onPatch({ step: (st - 1) as NewPkgState['step'] }))

  const showMake = st === 2 && !empty
  const nextLabel = st < 2 ? '다음' : st === 2 ? (empty ? '만들기' : '만들고 바로 사기') : '주문하기'
  const nextDis = st === 2 ? !wOk && !empty : !nextOn
  const nextActive = st === 2 ? wOk : nextOn

  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div className={styles.backdrop} onClick={onBackdrop}>
      <div role="dialog" aria-modal="true" aria-label="새 패키지" className={styles.dialog}>
        <div className={styles.head}>
          <h2 className={styles.title}>새 패키지</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className={styles.steps}>
          {NM_STEPS.map((label, i) => (
            <span key={label} className={styles.stepItem}>
              {i > 0 && <span className={styles.stepSep}>·</span>}
              <span className={cx(styles.step, i <= st && styles.stepOn, i === st && styles.stepNow)}>
                {i + 1} {label}
              </span>
            </span>
          ))}
        </div>

        <div className={styles.body}>
          {st === 0 && (
            <>
              <div className={styles.label}>패키지 이름</div>
              <input className={styles.nameInput} value={nm.name} onChange={(e) => onPatch({ name: e.target.value.slice(0, 20) })} maxLength={20} placeholder="예: 2차전지 소재" aria-label="패키지 이름" />
              <div className={styles.hint}>20자까지 쓸 수 있어요. 나중에 바꿀 수 있어요.</div>
            </>
          )}

          {/* 후보 찾기는 1단계 이상에서 계속 두어서, 목표 비중 단계에서 돌아와도 조건·목록이 그대로 남게 한다(이름 단계로 돌아가면 초기화) */}
          {st >= 1 && (
            <div className={cx(styles.startWrap, st !== 1 && styles.startHidden)}>
              <InvestNewPkgStart tendency={tendency} addedCodes={codes} ask={nm.ask} onPick={pick} />
            </div>
          )}

          {st === 2 && (
            <>
              <div className={styles.sumRow}>
                <span className={styles.label}>종목별 목표 비중</span>
                <span className={styles.sum}>
                  합계 <b style={{ color: wOk ? 'var(--color-navy)' : 'var(--color-red)' }}>{sum}%</b>
                </span>
              </div>
              {empty && <div className={styles.emptyText}>빈 패키지로 만들어요. 종목은 만든 뒤 [+ 종목 추가]로 담을 수 있어요.</div>}
              <div>
                {rowsOf(nm.w, nm.picked).map((r) => (
                  <div key={r.code} className={styles.wRow}>
                    <span className={styles.wLabel}>
                      <StockName lab={r} sector />
                    </span>
                    <span className={styles.wRisk} style={{ color: r.warn ? 'var(--color-orange)' : 'var(--color-gray-600)' }}>
                      {r.risk}
                    </span>
                    <input className={styles.pct} value={r.v} onChange={(e) => onPatch((n) => ({ w: { ...n.w, [r.code]: cleanPct(e.target.value) } }))} inputMode="numeric" aria-label={r.name + ' 목표 비중'} />
                    <span className={styles.pctUnit}>%</span>
                  </div>
                ))}
              </div>
              <div className={styles.search}>
                <input className={styles.searchInput} value={nm.q2} onChange={(e) => onPatch({ q2: e.target.value.slice(0, 30) })} placeholder="종목명이나 코드로 검색해서 담기" aria-label="종목 검색" />
                {kw.items.length > 0 && (
                  <div className={styles.hits}>
                    {kw.items.map((c, i) => {
                      const has = nm.w[c.ticker] !== undefined
                      const off = has || !c.selectable
                      const lab = labOf(c.ticker, { [c.ticker]: pickedFrom(c) })
                      const metaTone = !c.selectable ? 'muted' : c.outOfProfile ? 'warn' : 'sub'
                      return (
                        <div key={c.domesticProductId} className={cx(styles.hit, i > 0 && styles.hitLine)}>
                          <span className={styles.hitMain}>
                            <StockName lab={lab} sector={false} muted={!c.selectable} />
                            <span className={cx(styles.hitMeta, styles[metaTone])}>{!c.selectable ? (c.unselectableReason ?? '담을 수 없음') : '위험 ' + gradeLabel(c.riskGrade) + (c.outOfProfile ? ' · 내 성향 밖' : '')}</span>
                          </span>
                          <button type="button" className={cx(styles.hitBtn, off ? styles.muted : styles.navy)} disabled={off} onClick={() => pick(c)}>
                            {has ? '담김' : c.selectable ? '담기' : '담을 수 없음'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {kw.state === 'loading' && !!nm.q2.trim() && <div className={styles.none}>찾는 중이에요…</div>}
                {kw.state === 'error' && <div className={styles.none}>검색하지 못했어요. 잠시 후 다시 시도해 주세요</div>}
                {kw.state === 'unauthorized' && <div className={styles.none}>로그인하면 종목을 검색할 수 있어요</div>}
                {kw.state === 'ready' && !!nm.q2.trim() && !kw.items.length && <div className={styles.none}>검색 결과가 없어요</div>}
              </div>
              <div className={styles.ckRow}>
                <button type="button" className={cx(styles.ckBtn, can && styles.ckOn)} disabled={!can} onClick={runCheck}>
                  {busy ? '검사 중…' : '검사하기'}
                </button>
                {!ckOn && <span className={styles.ckHint}>비중을 100%로 맞추면 검사할 수 있어요</span>}
              </div>
              <div className={styles.ck}>
                {ph === 'before' && <div className={styles.ckBefore}>검사하기를 누르면 이 구성을 확인해 드려요</div>}
                {busy && (
                  <div className={styles.cards}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={cx(styles.card, styles.skel)}>
                        <span className={styles.skA} />
                        <span className={styles.skB} />
                      </div>
                    ))}
                  </div>
                )}
                {ph === 'error' && (
                  <div className={styles.stale}>
                    <span className={styles.staleText}>검사하지 못했어요 · 잠시 후 다시 검사해 주세요</span>
                    <button type="button" className={styles.again} onClick={runCheck}>
                      다시 검사
                    </button>
                  </div>
                )}
                {ph === 'stale' && (
                  <div className={styles.stale}>
                    <span className={styles.staleText}>구성이 바뀌었어요 · 이전 구성 기준 결과예요</span>
                    <button type="button" className={styles.again} onClick={runCheck}>
                      다시 검사
                    </button>
                  </div>
                )}
                {shown && (ph === 'full' || ph === 'stale') && <InvestCheckResult result={shown} stale={ph === 'stale'} />}
                <div className={styles.note}>
                  위험등급은 금투협 가이드라인 VaR 방식을 참고한 리턴증권 자체 산정이에요.
                  <br />
                  과거 3년 데이터 기준이며 미래 수익 예측이 아니에요.
                  <br />
                  교육용 프로젝트의 자체 분석 결과예요. 수익을 보장하지 않으며, 실제 금융상품 판매·권유 절차를 대체하지 않아요.
                </div>
              </div>
              {!empty && sum !== 100 && <div className={styles.sumErr}>합계를 100%로 맞춰야 다음으로 갈 수 있어요</div>}
            </>
          )}

          {st === 3 && (
            <>
              <div className={styles.label}>살 금액</div>
              <label className={cx(styles.amtField, buy.err && styles.amtErr)}>
                <input className={styles.amtInput} value={buy.amt ? F.won(buy.amt) : ''} onChange={(e) => onPatch({ amt: e.target.value.replace(/\D/g, '').slice(0, 11) })} inputMode="numeric" placeholder="0" aria-label="살 금액" />
                <span className={styles.amtUnit}>원</span>
              </label>
              <div className={styles.hint}>주문 가능 ₩{F.won(cash)} · 목표 비중대로 종목별 주 수를 계산해요</div>
              <div>
                <div className={cx(styles.buyGrid, styles.buyHead)}>
                  <span>종목</span>
                  <span className={styles.r}>주 수</span>
                  <span className={styles.r}>금액</span>
                </div>
                {buy.rows.map((r) => (
                  <div key={r.code} className={cx(styles.buyGrid, styles.buyLine)}>
                    <span className={styles.buyName}>
                      {r.name} <span className={styles.buyCode}>{r.code}</span>
                    </span>
                    <span className={styles.r}>{r.q}주</span>
                    <b className={styles.r}>{r.amt}</b>
                  </div>
                ))}
                <div className={cx(styles.sumLine, styles.feeLine)}>
                  <span className={styles.feeK}>예상 수수료</span>
                  <span className={styles.feeNote}>{fees ? ratePct(fees.commissionRatePercent) : ''}</span>
                  <span className={styles.feeV}>₩{F.won(buy.fee)}</span>
                </div>
                <div className={styles.sumLine}>
                  <span className={styles.feeK}>합계(수수료 포함)</span>
                  <b className={styles.feeV}>₩{F.won(buy.total)}</b>
                </div>
                {buy.err && <div className={styles.sumErr}>{buy.err}</div>}
              </div>
            </>
          )}
        </div>

        <div className={styles.foot}>
          <div className={styles.btns}>
            <button type="button" className={styles.back} onClick={back}>
              {st === 0 ? '취소' : '이전'}
            </button>
            {showMake && (
              <button type="button" className={cx(styles.make, wOk && styles.makeOn)} disabled={!wOk} onClick={() => wOk && onMake(null)}>
                만들기만 하기
              </button>
            )}
            <button type="button" className={cx(styles.next, nextActive && styles.nextOn)} disabled={nextDis} onClick={next}>
              {nextLabel}
            </button>
          </div>
          {showMake && <div className={styles.makeNote}>주문 전에 지금 구성으로 다시 검사하고 결과를 보여드려요.</div>}
        </div>
      </div>
    </div>,
    document.body
  )
}
