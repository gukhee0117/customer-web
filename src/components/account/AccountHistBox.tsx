import { useState } from 'react'
import '../../styles/tokens.css'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { StockIcon } from '../common/StockIcon'
import { StockLabel } from '../common/StockLabel'
import { Tabs } from '../common/Tabs'
import { DEPOSIT_BASE_DOT, HIST_TABS, SHOW_DOM, SHOW_INS, SHOW_SELLS, depositRows, domesticRows, sellRows, settleRows, withdrawRequests, withdrawValues } from './accountHistData'
import type { AddedIn, AddedOut } from './accountApplyData'
import type { AddedSell, AddedSettle } from './accountSellData'
import type { DepRowView, HistTab, StockCell } from './accountHistData'
import styles from './AccountHistBox.module.css'

interface AccountHistBoxProps {
  className?: string
  tab: HistTab
  onTab: (key: HistTab) => void
  onApplyIn: () => void // 입고 반려 행의 다시 신청 ›
  onApplyOut: () => void // 인출 신청 ›
  addedIn: AddedIn[] // 방금 접수한 입고 신청(심사 중)
  addedOut: AddedOut[] // 방금 접수한 인출 신청(심사 중)
  addedSell: AddedSell[] // 방금 접수한 매도 신청(심사 중)
  addedSettle: AddedSettle[] // 같은 매도 신청의 정산 상태 줄
}

type MoreKey = 'ins' | 'sells' | 'dom'

const depToneClass: Record<DepRowView['tone'], string> = { rej: styles.toneRej, review: styles.toneReview, part: styles.tonePart, ok: styles.toneOk }

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
export function AccountHistBox({ className, tab, onTab, onApplyIn, onApplyOut, addedIn, addedOut, addedSell, addedSettle }: AccountHistBoxProps) {
  const [more, setMore] = useState<Record<MoreKey, boolean>>({ ins: false, sells: false, dom: false })
  const [openIn, setOpenIn] = useState<number | null>(null)

  const showMore = (k: MoreKey) => setMore((m) => ({ ...m, [k]: true }))
  const pickTab = (k: string) => {
    setOpenIn(null)
    onTab(k as HistTab)
  }

  return (
    <Box
      data-box="hist"
      className={className}
      headScroll
      head={<Tabs ariaLabel="거래·신청 내역" value={tab} onChange={pickTab} items={HIST_TABS} />}
      actions={<span className={styles.range}>최근 3개월</span>}
    >
      {tab === 'deposits' && <Deposits added={addedIn} more={more.ins} openIn={openIn} setOpenIn={setOpenIn} onMore={() => showMore('ins')} onApplyIn={onApplyIn} />}
      {tab === 'sells' && <Sells added={addedSell} more={more.sells} onMore={() => showMore('sells')} />}
      {tab === 'settle' && <Settle added={addedSettle} />}
      {tab === 'domestic' && <Domestic more={more.dom} onMore={() => showMore('dom')} />}
      {tab === 'withdraw' && <Withdraw added={addedOut} onApplyOut={onApplyOut} />}
    </Box>
  )
}

function Deposits({ added, more, openIn, setOpenIn, onMore, onApplyIn }: { added: AddedIn[]; more: boolean; openIn: number | null; setOpenIn: (i: number | null) => void; onMore: () => void; onApplyIn: () => void }) {
  const all = depositRows(added)
  const rows = more ? all : all.slice(0, SHOW_INS)
  const moreN = all.length - SHOW_INS

  return (
    <div className={styles.scroll}>
      <div className={styles.table680}>
        <div className={cx(styles.row, styles.inCols, styles.thead)}>
          <span>신청일</span>
          <span>종목</span>
          <span className={styles.right}>신청 수량</span>
          <span className={styles.right}>입고 수량</span>
          <span>상태</span>
          <span className={styles.right}>반환 수량</span>
          <span />
        </div>
        {rows.map((r, i) => {
          const open = !r.rej && openIn === i
          return (
            <div key={i} className={cx(styles.item, i === all.length - 1 && styles.noLine)}>
              <button type="button" className={cx(styles.row, styles.inCols, styles.body, r.knownDetail && styles.toggle, open && styles.toggleOpen)} aria-expanded={r.knownDetail ? open : undefined} onClick={() => r.knownDetail && !r.rej && setOpenIn(open ? null : i)}>
                <span className={styles.date}>{r.date}</span>
                <span className={styles.stockCell}>
                  <StockCellView s={r} />
                </span>
                <span className={styles.right}>{r.req}주</span>
                <b className={cx(styles.right, styles.strong)}>{r.gotTxt}</b>
                <span className={cx(styles.status, depToneClass[r.tone])}>{r.status}</span>
                <span className={cx(styles.right, r.retOn ? styles.tonePart : styles.faint)}>{r.ret}</span>
                {r.knownDetail ? (
                  <svg className={cx(styles.chev, open && styles.chevOpen)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                ) : <span />}
              </button>
              {r.rej && (
                <div className={styles.rejRow}>
                  <span className={styles.rejMsg}>{r.rejMsg}</span>
                  <button type="button" className={styles.linkBtn} onClick={onApplyIn}>
                    다시 신청 ›
                  </button>
                </div>
              )}
              {open && (
                <div className={styles.detail}>
                  <span>
                    <span className={styles.sub}>신청</span> <b>{r.req}주</b>
                  </span>
                  <span>
                    <span className={styles.sub}>{DEPOSIT_BASE_DOT()} 기준 보유</span> <b>{r.base}주</b>
                  </span>
                  <span>
                    <span className={styles.sub}>현재 보유</span> <b>{r.now}주</b>
                  </span>
                  <span className={styles.minTxt}>{r.minTxt}</span>
                </div>
              )}
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

function Sells({ added, more, onMore }: { added: AddedSell[]; more: boolean; onMore: () => void }) {
  const s = sellRows(added)
  const rows = more ? s.rows : s.rows.slice(0, SHOW_SELLS)
  const moreN = s.rows.length - SHOW_SELLS

  return (
    <div className={styles.scroll}>
      <div className={styles.table680}>
        <div className={cx(styles.row, styles.sellCols, styles.thead)}>
          <span>체결일</span>
          <span>종목</span>
          <span className={styles.right}>수량</span>
          <span className={styles.right}>매도 금액</span>
          <span className={styles.right}>양도차익</span>
          <span className={styles.right}>적용 공제율</span>
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
            <b className={cx(styles.right, styles.strong, r.review ? styles.faint : styles.up)}>{r.gain}</b>
            <span className={styles.right}>{s.rate}</span>
            <span className={cx(styles.status, r.review ? styles.toneReview : styles.toneDone)}>{r.review ? '심사 중' : '정산 완료'}</span>
          </div>
        ))}
        {!more && moreN > 0 && (
          <button type="button" className={cx(styles.moreBtn, styles.moreTop)} onClick={onMore}>
            더보기 ({moreN}건)
          </button>
        )}
        <div className={cx(styles.row, styles.sellCols, styles.sumRow)}>
          <b className={styles.nowrap}>정산 완료 합계</b>
          <span />
          <span />
          <b className={cx(styles.right, styles.strong)}>{s.sum.amt}</b>
          <b className={cx(styles.right, styles.strong, styles.up)}>{s.sum.gain}</b>
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}

function Settle({ added }: { added: AddedSettle[] }) {
  const st = settleRows(added)

  return (
    <div>
      <div className={cx(styles.row, styles.stCols, styles.thead)}>
        <span>매도 건</span>
        <span>진행 단계</span>
        <span className={styles.right}>금액</span>
      </div>
      {st.rows.map((r, i) => (
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
      <div className={styles.settleFoot}>
        원화 확정일 = 1년 유지 시작일이에요. {st.soldConf} 확정분은 {st.wdDate}부터 인출할 수 있어요.
      </div>
    </div>
  )
}

function Domestic({ more, onMore }: { more: boolean; onMore: () => void }) {
  const d = domesticRows()
  const rows = more ? d.rows : d.rows.slice(0, SHOW_DOM)
  const moreN = d.rows.length - SHOW_DOM

  return (
    <div>
      <div className={styles.domGuide}>주식 패키지에서 산 것과 따로 산 것을 모두 보여드려요 · 수수료 0.015%(예시)</div>
      <div className={styles.scroll}>
        <div className={styles.table900}>
          <div className={cx(styles.row, styles.domCols, styles.thead)}>
            <span>체결일</span>
            <span>종목</span>
            <span>구분</span>
            <span className={styles.right}>수량</span>
            <span className={styles.right}>체결가</span>
            <span className={styles.right}>수수료·세금</span>
            <span className={styles.right}>금액</span>
            <span>패키지</span>
            <span>상태</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={styles.line}>
              <div className={cx(styles.row, styles.domCols, styles.body)}>
                <span className={styles.date}>{r.date}</span>
                <span className={styles.stockCell}>
                  <StockLabel sym={r.code} size="sm" />
                </span>
                <b className={cx(styles.strong, r.sideTone === 'up' ? styles.up : styles.down)}>{r.side}</b>
                <span className={styles.right}>{r.qty}</span>
                <span className={styles.right}>{r.px}</span>
                <span className={cx(styles.right, styles.sub)}>{r.fee}</span>
                <b className={cx(styles.right, styles.strong)}>{r.amt}</b>
                <span className={cx(styles.pkg, !r.inPkg && styles.faint)}>{r.pkg}</span>
                <span className={cx(styles.domStatus, r.ok ? styles.sub : styles.domStatusRej)}>{r.status}</span>
              </div>
              {!r.ok && <div className={styles.domRejMsg}>{r.rejMsg}</div>}
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

function Withdraw({ added, onApplyOut }: { added: AddedOut[]; onApplyOut: () => void }) {
  const w = withdrawValues()
  const reqs = withdrawRequests(added)

  return (
    <div>
      {reqs.length === 0 ? (
        <div className={styles.outEmpty}>
          <span className={styles.sub}>
            인출 내역이 없어요 · 인출 가능일 {w.wdDate}(D-{w.wdD})
          </span>
          <button type="button" className={cx(styles.linkBtn, styles.outApply)} onClick={onApplyOut}>
            인출 신청 ›
          </button>
        </div>
      ) : (
        <>
          <div className={cx(styles.row, styles.reqCols, styles.thead)}>
            <span>신청일</span>
            <span className={styles.right}>인출 금액</span>
            <span>받는 계좌</span>
            <span>상태</span>
          </div>
          {reqs.map((r, i) => (
            <div key={i} className={cx(styles.row, styles.reqCols, styles.body, styles.line)}>
              <span className={styles.date}>{r.date}</span>
              <b className={cx(styles.right, styles.strong)}>{r.amt}</b>
              <span className={styles.reqTo}>{r.to}</span>
              <span className={styles.reqStatus}>{r.status}</span>
            </div>
          ))}
        </>
      )}
      <div className={styles.outTitle}>납입건별 인출 가능일</div>
      <div className={cx(styles.row, styles.outCols, styles.thead, styles.theadBoxed)}>
        <span>납입일</span>
        <span className={styles.right}>금액</span>
        <span>인출 가능일</span>
        <span className={styles.right}>남은 기간</span>
      </div>
      <div className={cx(styles.row, styles.outCols, styles.body, styles.line)}>
        <span>{w.paidDate}</span>
        <b className={cx(styles.right, styles.strong)}>₩{w.paidAmt}</b>
        <span>{w.wdDate}</span>
        <b className={cx(styles.right, styles.strong, styles.navy)}>D-{w.wdD}</b>
      </div>
      <div className={styles.nowRow}>
        <span className={styles.sub}>지금 인출할 수 있는 금액(수익 초과분)</span>
        <b className={styles.nowAmt}>₩{w.wdNow}</b>
      </div>
      <div className={styles.warn}>1년 전에 원금을 인출하면 이 계좌의 세제 혜택이 모두 취소돼요.</div>
    </div>
  )
}
