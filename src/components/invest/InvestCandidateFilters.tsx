import '../../styles/tokens.css'
import type { CandidateSortKey, ProductType, SortDirectionKey } from '../../api/stockPackage'
import { cx } from '../common/cx'
import { toggleIn } from './candidateFilter'
import type { FilterState } from './candidateFilter'
import { gradeLabel } from './investNewPkgLogic'
import styles from './InvestCandidateFilters.module.css'

const GRADES = [1, 2, 3, 4, 5, 6]

interface Props {
  filter: FilterState
  onChange: (fn: (f: FilterState) => FilterState) => void
  themes: string[]
  canIncludeOut: boolean // 유효한 투자성향 진단이 있을 때만 "범위 밖 포함"을 고를 수 있다
}

// 직접 조건 고르기 — 상품군 · 테마 · 위험등급 범위 · 정렬 · 검색. 어느 것도 상품의 우열을 나타내지 않는다
export function InvestCandidateFilters({ filter, onChange, themes, canIncludeOut }: Props) {
  const gradeSelect = (value: number | null, key: 'minGrade' | 'maxGrade', label: string) => (
    <select className={styles.select} value={value ?? ''} onChange={(e) => onChange((f) => ({ ...f, [key]: e.target.value ? Number(e.target.value) : null }))} aria-label={label}>
      <option value="">제한 없음</option>
      {GRADES.map((g) => (
        <option key={g} value={g}>
          {gradeLabel(g)}
        </option>
      ))}
    </select>
  )

  return (
    <details className={styles.box} open>
      <summary className={styles.boxTitle}>직접 조건 고르기</summary>
      <div className={styles.filterRow}>
        <span className={styles.filterK}>상품군</span>
        <span className={styles.chips}>
          {(['STOCK', 'FUND'] as ProductType[]).map((t) => (
            <button key={t} type="button" className={cx(styles.chip, filter.types.includes(t) && styles.chipOn)} aria-pressed={filter.types.includes(t)} onClick={() => onChange((f) => ({ ...f, types: toggleIn(f.types, t) }))}>
              {t === 'STOCK' ? '주식' : '펀드·ETF'}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.filterRow}>
        <span className={styles.filterK}>테마</span>
        <span className={styles.chips}>
          {themes.map((t) => (
            <button key={t} type="button" className={cx(styles.chip, filter.themes.includes(t) && styles.chipOn)} aria-pressed={filter.themes.includes(t)} onClick={() => onChange((f) => ({ ...f, themes: toggleIn(f.themes, t) }))}>
              {t}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.filterRow}>
        <span className={styles.filterK}>위험등급</span>
        <span className={styles.inline}>
          {gradeSelect(filter.minGrade, 'minGrade', '위험등급 시작')}
          <span>부터</span>
          {gradeSelect(filter.maxGrade, 'maxGrade', '위험등급 끝')}
          <span>까지</span>
        </span>
      </div>
      <div className={styles.filterRow}>
        <span className={styles.filterK}>정렬</span>
        <span className={styles.inline}>
          <select className={styles.select} value={filter.sort} onChange={(e) => onChange((f) => ({ ...f, sort: e.target.value as CandidateSortKey }))} aria-label="정렬 기준">
            <option value="NAME">종목명 가나다순</option>
            <option value="RISK_GRADE">위험등급순</option>
            <option value="VOLATILITY">연 변동성순</option>
          </select>
          <select className={styles.select} value={filter.direction} onChange={(e) => onChange((f) => ({ ...f, direction: e.target.value as SortDirectionKey }))} aria-label="정렬 방향">
            <option value="ASC">{filter.sort === 'NAME' ? '가나다순' : filter.sort === 'RISK_GRADE' ? '1등급부터' : '작은 값부터'}</option>
            <option value="DESC">{filter.sort === 'NAME' ? '역순' : filter.sort === 'RISK_GRADE' ? '6등급부터' : '큰 값부터'}</option>
          </select>
        </span>
      </div>
      <div className={styles.filterRow}>
        <span className={styles.filterK}>검색</span>
        <input className={styles.searchInput} value={filter.keyword} onChange={(e) => onChange((f) => ({ ...f, keyword: e.target.value.slice(0, 30) }))} placeholder="종목명이나 코드" aria-label="종목 검색" />
      </div>
      {canIncludeOut && (
        <label className={styles.check}>
          <input type="checkbox" checked={filter.includeOut} onChange={(e) => onChange((f) => ({ ...f, includeOut: e.target.checked }))} />
          <span>내 투자성향 범위 밖 상품도 함께 보기</span>
        </label>
      )}
    </details>
  )
}
