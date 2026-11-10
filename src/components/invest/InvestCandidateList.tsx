import '../../styles/tokens.css'
import type { CandidateItem, CandidateList } from '../../api/stockPackage'
import { cx } from '../common/cx'
import { gradeLabel } from './investNewPkgLogic'
import type { LoadState } from './useNewPkgData'
import styles from './InvestCandidateList.module.css'

interface Props {
  state: LoadState
  data: CandidateList | null
  addedCodes: string[] // 이미 담은 종목(종목코드)
  actionLabel: string // 담을 수 있는 종목의 버튼 글자('담기' · '패키지에 담기')
  onPick: (c: CandidateItem) => void
  onShowOut: () => void // 범위 밖 상품도 함께 보기를 켠다
}

// 후보 목록 — 조건에 맞는 상품의 사실 정보(위험등급·연 변동성·테마)만 보여 준다. 순위·점수·추천 이유는 없다
export function InvestCandidateList({ state, data, addedCodes, actionLabel, onPick, onShowOut }: Props) {
  const items = data?.items ?? []
  const added = new Set(addedCodes)
  // 내 성향 범위 안에 후보가 하나도 없을 때는 범위 밖 상품도 볼 수 있다고 알려 준다
  const restrictedEmpty = state === 'ready' && !items.length && !!data?.profileAvailable && !data.includeOutOfProfile

  return (
    <>
      <div className={styles.listHead}>
        <b>후보 목록</b>
        {data && <span className={styles.count}>{data.totalCount}개</span>}
      </div>
      {state === 'loading' && <div className={styles.none}>불러오는 중이에요…</div>}
      {state === 'unauthorized' && <div className={styles.none}>로그인하면 후보를 볼 수 있어요.</div>}
      {state === 'error' && <div className={styles.none}>후보를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</div>}
      {restrictedEmpty && (
        <div className={styles.none}>
          내 투자성향 범위 안에는 조건에 맞는 상품이 없어요.{' '}
          <button type="button" className={styles.hintBtn} onClick={onShowOut}>
            범위 밖 상품도 함께 보기
          </button>
        </div>
      )}
      {items.length > 0 && (
        <div className={styles.list}>
          <div className={cx(styles.candGrid, styles.candHead)}>
            <span>종목</span>
            <span>위험</span>
            <span className={styles.r}>연 변동성</span>
            <span />
          </div>
          {items.map((c) => {
            const has = added.has(c.ticker)
            const label = has ? '담김' : c.selectable ? actionLabel : '담을 수 없음'
            return (
              <div key={c.domesticProductId} className={cx(styles.candGrid, styles.candRow)}>
                <span className={styles.candMain}>
                  <b className={styles.candName}>{c.name}</b>
                  <span className={styles.candSub}>
                    {c.ticker} · {c.type === 'FUND' ? '펀드·ETF' : '주식'}
                    {c.sectorName ? ' · ' + c.sectorName : ''}
                  </span>
                  {c.themes.length > 0 && <span className={styles.candThemes}>{c.themes.join(' · ')}</span>}
                  {!c.selectable && c.unselectableReason && <span className={styles.warn}>{c.unselectableReason}</span>}
                </span>
                <span className={cx(styles.candRisk, c.outOfProfile && styles.warn)}>
                  {gradeLabel(c.riskGrade)}
                  {c.outOfProfile && <span className={styles.outTag}>내 성향 밖</span>}
                </span>
                <span className={styles.r}>{c.volatilityPercent == null ? '-' : c.volatilityPercent + '%'}</span>
                <button type="button" className={cx(styles.pickBtn, (has || !c.selectable) && styles.pickOff)} disabled={has || !c.selectable} onClick={() => onPick(c)}>
                  {label}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
