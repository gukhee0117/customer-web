import { useEffect, useMemo, useRef, useState } from 'react'
import '../../styles/tokens.css'
import { F } from '../../lib/calc'
import { cx } from '../common/cx'
import { InvestHoldings } from './InvestHoldings'
import { InvestPkgWeight } from './InvestPkgWeight'
import { detailOf, sign, toneOf } from './investPkgLogic'
import type { PkgView } from './investPkgLogic'
import styles from './InvestPkgDetail.module.css'

const signedWon = (n: number) => sign(n) + '₩' + F.won(Math.abs(n))

// 위험 요약 칸에 보이는 서버 값(화면에서 만들지 않는다)
export interface PkgRisk {
  profRange: string // 예: '적극투자형, 2등급까지'(진단이 없으면 '-')
  vol: string // 패키지 연 변동성(계산하지 못했으면 '-')
  volNote: string // 변동성 옆 설명
  checking: boolean // 다시 검사 중
}

interface Props {
  className?: string
  pkg: PkgView
  risk: PkgRisk
  onRecheck?: () => void // 다시 검사(서버에서 변동성을 다시 계산)
  onBuy?: () => void // 패키지 한 번에 사기 창 열기
  onAdd?: () => void // 종목 추가 창 열기
  onTrade?: (code: string, side: 'buy' | 'sell') => void // 보유 종목 표의 매수·매도 버튼
  onRename?: (name: string) => void // 바꿀 이름(앞뒤 공백을 뺀 값, 비어 있지 않을 때만 호출)
  onDelete?: () => void // 메뉴의 삭제(확인 창은 화면에서)
}

// 선택한 패키지 상세 — 머리 줄·수치 줄·위험 요약·종목 비중·수익률 차트·보유 종목 표
export function InvestPkgDetail({ className, pkg, risk, onRecheck, onBuy, onAdd, onTrade, onRename, onDelete }: Props) {
  const [menu, setMenu] = useState(false)
  // 이름 바꾸는 중인 패키지(다른 패키지를 고르면 자동으로 끝남) — 입력칸에서 엔터·바깥 클릭은 저장, Esc는 취소
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelled = useRef(false)
  const editing = editId === pkg.id
  // 다른 패키지가 선택되면 이름 바꾸기는 끝남(삭제로 선택이 바뀔 때도)
  const [seenId, setSeenId] = useState(pkg.id)
  if (seenId !== pkg.id) {
    setSeenId(pkg.id)
    setEditId(null)
  }
  const [hov, setHov] = useState<string | null>(null) // 도넛·줄에서 마우스를 올린 종목(보유 종목 표 줄과 함께 강조)
  const d = detailOf(pkg)
  const noItems = pkg.items.length === 0
  // 종목별 수익률(%) = (현재가 - 평균 매입가) / 평균 매입가. 보유하고 현재가가 있는 종목만, 막대 길이는 가장 큰 절댓값 기준
  const retRows = useMemo(() => {
    const held = pkg.items
      .filter((i) => i.qty > 0 && i.priced && i.cost > 0)
      .map((i) => ({ code: i.code, name: i.name, ret: ((i.val - i.cost) / i.cost) * 100 }))
    const retMax = Math.max(1, ...held.map((r) => Math.abs(r.ret)))
    return held.map((r) => ({ ...r, width: Math.max(2, (Math.abs(r.ret) / retMax) * 100) }))
  }, [pkg])

  useEffect(() => {
    if (!editing) return
    const t = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 30)
    return () => clearTimeout(t)
  }, [editing])

  const startRename = () => {
    cancelled.current = false
    setDraft(pkg.name)
    setEditId(pkg.id)
  }
  const commitRename = () => {
    if (cancelled.current || !editing) return
    const v = draft.trim()
    if (v) onRename?.(v)
    setEditId(null)
  }

  return (
    <section className={cx(styles.box, className)} data-pkg-detail="1">
      <div className={styles.head}>
        <div className={styles.titleWrap}>
          {!editing && (
            <>
              <h2 className={styles.name}>{pkg.name}</h2>
              <button type="button" className={styles.pencil} aria-label="패키지 이름 바꾸기" onClick={startRename}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </>
          )}
          {editing && (
            <input
              ref={inputRef}
              className={styles.nameInput}
              value={draft}
              maxLength={20}
              aria-label="패키지 이름"
              onChange={(e) => setDraft(e.target.value.slice(0, 20))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  cancelled.current = true
                  setEditId(null)
                }
              }}
              onBlur={commitRename}
            />
          )}
          <span className={styles.meta}>
            {pkg.items.length}종목 · 만든 날 {d.made}
          </span>
        </div>
        <div className={styles.btns}>
          <button type="button" className={styles.buy} onClick={onBuy}>
            패키지 한 번에 사기
          </button>
          <button type="button" className={styles.add} onClick={onAdd}>
            + 종목 추가
          </button>
          <span className={styles.menuWrap}>
            <button type="button" className={styles.more} aria-label="패키지 메뉴" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              …
            </button>
            {menu && (
              <>
                <div className={styles.backdrop} onClick={() => setMenu(false)} />
                <div role="menu" className={styles.menu}>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={() => {
                      setMenu(false)
                      startRename()
                    }}
                  >
                    이름 바꾸기
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={() => {
                      setMenu(false)
                      onDelete?.()
                    }}
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </span>
        </div>
      </div>

      <div className={styles.sums}>
        <div className={styles.sum}>
          <span className={styles.k}>평가금액</span>
          <span className={styles.valRow}>
            <b className={styles.val}>₩{F.won(pkg.val)}</b>
            <span className={styles.cost}>{pkg.unpriced > 0 ? '현재가 없는 ' + pkg.unpriced + '종목 제외' : '원금 ₩' + F.won(pkg.cost)}</span>
          </span>
        </div>
        <div className={cx(styles.sum, styles.sumLeft)}>
          <span className={styles.k}>평가손익</span>
          <b className={cx(styles.v, pkg.unpriced === 0 && styles[toneOf(pkg.pnl)])}>{pkg.unpriced > 0 ? '-' : signedWon(pkg.pnl)}</b>
        </div>
        <div className={cx(styles.sum, styles.sumRet)}>
          <span className={styles.k}>수익률</span>
          <b className={cx(styles.v, pkg.unpriced === 0 && styles[toneOf(pkg.pnl)])}>{pkg.unpriced > 0 ? '-' : F.pct(pkg.ret)}</b>
        </div>
        <div className={cx(styles.sum, styles.sumLeft, styles.sumToday)}>
          <span className={styles.k}>오늘 손익</span>
          <b className={cx(styles.v, styles[toneOf(pkg.today)])}>
            {signedWon(pkg.today)} ({F.pct(pkg.todayPct)})
          </b>
        </div>
      </div>

      {pkg.unpriced > 0 && <div className={styles.unpriced}>현재가를 받지 못한 보유 종목이 {pkg.unpriced}개 있어요. 그 종목은 평가금액에 들어가지 않았고, 평가손익과 수익률은 확인할 수 없어요.</div>}

      <div className={styles.risk}>
        {noItems && <div className={styles.empty}>담은 종목이 없어요</div>}
        {!noItems && (
          <div className={styles.riskBox}>
            <button type="button" className={styles.recheck} disabled={risk.checking} onClick={onRecheck}>
              {risk.checking ? '검사 중…' : '다시 검사'}
            </button>
            <div className={styles.riskGrid}>
              <div className={styles.riskCell}>
                <div className={styles.k}>구성 종목 위험등급 가중평균</div>
                <div className={styles.rv}>
                  {pkg.grade}등급 <span className={styles.note}>(참고 지표)</span>
                </div>
              </div>
              <div className={styles.riskCell}>
                <div className={styles.k}>패키지 연 변동성</div>
                <div className={styles.rv}>
                  {risk.vol} <span className={styles.note}>{risk.volNote}</span>
                </div>
              </div>
              <div className={styles.riskCell}>
                <div className={styles.k}>내 성향({risk.profRange}) 범위를 벗어난 종목</div>
                <div className={cx(styles.rv, d.outCount > 0 && styles.warn)}>{d.outCount}개</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!noItems && (
        <div className={styles.charts}>
          <InvestPkgWeight pkg={pkg} hov={hov} onHov={setHov} />
          <div className={styles.chartNote}>
            <div className={styles.chartNoteTitle}>
              패키지 수익률{' '}
              <b className={cx(styles.retTotal, pkg.unpriced === 0 && styles[toneOf(pkg.pnl)])}>{pkg.unpriced > 0 ? '-' : F.pct(pkg.ret)}</b>
            </div>
            <div className={styles.retList}>
              {retRows.map((r) => (
                <div key={r.code} className={styles.retRow}>
                  <span className={styles.retName}>{r.name}</span>
                  <span className={styles.retTrack}>
                    <span className={cx(styles.retBar, styles[toneOf(r.ret)])} style={{ width: r.width + '%' }} />
                  </span>
                  <b className={cx(styles.retPct, styles[toneOf(r.ret)])}>{F.pct(r.ret)}</b>
                </div>
              ))}
              {retRows.length === 0 && <p className={styles.chartNoteBody}>보유하고 현재가를 받은 종목이 없어서 수익률을 계산할 수 없어요.</p>}
            </div>
          </div>
        </div>
      )}
      <InvestHoldings pkg={pkg} hov={hov} onHov={setHov} onAdd={onAdd} onBuy={(c) => onTrade?.(c, 'buy')} onSell={(c) => onTrade?.(c, 'sell')} />
    </section>
  )
}
