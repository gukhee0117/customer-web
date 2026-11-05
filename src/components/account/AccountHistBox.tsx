import { useState } from 'react'
import type { ReactNode } from 'react'
import '../../styles/tokens.css'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { StockIcon } from '../common/StockIcon'
import { StockLabel } from '../common/StockLabel'
import { Tabs } from '../common/Tabs'
import { HIST_TABS, SHOW_DOM, SHOW_INS, SHOW_SELLS, depositRows, domesticRows, sellRows, settleRows, withdrawRequests, leftAmountRows } from './accountHistData'
import { getDomesticTrades, getSellOrders, getSettlements } from '../../api/accountHistory'
import { getInboundDetail } from '../../api/inbound'
import type { InboundHistoryItem } from '../../api/inbound'
import { getWithdrawalDetail } from '../../api/withdrawal'
import type { WithdrawalAllocation, WithdrawalHistoryItem } from '../../api/withdrawal'
import type { WithdrawalAvailability } from '../../api/withdrawalAvailability'
import { F } from '../../lib/calc'
import { useServerData } from './useServerData'
import type { ServerState } from './useServerData'
import type { DepRowView, HistTab, StockCell } from './accountHistData'
import styles from './AccountHistBox.module.css'

interface AccountHistBoxProps {
  className?: string
  tab: HistTab
  onTab: (key: HistTab) => void
  onApplyIn: () => void // 입고 반려 행의 다시 신청 ›
  onApplyOut: () => void // 인출 신청 ›
  inbounds: ServerState<InboundHistoryItem[]> // 서버 입고 이력
  onRetryInbounds: () => void
  withdrawals: ServerState<WithdrawalHistoryItem[]> // 서버 인출 이력
  onRetryWithdrawals: () => void
  avail: ServerState<WithdrawalAvailability> // 서버 인출 가능 금액(납입건별 인출 가능일)
  onRetryAvail: () => void
}

type MoreKey = 'ins' | 'sells' | 'dom'

const depToneClass: Record<DepRowView['tone'], string> = { part: styles.tonePart, ok: styles.toneOk }

// 해외 종목 한 칸 — StockLabel에 있는 종목은 StockLabel, 없는 종목(또는 plain)은 색 원 + 티커 + 이름
function StockCellView({ s, plain = false }: { s: StockCell; plain?: boolean }) {
  if (s.labeled && !plain) return <StockLabel sym={s.t} size="sm" />
  return (
    <span className={styles.plainStock}>
      <StockIcon color={s.color} initial={s.ini} size={20} />
      <b className={styles.plainTicker}>{s.t}</b>
      <span className={styles.plainName}>{s.name}</span>
    </span>
  )
}

// 거래·신청 내역 박스(data-box="hist") — 입고 / 매도 / 정산 상태 / 국내 매매 / 인출 다섯 탭
export function AccountHistBox({ className, tab, onTab, onApplyIn, onApplyOut, inbounds, onRetryInbounds, withdrawals, onRetryWithdrawals, avail, onRetryAvail }: AccountHistBoxProps) {
  const [more, setMore] = useState<Record<MoreKey, boolean>>({ ins: false, sells: false, dom: false })

  const showMore = (k: MoreKey) => setMore((m) => ({ ...m, [k]: true }))
  const pickTab = (k: string) => {
    onTab(k as HistTab)
  }

  return (
    <Box
      data-box="hist"
      className={className}
      headScroll
      head={<Tabs ariaLabel="거래·신청 내역" value={tab} onChange={pickTab} items={HIST_TABS} />}
    >
      {tab === 'deposits' && <Deposits state={inbounds} retry={onRetryInbounds} more={more.ins} onMore={() => showMore('ins')} onApplyIn={onApplyIn} />}
      {tab === 'sells' && <Sells more={more.sells} onMore={() => showMore('sells')} />}
      {tab === 'settle' && <Settle />}
      {tab === 'domestic' && <Domestic more={more.dom} onMore={() => showMore('dom')} />}
      {tab === 'withdraw' && <Withdraw state={withdrawals} retry={onRetryWithdrawals} avail={avail} onRetryAvail={onRetryAvail} onApplyOut={onApplyOut} />}
    </Box>
  )
}

function Deposits({ state, retry, more, onMore, onApplyIn }: { state: ServerState<InboundHistoryItem[]>; retry: () => void; more: boolean; onMore: () => void; onApplyIn: () => void }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const all = state.status === 'live' ? depositRows(state.data) : []
  if (all.length === 0) {
    const apply = <button type="button" className={styles.linkBtn} onClick={onApplyIn}>입고 신청 ›</button>
    return <HistStatus state={state.status === 'live' ? { status: 'none' } : state} retry={retry} emptyText="입고 내역이 없어요" action={apply} />
  }
  const rows = more ? all : all.slice(0, SHOW_INS)
  const moreN = all.length - SHOW_INS

  return (
    <div className={styles.scroll}>
      <div className={styles.table680}>
        <div className={cx(styles.row, styles.inCols, styles.thead)}>
          <span>입고일</span>
          <span>종목</span>
          <span className={styles.right}>신청 수량</span>
          <span className={styles.right}>입고 수량</span>
          <span>상태</span>
          <span className={styles.right}>반환 수량</span>
          <span />
        </div>
        {rows.map((r, i) => {
          const open = openId === r.id
          return (
            <div key={r.id} className={cx(styles.item, i === all.length - 1 && styles.noLine)}>
              <button type="button" className={cx(styles.row, styles.inCols, styles.body, styles.toggle, open && styles.toggleOpen)} aria-expanded={open} onClick={() => setOpenId(open ? null : r.id)}>
                <span className={styles.date}>{r.date}</span>
                <span className={styles.stockCell}>
                  <StockCellView s={r} />
                </span>
                <span className={styles.right}>{r.req}주</span>
                <b className={cx(styles.right, styles.strong)}>{r.got}주</b>
                <span className={cx(styles.status, depToneClass[r.tone])}>{r.status}</span>
                <span className={cx(styles.right, r.retOn ? styles.tonePart : styles.faint)}>{r.ret}</span>
                <Chevron open={open} />
              </button>
              {open && <InboundDetailRows id={r.id} />}
            </div>
          )
        })}
        {!more && moreN > 0 && (
          <button type="button" className={cx(styles.moreBtn, styles.moreTop)} onClick={onMore}>
            더보기 ({moreN}건)
          </button>
        )}
      </div>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={cx(styles.chev, open && styles.chevOpen)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// 펼칠 때 한 번 받는 상세 안내(받는 중·실패)
function DetailStatus({ state, retry }: { state: ServerState<unknown>; retry: () => void }) {
  return (
    <div className={styles.detail}>
      {state.status === 'error' ? (
        <>
          <span className={styles.sub}>상세를 불러오지 못했어요</span>
          <button type="button" className={styles.linkBtn} onClick={retry}>다시 시도</button>
        </>
      ) : (
        <span className={styles.sub}>{state.status === 'loading' ? '불러오는 중…' : '상세가 없어요'}</span>
      )}
    </div>
  )
}

// 입고 상세 — 출처 일반계좌(증권사)별 입고 lot. 기준일 보유·최소 수량은 서버가 주지 않는다
function InboundDetailRows({ id }: { id: number }) {
  const { state, retry } = useServerData(() => getInboundDetail(id))
  if (state.status !== 'live') return <DetailStatus state={state} retry={retry} />
  return (
    <div className={styles.detail}>
      {state.data.details.map((l) => (
        <span key={l.inboundDetailId}>
          {l.sourceBroker && <span className={styles.sub}>{l.sourceBroker} </span>}<b>입고 {l.approvedQty}주</b> <span className={styles.sub}>· 현재 {l.currentQty}주 · 취득일 {F.dot(l.purchaseDate.slice(0, 10))} · 취득가 {l.purchasePrice} {l.purchaseCurrency}</span>
        </span>
      ))}
    </div>
  )
}

const ALLOC_TYPE: Record<WithdrawalAllocation['type'], string> = { EARNINGS_ONLY: '수익 인출', MATURED_PRINCIPAL_INCLUDED: '만기 원금', IMMATURE_PRINCIPAL_INCLUDED: '만기 전 원금(조기 인출)' }

// 인출 상세 — 납입건별 배분
function WithdrawalDetailRows({ id }: { id: number }) {
  const { state, retry } = useServerData(() => getWithdrawalDetail(id))
  if (state.status !== 'live') return <DetailStatus state={state} retry={retry} />
  return (
    <div className={styles.detail}>
      {state.data.allocations.map((a) => (
        <span key={a.allocationId}>
          <span className={styles.sub}>{a.ticker ? a.ticker + ' ' : ''}{ALLOC_TYPE[a.type]}</span> <b>₩{F.won(a.allocatedAmount)}</b>
          {a.maturityAt && <span className={styles.sub}> · 인출 가능일 {F.dot(a.maturityAt.slice(0, 10))}</span>}
        </span>
      ))}
      {state.data.earlyWithdrawal && <span className={styles.minTxt}>1년 전 원금 인출이 포함돼 세제 혜택이 취소돼요</span>}
    </div>
  )
}

// 서버 목록의 받는 중·실패·비어 있음 안내(탭 공용)
function HistStatus({ state, retry, emptyText, action }: { state: ServerState<unknown>; retry: () => void; emptyText: string; action?: ReactNode }) {
  if (state.status === 'loading') return <div className={styles.outEmpty}><span className={styles.sub}>불러오는 중…</span></div>
  if (state.status === 'error')
    return (
      <div className={styles.outEmpty}>
        <span className={styles.sub}>내역을 불러오지 못했어요</span>
        <button type="button" className={styles.linkBtn} onClick={retry}>다시 시도</button>
      </div>
    )
  return (
    <div className={styles.outEmpty}>
      <span className={styles.sub}>{emptyText}</span>
      {action}
    </div>
  )
}

function Sells({ more, onMore }: { more: boolean; onMore: () => void }) {
  const { state, retry } = useServerData(getSellOrders)
  const s = sellRows(state.status === 'live' ? state.data : [])
  if (s.rows.length === 0) return <HistStatus state={state.status === 'live' ? { status: 'none' } : state} retry={retry} emptyText="매도 내역이 없어요" />
  const rows = more ? s.rows : s.rows.slice(0, SHOW_SELLS)
  const moreN = s.rows.length - SHOW_SELLS
  const toneClass = { review: styles.toneReview, done: styles.toneDone, rej: styles.toneRej }

  return (
    <div className={styles.scroll}>
      <div className={styles.table680}>
        <div className={cx(styles.row, styles.sellCols, styles.thead)}>
          <span>처리일</span>
          <span>종목</span>
          <span className={styles.right}>수량</span>
          <span className={styles.right}>주문 금액</span>
          <span>상태</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={cx(styles.row, styles.sellCols, styles.body, styles.line)}>
            <span className={styles.date}>{r.date}</span>
            <span className={styles.stockCell}>
              <StockCellView s={r} plain />
            </span>
            <span className={styles.right}>{r.qty}주</span>
            <span className={styles.right}>{r.amt}</span>
            <span className={cx(styles.status, toneClass[r.tone])}>{r.status}</span>
          </div>
        ))}
        {!more && moreN > 0 && (
          <button type="button" className={cx(styles.moreBtn, styles.moreTop)} onClick={onMore}>
            더보기 ({moreN}건)
          </button>
        )}
        <div className={cx(styles.row, styles.sellCols, styles.sumRow)}>
          <b className={styles.nowrap}>체결 합계</b>
          <span />
          <span />
          <b className={cx(styles.right, styles.strong)}>{s.sum}</b>
          <span />
        </div>
      </div>
    </div>
  )
}

function Settle() {
  const { state, retry } = useServerData(getSettlements)
  const rows = settleRows(state.status === 'live' ? state.data : [])
  if (rows.length === 0) return <HistStatus state={state.status === 'live' ? { status: 'none' } : state} retry={retry} emptyText="정산 내역이 없어요" />

  return (
    <div>
      <div className={cx(styles.row, styles.stCols, styles.thead)}>
        <span>매도 건</span>
        <span>진행 단계</span>
        <span className={styles.right}>금액</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className={cx(styles.row, styles.stCols, styles.stBody)}>
          <span className={styles.stTitleCell}>
            <b className={styles.strong}>{r.title}</b>
            <span className={styles.stSub}>{r.sub}</span>
          </span>
          <span className={styles.steps}>
            {r.steps.map((d) => (
              <span key={d.label} className={styles.step}>
                {d.line && <span className={cx(styles.stepLine, d.lineOn && styles.stepLineOn)} />}
                <span className={cx(styles.dot, d.reached && styles.dotOn)} />
                <span className={cx(styles.stepLabel, d.reached && styles.stepLabelOn, d.current && styles.stepLabelCur)}>{d.label}</span>
                <span className={styles.stepDate}>{d.date}</span>
                {d.hasNote && <span className={styles.stepNote}>{d.note}</span>}
              </span>
            ))}
          </span>
          <b className={cx(styles.right, styles.strong)}>{r.amt}</b>
        </div>
      ))}
      <div className={styles.settleFoot}>원화 확정일 = 1년 유지 시작일이에요. 확정된 금액부터 1년이 지나면 인출할 수 있어요.</div>
    </div>
  )
}

function Domestic({ more, onMore }: { more: boolean; onMore: () => void }) {
  const { state, retry } = useServerData(getDomesticTrades)
  const d = domesticRows(state.status === 'live' ? state.data : [])
  if (d.rows.length === 0) return <HistStatus state={state.status === 'live' ? { status: 'none' } : state} retry={retry} emptyText="국내 매매 내역이 없어요" />
  const rows = more ? d.rows : d.rows.slice(0, SHOW_DOM)
  const moreN = d.rows.length - SHOW_DOM

  return (
    <div>
      <div className={styles.domGuide}>주식 패키지에서 산 것과 따로 산 것을 모두 보여드려요</div>
      <div className={styles.scroll}>
        <div className={styles.table680}>
          <div className={cx(styles.row, styles.domCols, styles.thead)}>
            <span>체결일</span>
            <span>종목</span>
            <span>구분</span>
            <span className={styles.right}>수량</span>
            <span className={styles.right}>체결가</span>
            <span className={styles.right}>금액</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={cx(styles.row, styles.domCols, styles.body, styles.line)}>
              <span className={styles.date}>{r.date}</span>
              <span className={styles.plainStock}>
                <b className={styles.plainTicker}>{r.name}</b>
                <span className={styles.plainName}>{r.code}</span>
              </span>
              <b className={cx(styles.strong, r.sideTone === 'up' ? styles.up : styles.down)}>{r.side}</b>
              <span className={styles.right}>{r.qty}</span>
              <span className={styles.right}>{r.px}</span>
              <b className={cx(styles.right, styles.strong)}>{r.amt}</b>
            </div>
          ))}
          {!more && moreN > 0 && (
            <button type="button" className={cx(styles.moreBtn, styles.moreBottom)} onClick={onMore}>
              더보기 ({moreN}건)
            </button>
          )}
          <div className={styles.domSum}>
            <b className={styles.strong}>합계</b>
            <span>
              국내 매수 누적 <b className={styles.strong}>₩{d.sum.buy}</b>
            </span>
            <span className={styles.sumDot}>·</span>
            <span>
              국내 매도 누적 <b className={styles.strong}>₩{d.sum.sell}</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Withdraw({ state, retry, avail, onRetryAvail, onApplyOut }: { state: ServerState<WithdrawalHistoryItem[]>; retry: () => void; avail: ServerState<WithdrawalAvailability>; onRetryAvail: () => void; onApplyOut: () => void }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const lefts = avail.status === 'live' ? leftAmountRows(avail.data) : []
  const reqs = state.status === 'live' ? withdrawRequests(state.data) : []

  return (
    <div>
      {reqs.length === 0 ? (
        <HistStatus
          state={state.status === 'live' ? { status: 'none' } : state}
          retry={retry}
          emptyText="인출 내역이 없어요"
          action={<button type="button" className={cx(styles.linkBtn, styles.outApply)} onClick={onApplyOut}>인출 신청 ›</button>}
        />
      ) : (
        <>
          <div className={cx(styles.row, styles.reqCols, styles.thead)}>
            <span>처리일</span>
            <span className={styles.right}>인출 금액</span>
            <span>받는 계좌</span>
            <span>상태</span>
            <span />
          </div>
          {reqs.map((r) => {
            const open = openId === r.id
            return (
              <div key={r.id} className={styles.line}>
                <button type="button" className={cx(styles.row, styles.reqCols, styles.body, styles.toggle, open && styles.toggleOpen)} aria-expanded={open} onClick={() => setOpenId(open ? null : r.id)}>
                  <span className={styles.date}>{r.date}</span>
                  <b className={cx(styles.right, styles.strong)}>{r.amt}</b>
                  <span className={styles.reqTo}>{r.to}</span>
                  <span className={styles.reqStatus}>{r.status}</span>
                  <Chevron open={open} />
                </button>
                {open && <WithdrawalDetailRows id={r.id} />}
              </div>
            )
          })}
        </>
      )}
      <div className={styles.outTitle}>납입건별 인출 가능일</div>
      {avail.status !== 'live' || lefts.length === 0 ? (
        <HistStatus state={avail.status === 'live' ? { status: 'none' } : avail} retry={onRetryAvail} emptyText="원화로 확정된 매도가 없어요" />
      ) : (
        <>
          <div className={cx(styles.row, styles.outCols, styles.thead, styles.theadBoxed)}>
            <span>납입일</span>
            <span className={styles.right}>금액</span>
            <span>인출 가능일</span>
            <span className={styles.right}>남은 기간</span>
          </div>
          {lefts.map((l, i) => (
            <div key={i} className={cx(styles.row, styles.outCols, styles.body, styles.line)}>
              <span>{l.paid}</span>
              <b className={cx(styles.right, styles.strong)}>₩{l.amt}</b>
              <span>{l.wd}</span>
              <b className={cx(styles.right, styles.strong, styles.navy)}>{l.left}</b>
            </div>
          ))}
          <div className={styles.nowRow}>
            <span className={styles.sub}>지금 인출할 수 있는 금액(수익 초과분)</span>
            <b className={styles.nowAmt}>₩{F.won(avail.data.withdrawableWithoutPenalty)}</b>
          </div>
        </>
      )}
      <div className={styles.warn}>1년 전에 원금을 인출하면 이 계좌의 세제 혜택이 모두 취소돼요.</div>
    </div>
  )
}
