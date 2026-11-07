import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { PROFILE_KEY } from '../../api/stockPackage'
import type { CandidateItem, RecommendFilter, RecommendItem } from '../../api/stockPackage'
import { F } from '../../lib/calc'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { cx } from '../common/cx'
import { InvestStockName } from './InvestStockName'
import { toneOf } from './investPkgLogic'
import { recToCandidate, useRecommendations } from './useRecommendations'
import { useTendency } from './useNewPkgData'
import styles from './InvestRec.module.css'

interface Props {
  className?: string
  onAdd?: (c: CandidateItem) => void // "패키지에 담기" → 어느 패키지에 담을지 고르는 창
}

const REC_FILTERS: [RecommendFilter, string][] = [
  ['ALL', '전체'],
  ['STOCK', '주식'],
  ['FUND', 'ETF']
]

const ASSESS_PATH = '/myinfo#assess'
const GRADE_WORD: Record<number, string> = { 1: '매우 높은 위험', 2: '높은 위험', 3: '다소 높은 위험', 4: '보통 위험', 5: '낮은 위험', 6: '매우 낮은 위험' }
const RULES = (allow: string) => [
  '내 성향 허용 등급(' + allow + ') 안',
  'RIA 계좌에서 살 수 있는 상품',
  '업종이 겹치지 않게 먼저 담기',
  '과거 3년 시세로 위험등급을 계산한 상품만'
]
const allowedText = (min: number | null) => (min == null ? '' : min === 6 ? '6등급' : min + '~6등급')
const volText = (r: RecommendItem) => (r.volatilityPercent == null ? '계산 전' : r.volatilityPercent + '%')

// 성향별 추천 탭 — 성향별 추천 박스 + 내 추천 기준 박스(넓은 화면 8 : 4, 좁은 화면 한 줄). 추천·이유는 서버 값
export function InvestRec({ className, onAdd }: Props) {
  const [filter, setFilter] = useState<RecommendFilter>('ALL')
  const [open, setOpen] = useState<string | null>(null) // 펼친 종목 코드(하나만)
  const rec = useRecommendations(filter, 6)
  const tendency = useTendency()
  const survey = tendency.data?.survey
  const data = rec.data
  const off = rec.state === 'ready' && data !== null && !data.profileAvailable
  const rows = data && data.profileAvailable ? data.items : []
  const profile = survey?.investorType ? (PROFILE_KEY[survey.investorType] ?? 'neutral') : 'neutral'
  const label = data?.profileLabel ?? survey?.label ?? ''
  const allow = allowedText(data?.allowedMinGrade ?? survey?.allowedMinGrade ?? null)
  const none = !survey?.available && !survey?.expired
  const expired = survey?.expired === true

  return (
    <div className={cx(styles.cols, className)}>
      <section className={styles.box} data-box="rec">
        <div className={styles.head}>
          <h2 className={styles.title}>성향별 추천</h2>
          <span className={styles.sub}>{data?.subtitle ?? ''}</span>
          <span className={styles.filters}>
            {REC_FILTERS.map(([k, name], i) => (
              <span key={k} className={styles.filterItem}>
                {i > 0 && <span className={styles.sep}>·</span>}
                <button
                  type="button"
                  className={cx(styles.filter, filter === k && styles.filterOn)}
                  onClick={() => {
                    setFilter(k)
                    setOpen(null)
                  }}
                >
                  {name}
                </button>
              </span>
            ))}
          </span>
        </div>

        {rec.state === 'loading' && <div className={styles.none}>추천을 불러오고 있어요…</div>}
        {rec.state === 'unauthorized' && <div className={styles.none}>로그인이 필요해요. 로그인한 뒤 다시 열어 주세요.</div>}
        {rec.state === 'error' && <div className={styles.none}>추천을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.</div>}

        {rows.length > 0 && (
          <div className={cx(styles.grid, styles.cols0)}>
            <span>종목</span>
            <span className={styles.r}>현재가</span>
            <span>위험</span>
            <span>추천 이유</span>
            <span />
          </div>
        )}

        {rows.map((r) => {
          const on = open === r.ticker
          const q = rec.quotes[r.ticker]
          const received = Object.prototype.hasOwnProperty.call(rec.quotes, r.ticker) // 시세 응답이 왔는지(못 받은 종목과 받는 중을 구분)
          return (
            <div key={r.ticker} className={styles.rowBox}>
              <button type="button" className={cx(styles.grid, styles.row, on && styles.rowOn)} aria-expanded={on} onClick={() => setOpen(on ? null : r.ticker)}>
                <span className={styles.stock}>
                  <InvestStockName code={r.ticker} name={r.name} />
                </span>
                <span className={styles.px}>
                  {q ? (
                    <>
                      <span>{F.won(q.price)}</span>
                      <span className={cx(styles.chg, styles[toneOf(q.chg)])}>{F.pct(q.chg)}</span>
                    </>
                  ) : (
                    <span>{received ? '확인 불가' : '…'}</span>
                  )}
                </span>
                <span className={styles.risk}>{r.riskGrade + '등급 · ' + (GRADE_WORD[r.riskGrade] ?? '')}</span>
                <span className={styles.reason}>{r.reasons[0]}</span>
                <span className={styles.chev}>
                  <svg className={cx(on && styles.chevOpen)} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              {on && (
                <div className={styles.more}>
                  <div className={styles.moreCol}>
                    <div className={styles.mk}>추천 이유</div>
                    <div className={styles.why}>{r.reasons.join(' ')}</div>
                    <div className={cx(styles.mk, styles.mkGap)}>
                      종목 정보 <span className={styles.ai}>AI 요약</span>
                    </div>
                    <div className={styles.facts}>
                      {(
                        [
                          ['유형', r.type === 'FUND' ? '펀드·ETF' : '주식'],
                          ['업종', r.sectorName ?? '–'],
                          ['연 변동성', volText(r)],
                          ['테마', r.themes.length ? r.themes.join(' · ') : '–']
                        ] as [string, string][]
                      ).map(([k, v], i) => (
                        <div key={k} className={cx(styles.fact, i > 0 && styles.factLine)}>
                          <span className={styles.fk}>{k}</span>
                          <b className={styles.fv}>{v}</b>
                        </div>
                      ))}
                    </div>
                    <div className={styles.gradeLine}>
                      {`위험등급 `}
                      <b className={styles.bold}>{r.riskGrade}</b>
                      {` · 근거 과거 3년 가격 변동(리턴증권 자체 산정)`}
                    </div>
                    <div className={styles.asOf}>{data ? F.dot(data.checkedAt.slice(0, 10)) + ' 기준' : ''}</div>
                  </div>
                  <div className={styles.moreCol}>
                    <div className={styles.r30Head}>최근 30일</div>
                    <div className={styles.asOf}>가격 이력은 제공하지 않아요</div>
                    <button type="button" className={styles.add} onClick={() => onAdd?.(recToCandidate(r))}>
                      패키지에 담기
                    </button>
                    <Link className={styles.againLink} to={'/community?stock=' + r.ticker}>
                      종목 채팅방 ›
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {rec.state === 'ready' && !off && rows.length === 0 && filter !== 'ALL' && <div className={styles.none}>이 분류에는 추천할 상품이 없어요</div>}

        {rec.state === 'ready' && !off && rows.length === 0 && filter === 'ALL' && (
          <div className={styles.emptyBox}>
            <KkiruAvatar profile={profile} size={48} />
            <div className={styles.emptyBody}>
              <div className={styles.emptyT1}>{label + '은 ' + allow + ' 상품을 추천받을 수 있어요.'}</div>
              <div className={styles.emptyT2}>RIA 계좌에서 살 수 있고 위험등급이 계산된 상품 중 내 성향 범위에 맞는 것이 지금은 없어요.</div>
              <Link className={styles.emptyLink} to={ASSESS_PATH}>
                투자성향 다시 확인하기 ›
              </Link>
            </div>
          </div>
        )}

        {off && (
          <div className={styles.offBox}>
            <p className={styles.offMsg}>{none ? '투자성향을 진단하면 성향에 맞는 범위 안에서 추천을 받을 수 있어요.' : '진단 유효기간이 지나 추천을 보여드릴 수 없어요.'}</p>
            <Link className={styles.offBtn} to={ASSESS_PATH}>
              {none ? '진단하기' : '다시 진단하기'}
            </Link>
          </div>
        )}

        <div className={styles.guide}>{data?.disclaimer ?? '교육용 프로젝트의 자체 분석 결과예요. 수익을 보장하지 않으며, 실제 금융상품 판매·권유 절차를 대체하지 않아요.'}</div>
      </section>

      <section className={styles.box} data-box="rec-basis">
        <div className={styles.head}>
          <h2 className={styles.title}>내 추천 기준</h2>
        </div>
        <div className={styles.prof}>
          <KkiruAvatar profile={profile} size={48} />
          <div className={styles.profText}>
            <b className={styles.profLine}>{none ? '미진단' : label + (allow ? ' · ' + allow : '')}</b>
            <span className={styles.assess}>
              {survey?.assessedAt ? '진단일 ' + F.dot(survey.assessedAt.slice(0, 10)) : ''}
              {expired && (
                <>
                  {' '}
                  <span className={styles.expired}>진단 만료</span>
                </>
              )}
            </span>
          </div>
        </div>
        <div className={styles.rules}>
          <div className={styles.rulesTitle}>추천 기준</div>
          {RULES(allow || '내 성향').map((text, i, all) => (
            <div key={text} className={cx(styles.rule, i < all.length - 1 && styles.ruleLine)}>
              <b className={styles.ruleN}>{i + 1}</b>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className={styles.again}>
          <Link className={styles.againLink} to={ASSESS_PATH}>
            투자성향 다시 확인하기 ›
          </Link>
        </div>
      </section>
    </div>
  )
}
