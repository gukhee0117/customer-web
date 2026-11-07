import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { PROFILE_KEY } from '../../api/stockPackage'
import type { CandidateItem, RecommendBasis, RecommendFilter, RecommendItem } from '../../api/stockPackage'
import { F } from '../../lib/calc'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { cx } from '../common/cx'
import { InvestRecSectors } from './InvestRecSectors'
import { InvestRiskGauge } from './InvestRiskGauge'
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
const BASES: [RecommendBasis, string][] = [
  ['SURVEY', '설문으로 본 성향'],
  ['TRADING', '거래로 본 경향']
]
const GRADE_WORD: Record<number, string> = { 1: '매우 높은 위험', 2: '높은 위험', 3: '다소 높은 위험', 4: '보통 위험', 5: '낮은 위험', 6: '매우 낮은 위험' }
const TRADING_RULES = [
  '내 평균 매수 위험등급 앞뒤 1등급 안(설문 허용 범위와 겹치는 구간)',
  '많이 산 업종·테마와 같은 상품 먼저',
  '지금 보유 중인 종목은 제외',
  '과거 3년 시세로 위험등급을 계산한 상품만'
]
const RULES = (allow: string) => [
  '내 성향 허용 등급(' + allow + ') 안',
  'RIA 계좌에서 살 수 있는 상품',
  '지금 보유 중인 종목은 제외',
  '많이 산 업종·테마와 같은 상품 먼저(거래 내역이 있을 때)',
  '업종이 겹치지 않게 먼저 담기',
  '과거 3년 시세로 위험등급을 계산한 상품만'
]
const allowedText = (min: number | null) => (min == null ? '' : min === 6 ? '6등급' : min + '~6등급')
const volText = (r: RecommendItem) => (r.volatilityPercent == null ? '계산 전' : r.volatilityPercent + '%')
const gradeRangeText = (from: number, to: number) => (from === to ? from + '등급' : from + '~' + to + '등급')
// 업종 열: 펀드·ETF는 업종이 없어 유형으로 보인다
const sectorText = (r: RecommendItem) => (r.type === 'FUND' ? '펀드·ETF' : (r.sectorName ?? '–'))

// 추천 이유 칸의 태그 = 이 종목을 고른 이유. 서버가 준 값(targetGrade·sectorMatched·matchedTheme)만 쓰고 이유 문장은 읽지 않는다.
// on이면 강조(내가 많이 산 업종·테마와 같다는 뜻). 업종 이름은 업종 열에 있어서 태그에 쓰지 않는다
interface Tag {
  key: string
  text: string
  on: boolean
  hint?: string
}
const tagsOf = (r: RecommendItem, targetGrade: number | null): Tag[] => {
  const tags: Tag[] = []
  // 서버는 목표 등급을 소수로 주고, 범위 중심은 그 값을 반올림한 정수다
  if (targetGrade != null && r.riskGrade === Math.round(targetGrade)) tags.push({ key: 'target', text: '목표 등급', on: false, hint: '추천 목표 등급과 같은 위험등급이에요' })
  if (r.sectorMatched) tags.push({ key: 'sector', text: '많이 산 업종', on: true, hint: '내가 가장 많이 산 업종과 같아요' })
  if (r.matchedTheme) tags.push({ key: 'theme', text: '많이 산 테마 · ' + r.matchedTheme, on: true, hint: '내가 가장 많이 산 테마와 같아요' })
  // 고른 이유 태그가 하나도 없으면 목표 등급과의 차이로 기본 태그 하나를 보여 준다(1등급 이내면 "근처", 그 밖은 "범위 안")
  if (tags.length === 0 && targetGrade != null) {
    const near = Math.abs(r.riskGrade - targetGrade) <= 1
    tags.push({ key: 'near', text: near ? '목표 등급 근처' : '목표 등급 범위 안', on: false })
  }
  return tags
}

// 오늘의 종목 탭 — 오늘의 종목 박스 + 내 추천 기준 박스(넓은 화면 8 : 4, 좁은 화면 한 줄). 추천·이유는 서버 값
export function InvestRec({ className, onAdd }: Props) {
  const [filter, setFilter] = useState<RecommendFilter>('ALL')
  const [basis, setBasis] = useState<RecommendBasis>('SURVEY')
  const [open, setOpen] = useState<string | null>(null) // 펼친 종목 코드(하나만)
  const rec = useRecommendations(filter, 6, basis)
  const tendency = useTendency()
  const survey = tendency.data?.survey
  const data = rec.data
  const trading = basis === 'TRADING'
  const off = rec.state === 'ready' && data !== null && !data.basisAvailable
  const rows = data && data.basisAvailable ? data.items : []
  const profile = survey?.investorType ? (PROFILE_KEY[survey.investorType] ?? 'neutral') : 'neutral'
  const label = data?.profileLabel ?? survey?.label ?? ''
  const allow = allowedText(data?.allowedMinGrade ?? survey?.allowedMinGrade ?? null)
  const none = !survey?.available && !survey?.expired
  const expired = survey?.expired === true
  // 위험등급 게이지: 설문 허용 범위·평균 매수 등급은 경향(useTendency) 값, 추천 범위는 거래 기준 탭에서만
  const tend = tendency.state === 'ready' ? tendency.data : null
  const tradeOn = trading && data?.basisAvailable === true
  const recRange: [number, number] | null = tradeOn && data.gradeFrom != null && data.gradeTo != null ? [data.gradeFrom, data.gradeTo] : null
  // 부제목에 실제 추천 범위(서버 gradeFrom~gradeTo)를 한 번 보여 준다. 범위를 못 받으면 서버 부제목 그대로
  const range = data?.basisAvailable && data.gradeFrom != null && data.gradeTo != null ? gradeRangeText(data.gradeFrom, data.gradeTo) : null
  const subtitle =
    range == null
      ? (data?.subtitle ?? '')
      : trading
        ? '내 거래 경향 · ' + range + ' 안에서 (투자성향 허용 범위 안)'
        : (label || '내 성향') + ' · ' + range + ' 안에서'

  return (
    <div className={cx(styles.cols, className)}>
      <section className={styles.box} data-box="rec">
        <div className={styles.head}>
          <h2 className={styles.title}>오늘의 종목</h2>
          <span className={styles.sub}>{subtitle}</span>
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

        <div className={styles.basisRow} role="group" aria-label="추천 기준">
          {BASES.map(([k, name]) => (
            <button
              key={k}
              type="button"
              className={cx(styles.basisBtn, basis === k && styles.basisBtnOn)}
              aria-pressed={basis === k}
              onClick={() => {
                setBasis(k)
                setOpen(null)
              }}
            >
              {name}
            </button>
          ))}
          {trading && data?.basisAvailable && (
            <>
              <span className={styles.basisNote} title={data.basisFacts.join(' ')}>
                {data.basisFacts.join(' ')}
              </span>
              <Link className={styles.basisLink} to="/myinfo">
                내 정보에서 거래로 본 성향 보기 ›
              </Link>
            </>
          )}
        </div>

        {rec.state === 'loading' && <div className={styles.none}>추천을 불러오고 있어요…</div>}
        {rec.state === 'unauthorized' && <div className={styles.none}>로그인이 필요해요. 로그인한 뒤 다시 열어 주세요.</div>}
        {rec.state === 'error' && <div className={styles.none}>추천을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.</div>}

        {rows.length > 0 && (
          <div className={cx(styles.grid, styles.cols0)}>
            <span>종목</span>
            <span className={styles.r}>현재가</span>
            <span>위험</span>
            <span>업종</span>
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
                <span className={styles.sector}>{sectorText(r)}</span>
                <span className={styles.tags}>
                  {tagsOf(r, data?.targetGrade ?? null).map((t) => (
                    <span key={t.key} className={cx(styles.tag, t.on && styles.tagOn)} title={t.hint}>
                      {t.text}
                    </span>
                  ))}
                </span>
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

        {rows.length > 0 && <InvestRecSectors items={rows} />}

        {rec.state === 'ready' && !off && rows.length === 0 && filter !== 'ALL' && <div className={styles.none}>이 분류에는 추천할 상품이 없어요</div>}

        {rec.state === 'ready' && !off && rows.length === 0 && filter === 'ALL' && trading && <div className={styles.none}>내 거래 경향에 맞는 상품이 지금은 없어요</div>}

        {rec.state === 'ready' && !off && rows.length === 0 && filter === 'ALL' && !trading && (
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

        {off && trading && (
          <div className={styles.offBox}>
            <p className={styles.offMsg}>
              {data && data.basisFacts.length > 0
                ? data.basisFacts.join(' ')
                : '거래 기준 추천은 체결된 매수가 ' + data?.minBuyCount + '건 이상일 때 볼 수 있어요. 지금은 ' + data?.tradeBuyCount + '건이에요.'}
            </p>
            {data && !data.profileAvailable && (
              <Link className={styles.offBtn} to={ASSESS_PATH}>
                투자성향 진단하기
              </Link>
            )}
          </div>
        )}

        {off && !trading && (
          <div className={styles.offBox}>
            <p className={styles.offMsg}>{none ? '투자성향을 진단하면 성향에 맞는 범위 안에서 추천을 받을 수 있어요.' : '진단 유효기간이 지나 추천을 보여드릴 수 없어요.'}</p>
            <Link className={styles.offBtn} to={ASSESS_PATH}>
              {none ? '진단하기' : '다시 진단하기'}
            </Link>
          </div>
        )}

        <div className={styles.guide}>{data?.disclaimer ?? '교육용 프로젝트의 자체 분석 결과예요. 수익을 보장하지 않으며, 실제 금융상품 판매·권유 절차를 대체하지 않아요.'}</div>
      </section>

      <div className={styles.side}>
        {tend && (
          <InvestRiskGauge
            className={styles.box}
            allowedMin={tend.survey.available ? tend.survey.allowedMinGrade : null}
            avgBuyGrade={tend.trading.avgBuyGrade}
            minBuyCount={tend.trading.minBuyCount}
            recRange={recRange}
            adjusted={tradeOn && data.targetAdjusted}
            label={label || '내 성향'}
            assessPath={ASSESS_PATH}
          />
        )}
        <section className={styles.box} data-box="rec-basis">
          <div className={styles.head}>
            <h2 className={styles.title}>내 추천 기준</h2>
          </div>
          <div className={styles.prof}>
            <KkiruAvatar profile={profile} size={48} />
            <div className={styles.profText}>
              <b className={styles.profLine}>{trading ? '내 거래 경향' : none ? '미진단' : label + (allow ? ' · ' + allow : '')}</b>
              <span className={styles.assess}>
                {trading ? (data?.basisAvailable ? '체결 매수 ' + data.tradeBuyCount + '건 기준' : '') : survey?.assessedAt ? '진단일 ' + F.dot(survey.assessedAt.slice(0, 10)) : ''}
                {!trading && expired && (
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
            {(trading ? TRADING_RULES : RULES(allow || '내 성향')).map((text, i, all) => (
              <div key={text} className={cx(styles.rule, i < all.length - 1 && styles.ruleLine)}>
                <b className={styles.ruleN}>{i + 1}</b>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className={styles.again}>
            {trading ? (
              <Link className={styles.againLink} to="/myinfo">
                내 정보에서 거래로 본 성향 보기 ›
              </Link>
            ) : (
              <Link className={styles.againLink} to={ASSESS_PATH}>
                투자성향 다시 확인하기 ›
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
