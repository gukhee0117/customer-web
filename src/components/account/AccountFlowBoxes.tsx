import { Fragment, useEffect, useRef, useState } from 'react'
import '../../styles/tokens.css'
import type { FundFlowAllocation, FundFlowRelief, FundFlowSummary } from '../../api/fundFlow'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { compositionView, cutVsInvest, scheduleView, summaryCard, transactionGroups } from './accountFlowData'
import type { FlowLive, TxMonth } from './accountFlowData'
import { useWithdrawSchedule } from './useWithdrawSchedule'
import styles from './AccountFlowBoxes.module.css'

const toneClass = (t: 'up' | 'down' | 'flat') => (t === 'up' ? styles.up : t === 'down' ? styles.down : styles.flat)

// 돌아온 돈 요약(data-box="flow") — "지금 N%가 국내 주식에서 일하고 있어요", 100% 막대, 접히는 계산 설명
export function FlowStepsBox({ className, live }: { className?: string; live?: FlowLive }) {
  const v = summaryCard(live)
  const [open, setOpen] = useState(false)
  return (
    <Box data-box="flow" className={className} title="돌아온 돈 요약" actions={<span className={styles.basis}>{v.basis}</span>}>
      <div className={styles.sum}>
        <p className={styles.sumHead}>
          지금 <b className={styles.sumPct}>{v.pct}%</b>가 국내 주식에서 일하고 있어요
        </p>
        <div className={styles.stack} role="img" aria-label={'자금 구성: ' + v.segs.map((x) => x.label + ' ' + x.pct).join(', ')}>
          {v.segs.map((x) => (
            <span key={x.key} className={styles.stackSeg} style={{ flexGrow: x.grow, background: x.color }} />
          ))}
        </div>
        <ul className={styles.legend}>
          {v.segs.map((x) => (
            <li key={x.key} className={styles.legendItem}>
              <span className={styles.swatchSm} style={{ background: x.color }} />
              <span>{x.label}</span>
              <b className={styles.legendAmt}>₩{x.amt}</b>
              <span className={styles.flat}>{x.pct}</span>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className={styles.fold} aria-expanded={open} aria-controls="flow-calc" onClick={() => setOpen((x) => !x)}>
        계산 자세히 보기 <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div id="flow-calc">
          <div className={styles.scroll}>
            <div className={styles.steps}>
              {v.steps.map((f, i) => (
                <Fragment key={f.name}>
                  <div className={styles.step}>
                    <span className={styles.stepName}>{f.name}</span>
                    <b className={styles.stepAmt}>{f.amt}</b>
                    <span className={cx(styles.stepNote, toneClass(f.noteTone))}>{f.note}</span>
                  </div>
                  {i < v.steps.length - 1 && <span className={styles.arrow}>→</span>}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </Box>
  )
}

// 인출 가능 일정(data-box="schedule") — 숫자 3칸 + 납입일별 1년 타임라인(간트)
const SCHEDULE_FIRST = 5
const SCHEDULE_MAX = 6 // 이보다 많으면 최근 5개만 먼저 보인다

function FlowScheduleBox() {
  const state = useWithdrawSchedule(true)
  const v = scheduleView(state)
  const [showAll, setShowAll] = useState(false)
  const many = v.rows.length > SCHEDULE_MAX
  const shown = many && !showAll ? v.rows.slice(-SCHEDULE_FIRST) : v.rows
  return (
    <Box data-box="schedule" title="인출 가능 일정">
      {v.mode === 'notOpened' && <p className={styles.empty}>계좌 개설이 완료되면 인출 일정을 볼 수 있어요</p>}
      {v.mode === 'loading' && <p className={styles.empty}>불러오는 중이에요</p>}
      {v.mode === 'error' && (
        <p className={styles.empty}>
          인출 일정을 불러오지 못했어요{' '}
          <button type="button" className={styles.retry} onClick={state.retry}>
            다시 시도
          </button>
        </p>
      )}
      {v.mode === 'ready' && (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>지금 인출 가능 금액</span>
              <b className={styles.statValue}>{v.now}</b>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>다음 인출 가능일</span>
              <b className={styles.statValue}>
                {v.nextDate}
                {v.dday && <span className={styles.dday}>{v.dday}</span>}
              </b>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>1년 유지 중인 납입금</span>
              <b className={styles.statValue}>{v.holding}</b>
            </div>
          </div>
          {v.rows.length > 0 && (
            <div className={styles.gantt} role="group" aria-label="납입일별 1년 인출 가능 일정">
              <div className={cx(styles.gRow, styles.gAxis)}>
                <span />
                <div className={styles.gTrack}>
                  {v.ticks.map((t) => (
                    <span key={t.label} className={styles.gTick} style={{ left: t.pct + '%' }}>
                      {t.label}
                    </span>
                  ))}
                  <span className={styles.gTodayLabel} style={{ left: v.todayPct + '%' }}>
                    업무일 {v.today.slice(5)}
                  </span>
                </div>
              </div>
              {shown.map((r) => (
                <div key={r.key} className={styles.gRow}>
                  <div className={styles.gLabel}>
                    <span>{r.label}</span>
                    <b>{r.amt}</b>
                    {r.withdrawn && <span>{r.withdrawn}</span>}
                  </div>
                  <div className={styles.gTrack}>
                    <span className={styles.gBar} style={{ left: r.startPct + '%', width: r.widthPct + '%' }}>
                      <span className={styles.gFill} style={{ width: r.fillPct + '%' }} />
                    </span>
                    <span className={styles.gEnd} style={{ left: r.startPct + r.widthPct + '%' }}>
                      {r.endLabel}
                      {r.fullyWithdrawn ? <span className={styles.gBadge}>전액 인출</span> : r.matured && <span className={styles.gBadge}>인출 가능</span>}
                    </span>
                    <span className={styles.gToday} style={{ left: v.todayPct + '%' }} aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {many && (
            <button type="button" className={styles.more} onClick={() => setShowAll((x) => !x)}>
              {showAll ? '접기' : '더 보기 (' + (v.rows.length - SCHEDULE_FIRST) + '건)'}
            </button>
          )}
        </>
      )}
    </Box>
  )
}

// 자금 이동 내역(data-box="transactions") — 열 맞춤 표. 월 머리줄 소계, 최신순, 처음엔 최근 3개월만
const BADGE: Record<string, string> = { KRW_CONFIRMED: styles.badgeKrw, DOMESTIC_BUY: styles.badgeBuy, DOMESTIC_SELL: styles.badgeSell, WITHDRAWAL: styles.badgeOut }

function TxMonthBlock({ month, open, onToggle }: { month: TxMonth; open: string[]; onToggle: (key: string) => void }) {
  const detailRefs = useRef(new Map<string, HTMLUListElement>())
  const scrollToKey = useRef<string | null>(null)

  useEffect(() => {
    const key = scrollToKey.current
    scrollToKey.current = null
    if (key && open.includes(key)) {
      detailRefs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [open])

  return (
    <>
      <div className={styles.txMonth}>
        <b>{month.label}</b>
        {month.summary && <span>· {month.summary}</span>}
      </div>
      {month.items.map((t) => {
        const expandable = t.details.length > 0
        const isOpen = open.includes(t.key)
        const cells = (
          <>
            <span className={styles.txDate}>{t.date}</span>
            <span className={cx(styles.txBadge, BADGE[t.type])}>{t.label}</span>
            <span className={styles.txItems} title={t.items}>
              {t.items}
              {expandable && (
                <span className={styles.chev} aria-hidden="true">
                  {isOpen ? '▴' : '▾'}
                </span>
              )}
            </span>
            <b className={styles.txAmt}>{t.amt}</b>
            <span className={styles.txBal}>{t.cashAfter}</span>
          </>
        )
        return (
          <div key={t.key} className={styles.txItem}>
            {expandable ? (
              <button type="button" className={cx(styles.txRow, styles.txCols)} aria-expanded={isOpen} onClick={() => {
                if (!isOpen) scrollToKey.current = t.key
                onToggle(t.key)
              }}>
                {cells}
              </button>
            ) : (
              <div className={cx(styles.txRow, styles.txCols)}>{cells}</div>
            )}
            {isOpen && (
              <ul className={styles.txDetail} ref={(node) => {
                if (node) detailRefs.current.set(t.key, node)
                else detailRefs.current.delete(t.key)
              }}>
                {t.details.map((d) => (
                  <li key={d.name} className={styles.txDetailRow}>
                    <span className={styles.txDetailName}>{d.name}</span>
                    <span>{d.qty}</span>
                    <span className={styles.right}>₩{d.px}</span>
                    <span className={styles.right}>₩{d.amt}</span>
                    <span className={cx(styles.right, styles.flat)}>수수료 ₩{d.fee}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </>
  )
}

function FlowTransactionsBox({ live }: { live?: FlowLive }) {
  const g = transactionGroups(live)
  const [showOlder, setShowOlder] = useState(false)
  const [open, setOpen] = useState<string[]>([])
  const toggle = (key: string) => setOpen((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  const empty = g.recent.length === 0 && g.older.length === 0
  return (
    <Box data-box="transactions" title="자금 이동 내역" actions={<span className={styles.basis}>예수금 변동 기준 · 최신순</span>}>
      {empty ? (
        <p className={styles.empty}>아직 자금 이동 내역이 없어요. 거래가 생기면 여기에 보여드려요.</p>
      ) : (
        <div className={styles.tx}>
          <div className={cx(styles.txCols, styles.txHead)}>
            <span>날짜</span>
            <span>구분</span>
            <span>종목 내역</span>
            <span className={styles.right}>금액</span>
            <span className={styles.right}>거래 후 예수금</span>
          </div>
          {g.recent.map((m) => (
            <TxMonthBlock key={m.key} month={m} open={open} onToggle={toggle} />
          ))}
          {showOlder && g.older.map((m) => <TxMonthBlock key={m.key} month={m} open={open} onToggle={toggle} />)}
        </div>
      )}
      {g.olderCount > 0 && (
        <button type="button" className={styles.more} onClick={() => setShowOlder((x) => !x)}>
          {showOlder ? '이전 내역 접기' : '이전 내역 더 보기 (' + g.olderCount + '건)'}
        </button>
      )}
    </Box>
  )
}

// 왼쪽 열: 인출 가능 일정 → 자금 이동 내역
export function FlowMainColumn({ live }: { live?: FlowLive }) {
  return (
    <div className={styles.mainCol}>
      <FlowScheduleBox />
      <FlowTransactionsBox live={live} />
    </div>
  )
}

// 국내 투자 구성(data-box="alloc") — 도넛, 업종 상위 3 + 기타 업종 + ETF·펀드 (예수금은 뺀다)
export function FlowAllocBox({ className, allocation }: { className?: string; allocation?: FundFlowAllocation | null }) {
  const a = compositionView(allocation)
  return (
    <Box data-box="alloc" className={className} title="국내 투자 구성">
      {a.empty ? (
        <p className={styles.empty}>국내 주식을 사면 업종별 비중이 여기에 나와요</p>
      ) : (
        <div className={styles.allocTop}>
          <div className={styles.donut} style={{ background: a.donut }}>
            <div className={styles.donutHole}>
              투자
              <br />
              <b className={styles.donutTot}>{a.total}</b>
            </div>
          </div>
          <div className={styles.allocList}>
            {a.items.map((x, i) => (
              <div key={x.label} className={cx(styles.allocRow, i < a.items.length - 1 && styles.line)}>
                <span className={styles.swatchSm} style={{ background: x.color }} />
                <span className={styles.nowrap}>{x.label}</span>
                <span className={cx(styles.amt, styles.nowrap)}>{x.amt}</span>
                <b className={styles.pct}>{x.pct}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </Box>
  )
}

// 감면과 국내 운용(data-box="cut-vs-invest") — 예상 감면액, 국내 운용, 감면 1원당 국내 운용
export function FlowCutBox({ className, summary, relief }: { className?: string; summary?: FundFlowSummary | null; relief?: FundFlowRelief | null }) {
  const c = cutVsInvest({ summary, relief })
  return (
    <Box data-box="cut-vs-invest" className={className} title="감면과 국내 운용">
      <div className={styles.cutBody}>
        <div className={styles.cutPair}>
          <div>
            <div className={styles.cutLabel}>예상 감면액</div>
            <b className={cx(styles.cutAmt, styles.gold)}>₩{c.cut}</b>
          </div>
          <div className={styles.cutRight}>
            <div className={styles.cutLabel}>{c.investLabel}</div>
            <b className={styles.cutAmt}>₩{c.invest}</b>
          </div>
        </div>
        <div className={styles.ratio}>
          {c.ratioLabel} <b className={cx(styles.bold, styles.navy)}>{c.ratio}원</b>
        </div>
        <div className={styles.ref}>{c.note}</div>
      </div>
    </Box>
  )
}
