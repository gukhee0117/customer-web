import { useEffect, useRef } from 'react'
import '../../styles/tokens.css'
import type { CandidateItem } from '../../api/stockPackage'
import { StockIcon } from '../common/StockIcon'
import { cx } from '../common/cx'
import { cleanPct, pctInt } from './investAddLogic'
import type { AddState } from './investAddLogic'
import { gradeLabel } from './investNewPkgLogic'
import type { PkgView } from './investPkgLogic'
import { InvestSidePanel, PanelClose } from './InvestSidePanel'
import { useCandidateList, useDebounced } from './useNewPkgData'
import panel from './InvestSidePanel.module.css'
import styles from './InvestAddPanel.module.css'

const SHOW_MAX = 50 // 좁은 창이라 앞쪽만 그린다. 더 보려면 검색어로 좁힌다

interface Props {
  pkg: PkgView
  add: AddState
  names: Record<string, string> // 패키지에 담긴 종목 이름(종목코드 → 이름)
  onChange: (patch: Partial<AddState>) => void
  onClose: () => void
  onPick: (c: CandidateItem) => void // "담기" — 성향 밖 종목이면 확인을 거쳐 비중 입력으로
  onAdd: (code: string, target: number, adj: Record<string, string> | null) => void
}

// "종목 추가" 창 — 종목을 검색해 골라 목표 비중을 정해 패키지에 담는다(사지는 않음)
// 목록은 이름·코드 검색 결과(없으면 가나다순)이고 추천·순위는 없다. 내 성향 밖 상품은 표시해서 보여 준다
export function InvestAddPanel({ pkg, add, names, onChange, onClose, onPick, onAdd }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const adjusting = !!add.adj

  useEffect(() => {
    if (adjusting) bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [adjusting])

  const keyword = useDebounced(add.q.trim(), 300)
  const list = useCandidateList({ keyword, includeOutOfProfile: true, sort: 'NAME', direction: 'ASC' }, true)
  const items = (list.data?.items ?? []).slice(0, SHOW_MAX)
  const inPkg = new Set(pkg.items.map((i) => i.code))
  const nameOf = (c: string) => names[c] || add.info[c]?.name || c

  const curSum = pkg.items.reduce((a, i) => a + i.target, 0)
  const t = pctInt(add.pct)
  const addOk = !!add.pick && t > 0 && t <= 100
  const adjSum = add.adj ? Object.values(add.adj).reduce((a, v) => a + pctInt(v), 0) : 0
  const adjOk = adjSum === 100

  const submitPct = () => {
    if (!addOk || !add.pick) return
    // 서버는 목표 비중 합이 정확히 100%일 때만 저장하므로, 합이 100이 아니면 다른 종목 비중을 맞추는 단계로
    if (curSum + t !== 100) onChange({ adj: Object.fromEntries(pkg.items.map((i) => [i.code, String(i.target)]).concat([[add.pick, String(t)]])) })
    else onAdd(add.pick, t, null)
  }

  return (
    <InvestSidePanel label="종목 추가" onClose={onClose} wide>
      <div className={panel.planHead}>
        <h2 className={panel.planTitle}>종목 추가</h2>
        <span className={panel.planName}>{pkg.name}</span>
        <PanelClose onClose={onClose} />
      </div>
      <div className={styles.searchBar}>
        <label className={styles.search}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input className={styles.searchInput} value={add.q} onChange={(e) => onChange({ q: e.target.value.slice(0, 30) })} placeholder="종목명 또는 코드" aria-label="종목 검색" />
        </label>
      </div>
      <div ref={bodyRef} className={styles.addBody}>
        {add.adj && (
          <div className={styles.adj}>
            <div className={styles.adjTitle}>종목별 목표 비중을 조정해 합계를 100%로 맞춰 주세요</div>
            {Object.keys(add.adj).map((c) => (
              <div key={c} className={styles.adjRow}>
                <span className={cx(styles.adjName, c === add.pick && styles.adjNameOn)}>{nameOf(c)}</span>
                <input className={styles.pctInput} value={add.adj?.[c] ?? ''} onChange={(e) => onChange({ adj: { ...add.adj, [c]: cleanPct(e.target.value) } })} inputMode="numeric" aria-label={nameOf(c) + ' 목표 비중'} />
                <span>%</span>
              </div>
            ))}
            <div className={styles.adjFoot}>
              <span>
                합계 <b style={{ color: adjOk ? 'var(--color-navy)' : 'var(--color-red)' }}>{adjSum}%</b>
              </span>
              <button type="button" className={cx(styles.smallBtn, adjOk ? styles.smallOn : styles.smallOff)} disabled={!adjOk} onClick={() => add.pick && onAdd(add.pick, pctInt(add.adj?.[add.pick]), add.adj)}>
                비중 맞추고 추가
              </button>
            </div>
          </div>
        )}

        <div className={styles.groupTitle}>{add.q.trim() ? '검색 결과' : '종목명 가나다순'}</div>
        {list.state === 'loading' && <div className={styles.groupEmpty}>불러오는 중이에요…</div>}
        {list.state === 'unauthorized' && <div className={styles.groupEmpty}>로그인하면 종목을 볼 수 있어요</div>}
        {list.state === 'error' && <div className={styles.groupEmpty}>불러오지 못했어요. 잠시 후 다시 시도해 주세요</div>}
        {list.state === 'ready' && !items.length && <div className={styles.groupEmpty}>검색 결과가 없어요</div>}
        {items.map((c) => {
          const has = inPkg.has(c.ticker)
          return (
            <div key={c.domesticProductId} className={styles.addItem}>
              <div className={styles.addRow}>
                <div className={styles.addMain}>
                  <div className={styles.addLabel}>
                    <span className={styles.blkLabel}>
                      <StockIcon color="var(--color-line-strong)" initial={c.name.slice(0, 1)} size={20} code={c.ticker} />
                      <b className={styles.blkName}>{c.name}</b>
                      <span className={styles.blkCode}>{c.ticker}</span>
                      <span className={styles.blkSector}>{c.type === 'FUND' ? '펀드·ETF' : (c.sectorName ?? '주식')}</span>
                    </span>
                  </div>
                  <div className={styles.addRisk} style={{ color: !c.selectable ? 'var(--color-muted)' : c.outOfProfile ? 'var(--color-orange)' : 'var(--color-sub)' }}>
                    {c.riskGrade == null ? '위험 등급 없음' : '위험 ' + gradeLabel(c.riskGrade) + (c.outOfProfile ? ' · 내 성향 밖' : '')}
                  </div>
                </div>
                <span className={styles.addPx}>
                  <span className={styles.addPxVal}>{c.volatilityPercent == null ? '-' : c.volatilityPercent + '%'}</span>
                  <span className={styles.addChg}>연 변동성</span>
                </span>
                <span className={styles.addAct}>
                  {!c.selectable && (
                    <span className={styles.blkMsg}>
                      <span>담을 수 없어요</span>
                      <span>{c.unselectableReason}</span>
                    </span>
                  )}
                  {c.selectable && !has && (
                    <button type="button" className={styles.pickBtn} onClick={() => onPick(c)}>
                      담기
                    </button>
                  )}
                  {has && <span className={styles.has}>담겨 있음</span>}
                </span>
              </div>
              {add.pick === c.ticker && !add.adj && (
                <div className={styles.pickRow}>
                  <span className={styles.pickLabel}>목표 비중</span>
                  <input className={cx(styles.pctInput, styles.pctInputPick)} value={add.pct} onChange={(e) => onChange({ pct: cleanPct(e.target.value) })} inputMode="numeric" aria-label="목표 비중" />
                  <span>%</span>
                  <span className={styles.curSum}>지금 합계 {curSum}%</span>
                  <button type="button" className={cx(styles.smallBtn, addOk ? styles.smallOn : styles.smallOff)} disabled={!addOk} onClick={submitPct}>
                    추가
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {list.data && list.data.totalCount > items.length && <div className={styles.groupEmpty}>{list.data.totalCount}개 중 앞 {items.length}개만 보여요. 검색어로 좁혀 보세요</div>}
      </div>
    </InvestSidePanel>
  )
}
