import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { PROFILE_KEY } from '../../api/stockPackage'
import type { CandidateItem } from '../../api/stockPackage'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { cx } from '../common/cx'
import { EMPTY_FILTER, requestOf } from './candidateFilter'
import type { FilterState } from './candidateFilter'
import { InvestCandidateFilters } from './InvestCandidateFilters'
import { InvestCandidateList } from './InvestCandidateList'
import { useCandidateList, useDebounced, useTendency, useThemes } from './useNewPkgData'
import styles from './InvestCandidateTab.module.css'

interface Props {
  className?: string
  onAdd: (c: CandidateItem) => void // 어느 패키지에 담을지 고르는 창으로 이어짐
}

const ASSESS_PATH = '/myinfo#assess'

// 후보 보기 탭 — 조건으로 거른 상품을 중립 순서로 보여 준다(가나다순 기본). 추천·순위·이유는 없고, 담을지는 고객이 정한다
export function InvestCandidateTab({ className, onAdd }: Props) {
  const tendency = useTendency()
  const themes = useThemes()
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER)
  const keyword = useDebounced(filter.keyword.trim(), 300)
  const list = useCandidateList(requestOf(filter, keyword), true)
  const survey = tendency.data?.survey
  const profile = survey?.investorType ? (PROFILE_KEY[survey.investorType] ?? 'neutral') : 'neutral'

  return (
    <div className={cx(styles.cols, className)}>
      <section className={styles.box} data-box="rec">
        <div className={styles.head}>
          <h2 className={styles.title}>후보 보기</h2>
          <span className={styles.sub}>조건으로 거른 상품을 같은 기준으로 보여드려요 · 추천이 아니에요</span>
        </div>
        <div className={styles.body}>
          <InvestCandidateFilters filter={filter} onChange={setFilter} themes={themes} canIncludeOut={!!survey?.available} />
          <InvestCandidateList state={list.state} data={list.data} addedCodes={[]} actionLabel="패키지에 담기" onPick={onAdd} onShowOut={() => setFilter((f) => ({ ...f, includeOut: true }))} />
        </div>
      </section>

      <section className={styles.box} data-box="rec-basis">
        <div className={styles.head}>
          <h2 className={styles.title}>내 투자성향</h2>
        </div>
        <div className={styles.body}>
          <div className={styles.prof}>
            <KkiruAvatar profile={profile} size={48} />
            <div className={styles.profText}>
              <b className={styles.profLine}>{survey?.available ? (survey.label ?? '') + ' · 허용 ' + survey.allowedMinGrade + '등급까지' : '투자성향을 확인할 수 없어요'}</b>
              {survey?.assessedAt && <span className={styles.assess}>진단일 {survey.assessedAt.slice(0, 10).replace(/-/g, '.')}</span>}
            </div>
          </div>
          {tendency.state === 'loading' && <p className={styles.plain}>불러오는 중이에요…</p>}
          {tendency.state === 'unauthorized' && <p className={styles.plain}>로그인하면 내 투자성향을 볼 수 있어요.</p>}
          {tendency.state === 'error' && <p className={styles.plain}>투자성향을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>}
          {tendency.state === 'ready' && tendency.data && !survey?.available && <p className={styles.plain}>투자성향 진단이 없거나 유효기간이 지났어요. 진단 후에 종목을 담을 수 있어요.</p>}
          {tendency.state === 'ready' &&
            tendency.data?.explanation.map((b) => (
              <div key={b.metric} className={styles.blk}>
                <b className={styles.blkTitle}>{b.title}</b>
                {b.facts.map((f) => (
                  <span key={f} className={styles.fact}>
                    {f}
                  </span>
                ))}
                <details className={styles.defn}>
                  <summary>뜻 보기</summary>
                  <span>{b.definition}</span>
                </details>
              </div>
            ))}
          <Link className={styles.againLink} to={ASSESS_PATH}>
            투자성향 다시 확인하기 ›
          </Link>
        </div>
      </section>
    </div>
  )
}
