import { Fragment } from 'react'
import '../../styles/tokens.css'
import type { FundFlowAllocation, FundFlowMonthly, FundFlowRelief, FundFlowSummary } from '../../api/fundFlow'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { MONTH_SERIES, allocValues, cutVsInvest, flowSteps, monthlyFlow } from './accountFlowData'
import type { FlowLive } from './accountFlowData'
import styles from './AccountFlowBoxes.module.css'

const toneClass = (t: 'up' | 'down' | 'flat') => (t === 'up' ? styles.up : t === 'down' ? styles.down : styles.flat)

// 돌아온 돈의 흐름(data-box="flow") — 다섯 단계와 화살표, 주문 가능 예수금 계산식
export function FlowStepsBox({ className, live }: { className?: string; live?: FlowLive }) {
  const { steps, cash, formula, headline } = flowSteps(live)
  return (
    <Box data-box="flow" className={className} title="돌아온 돈의 흐름">
      <div className={styles.scroll}>
        <div className={styles.steps}>
          {steps.map((f, i) => (
            <Fragment key={f.name}>
              <div className={styles.step}>
                <span className={styles.stepName}>{f.name}</span>
                <b className={styles.stepAmt}>{f.amt}</b>
                <span className={cx(styles.stepNote, toneClass(f.noteTone))}>{f.note}</span>
              </div>
              {i < steps.length - 1 && <span className={styles.arrow}>→</span>}
            </Fragment>
          ))}
        </div>
      </div>
      {headline && (
        <div className={styles.formula}>
          <b className={styles.bold}>{headline}</b>
        </div>
      )}
      <div className={styles.formula}>
        주문 가능 예수금 <b className={styles.bold}>₩{cash}</b> <span className={styles.formulaTxt}>= {formula}</span>
      </div>
    </Box>
  )
}

// 월별 흐름(data-box="monthly") — 위 막대 그래프, 아래 월별 표
export function FlowMonthlyBox({ className, monthly }: { className?: string; monthly?: FundFlowMonthly | null }) {
  const months = monthlyFlow(monthly)
  const cols = cx(styles.row, styles.tableCols)
  // 월 수만큼 칸을 나눈다(시연 데이터는 2개월, 서버 값은 3월~현재월)
  const colTemplate = { gridTemplateColumns: 'repeat(' + months.length + ', minmax(0, 1fr))' }
  return (
    <Box
      data-box="monthly"
      className={className}
      title="월별 흐름"
      actions={
        <div className={styles.legend}>
          {MONTH_SERIES.map((g) => (
            <span key={g.key} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: g.color }} />
              {g.label}
            </span>
          ))}
        </div>
      }
    >
      <div className={styles.chart}>
        <div className={styles.plot} style={colTemplate}>
          {months.map((m) => (
            <div key={m.label} className={styles.group}>
              {m.bars.map((b, i) => (
                <div key={i} className={styles.bar} style={{ height: b.h, background: b.color }} title={b.title}>
                  {b.v && <span className={styles.barVal}>{b.v}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.axis} style={colTemplate}>
          {months.map((m) => (
            <span key={m.label}>{m.label}</span>
          ))}
        </div>
      </div>
      <div className={cx(cols, styles.thead)}>
        <span>월</span>
        <span className={styles.right}>원화 유입</span>
        <span className={styles.right}>국내 매수</span>
        <span className={styles.right}>국내 매도</span>
        <span className={styles.right}>인출</span>
      </div>
      {months.map((m, i) => (
        <div key={m.label} className={cx(cols, styles.body, i < months.length - 1 && styles.line)}>
          <span>{m.label}</span>
          <span className={styles.right}>{m.inflow}</span>
          <span className={styles.right}>{m.buy}</span>
          <span className={styles.right}>{m.sell}</span>
          <span className={styles.right}>{m.out}</span>
        </div>
      ))}
    </Box>
  )
}

// 어디에 운용하고 있나(data-box="alloc") — 도넛, 항목별 금액·비율, 업종 상위 3
export function FlowAllocBox({ className, allocation }: { className?: string; allocation?: FundFlowAllocation | null }) {
  const a = allocValues(allocation)
  return (
    <Box data-box="alloc" className={className} title="어디에 운용하고 있나" actions={<span className={styles.basis}>{a.basis}</span>}>
      <div className={styles.allocTop}>
        <div className={styles.donut} style={{ background: a.donut }}>
          <div className={styles.donutHole}>
            합계
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
      <div className={styles.sectors}>
        <div className={styles.sectorHead}>업종 상위 3</div>
        {a.sectors.map((x) => (
          <div key={x.n} className={styles.sectorRow}>
            <span className={styles.rank}>{x.n}</span>
            <span>{x.label}</span>
            <span className={styles.amt}>{x.amt}</span>
            <b className={styles.pct}>{x.pct}</b>
          </div>
        ))}
      </div>
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
