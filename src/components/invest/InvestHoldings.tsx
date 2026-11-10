import { useState } from 'react'
import { Link } from 'react-router-dom'
import { F } from '../../lib/calc'
import { cx } from '../common/cx'
import { GRADE_WORD } from './investHoldingData'
import { InvestStockName } from './InvestStockName'
import { splitPercent } from './investChartLogic'
import { sign, toneOf } from './investPkgLogic'
import type { PkgView } from './investPkgLogic'
import styles from './InvestHoldings.module.css'

interface Props {
  pkg: PkgView
  hov: string | null // 도넛·비중 줄과 함께 강조되는 종목 코드
  onHov: (code: string | null) => void
  onAdd?: () => void // 종목 추가 창 열기(InvestPage의 openAdd에 연결됨)
  onBuy?: (code: string) => void
  onSell?: (code: string) => void
}

// 보유 종목 표 — 종목별 줄(누르면 종목 정보 펼침)과 합계 줄. 좁은 화면은 가로 스크롤(원본과 같음)
export function InvestHoldings({ pkg, hov, onHov, onAdd, onBuy, onSell }: Props) {
  const [open, setOpen] = useState<string | null>(null) // 펼친 종목(다른 패키지를 골라도 유지)
  const [tip, setTip] = useState(false) // 위험 열 안내
  const noItems = pkg.items.length === 0
  const w = splitPercent(pkg.items.map((i) => i.val))

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={cx(styles.grid, styles.head)}>
          <span>종목</span>
          <span className={styles.r}>보유 주 수</span>
          <span className={styles.r}>평균 매입가</span>
          <span className={styles.r}>현재가</span>
          <span className={styles.r}>평가금액</span>
          <span className={styles.r}>평가손익</span>
          <span className={styles.r}>수익률</span>
          <span className={styles.riskHead}>
            위험
            <button
              type="button"
              className={styles.tipBtn}
              aria-label="위험등급 안내"
              aria-expanded={tip}
              onClick={() => setTip(!tip)}
              onMouseEnter={() => setTip(true)}
              onMouseLeave={() => setTip(false)}
              onFocus={() => setTip(true)}
              onBlur={() => setTip(false)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
            {tip && (
              <span role="tooltip" className={styles.tip}>
                1 매우 높은 위험 ~ 6 매우 낮은 위험 · 리턴증권 자체 산정
              </span>
            )}
          </span>
          <span className={styles.r}>비중 / 목표</span>
          <span className={styles.c}>주문</span>
        </div>

        {noItems && (
          <div className={styles.empty}>
            <span className={styles.emptyText}>아직 담은 종목이 없어요</span>
            <button type="button" className={styles.emptyAdd} onClick={onAdd}>
              + 종목 추가
            </button>
          </div>
        )}

        {pkg.items.map((it, i) => {
          const held = it.qty > 0
          const shown = held && it.priced // 보유했고 현재가가 있어야 평가값을 보인다
          const ret = it.cost ? ((it.val - it.cost) / it.cost) * 100 : 0
          const isOpen = open === it.code
          const out = it.out === true
          const ack = it.ack
          return (
            <div key={it.code} className={styles.rowBox}>
              <div
                data-hold-row="1"
                role="button"
                aria-expanded={isOpen}
                className={cx(styles.grid, styles.row, (isOpen || hov === it.code) && styles.rowOn)}
                onClick={() => setOpen(isOpen ? null : it.code)}
                onMouseEnter={() => onHov(it.code)}
                onMouseLeave={() => onHov(null)}
              >
                <span className={styles.stock}>
                  <InvestStockName code={it.code} name={it.name} size="sm" />
                </span>
                <span className={styles.r}>{`${it.qty}주`}</span>
                <span className={styles.r}>{held ? F.won(it.avg) : '-'}</span>
                <span className={styles.px}>
                  <span>{it.price != null ? F.won(it.price) : '-'}</span>
                  {it.price != null && <span className={cx(styles.chg, styles[toneOf(it.chg)])}>{F.pct(it.chg)}</span>}
                </span>
                <b className={styles.val}>{shown ? F.won(it.val) : '-'}</b>
                <span className={cx(styles.r, styles[toneOf(ret)])}>{shown ? sign(it.val - it.cost) + F.won(Math.abs(it.val - it.cost)) : '-'}</span>
                <span className={cx(styles.r, styles[toneOf(ret)])}>{shown ? F.pct(ret) : '-'}</span>
                <span className={styles.risk}>
                  <span className={cx(styles.riskText, out && styles.warn)}>{it.grade == null ? '-' : it.grade + ' ' + GRADE_WORD[it.grade]}</span>
                  {out && ack && <span className={cx(styles.riskText, styles.warn)}>{`부적합 확인함 · ${F.short(ack)}`}</span>}
                </span>
                <span className={styles.weight}>
                  {`${w[i].toFixed(1)}% `}
                  <span className={styles.target}>/ {it.target}%</span>
                </span>
                <span className={styles.orders}>
                  <button
                    type="button"
                    className={styles.buy}
                    onClick={(e) => {
                      e.stopPropagation()
                      onBuy?.(it.code)
                    }}
                  >
                    매수
                  </button>
                  <span className={styles.dot}>·</span>
                  <button
                    type="button"
                    className={styles.sell}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSell?.(it.code)
                    }}
                  >
                    매도
                  </button>
                </span>
              </div>
              {isOpen && (
                <div className={styles.more}>
                  <div className={styles.moreHead}>
                    종목 정보
                    <Link to={'/community?stock=' + it.code} className={styles.chat}>
                      종목 채팅방 ›
                    </Link>
                  </div>
                  <div className={styles.gradeLine}>
                    위험등급 <b className={styles.gradeB}>{it.grade ?? '-'}</b>
                    {it.out === true && ' · 내 투자성향 범위를 벗어난 종목이에요'}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {!noItems && (
          <div className={cx(styles.grid, styles.total)}>
            <span>합계</span>
            <span />
            <span />
            <span className={cx(styles.todaySum, styles[toneOf(pkg.today)])}>{`오늘 ${sign(pkg.today)}${F.won(Math.abs(pkg.today))}`}</span>
            <span className={styles.r}>{F.won(pkg.val)}</span>
            <span className={cx(styles.r, pkg.unpriced === 0 && styles[toneOf(pkg.pnl)])}>
              {pkg.unpriced > 0 ? '-' : sign(pkg.pnl) + F.won(Math.abs(pkg.pnl))}
            </span>
            <span className={cx(styles.r, pkg.unpriced === 0 && styles[toneOf(pkg.pnl)])}>{pkg.unpriced > 0 ? '-' : F.pct(pkg.ret)}</span>
            <span className={styles.avgGrade}>{`가중평균 ${pkg.grade}등급`}</span>
            <span className={styles.r}>100%</span>
            <span />
          </div>
        )}
      </div>
    </div>
  )
}
