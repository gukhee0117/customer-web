import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { parseCondition, PROFILE_KEY } from '../../api/stockPackage'
import type { CandidateItem, ParseResult, Tendency } from '../../api/stockPackage'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { EMPTY_FILTER, filterFromParsed, requestOf } from './candidateFilter'
import type { FilterState } from './candidateFilter'
import { InvestCandidateFilters } from './InvestCandidateFilters'
import { InvestCandidateList } from './InvestCandidateList'
import { failState, useCandidateList, useDebounced, useThemes } from './useNewPkgData'
import type { LoadState } from './useNewPkgData'
import styles from './InvestNewPkgStart.module.css'

const ASSESS_PATH = '/myinfo#assess'

type ParseState = { phase: 'idle' } | { phase: 'loading'; q: string } | { phase: 'done'; q: string; result: ParseResult } | { phase: 'error'; q: string; why: LoadState }

interface Props {
  tendency: { state: LoadState; data: Tendency | null }
  addedCodes: string[] // 이미 담은 종목
  ask: string // 주소(?ask=)로 들어온 말
  noCand: boolean // 시연 설정 '후보 없음'
  onPick: (c: CandidateItem) => void
}

function Bubble({ profile, lines }: { profile: string; lines: string[] }) {
  return (
    <div className={styles.kkRow}>
      <KkiruAvatar profile={profile} size={24} />
      <span className={styles.kkBubble}>
        {lines.map((l) => (
          <span key={l} className={styles.kkLine}>
            {l}
          </span>
        ))}
      </span>
    </div>
  )
}

// "후보 찾기" 단계 — 성향 비교 · 말로 조건 찾기 · 직접 조건 고르기 · 후보 목록
// 끼루는 말을 조건으로 바꾸고 결과를 설명만 한다. 종목·비중을 제안하거나 순위를 매기지 않는다
export function InvestNewPkgStart({ tendency, addedCodes, ask, noCand, onPick }: Props) {
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER)
  const [text, setText] = useState(ask)
  const [parse, setParse] = useState<ParseState>({ phase: 'idle' })
  const themes = useThemes()
  const askRan = useRef(false)

  const survey = tendency.data?.survey
  const profile = survey?.investorType ? (PROFILE_KEY[survey.investorType] ?? 'neutral') : 'neutral'

  // 말을 조건으로 바꾼다. 바뀐 조건은 아래 직접 조건에 그대로 채워지고 후보가 다시 걸러진다
  const run = (raw: string) => {
    const q = raw.trim()
    if (!q) return
    setParse({ phase: 'loading', q })
    parseCondition(q).then(
      (result) => {
        if (result.status === 'PARSED' && result.filter) {
          const p = result.filter
          setFilter((f) => filterFromParsed(f, p))
        }
        setParse({ phase: 'done', q, result })
      },
      (err: unknown) => setParse({ phase: 'error', q, why: failState(err) })
    )
  }

  // 주소로 들어온 말은 한 번만 바꿔 본다
  useEffect(() => {
    if (ask && !askRan.current) {
      askRan.current = true
      run(ask)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    run(text)
  }

  const keyword = useDebounced(filter.keyword.trim(), 300)
  const list = useCandidateList(requestOf(filter, keyword), true)

  return (
    <>
      <div className={styles.label}>어떤 패키지를 만들까요</div>

      {/* 내 투자성향 · 거래에서 본 경향 */}
      <div className={styles.box}>
        <div className={styles.boxTitle}>내 투자성향 살펴보기</div>
        {tendency.state === 'loading' && <p className={styles.plain}>불러오는 중이에요…</p>}
        {tendency.state === 'unauthorized' && (
          <>
            <p className={styles.plain}>로그인하면 내 투자성향과 후보를 볼 수 있어요.</p>
            <Link className={styles.linkBtn} to="/login">
              로그인하기
            </Link>
          </>
        )}
        {tendency.state === 'error' && <p className={styles.plain}>투자성향을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>}
        {tendency.state === 'ready' && tendency.data && (
          <>
            {!survey?.available && (
              <>
                <p className={styles.plain}>투자성향 진단이 없거나 유효기간이 지났어요. 진단 후에 종목을 담을 수 있어요.</p>
                <Link className={styles.linkBtn} to={ASSESS_PATH}>
                  진단하기
                </Link>
              </>
            )}
            {tendency.data.explanation.map((b) => (
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
          </>
        )}
      </div>

      {/* 말로 조건 찾기 */}
      <div className={styles.box}>
        <div className={styles.boxTitle}>말로 조건 찾기</div>
        <form className={styles.kkForm} onSubmit={onSubmit}>
          <input className={styles.kkInput} value={text} onChange={(e) => setText(e.target.value.slice(0, 60))} placeholder="예: 배당 ETF만 보여줘, 반도체 테마로 3등급부터 5등급까지" aria-label="끼루에게 조건 말하기" />
          <button type="submit" className={styles.send} disabled={parse.phase === 'loading'}>
            {parse.phase === 'loading' ? '바꾸는 중…' : '조건으로 바꾸기'}
          </button>
        </form>
        {parse.phase !== 'idle' && (
          <div className={styles.mineRow}>
            <span className={styles.mine}>{parse.q}</span>
          </div>
        )}
        {parse.phase === 'done' && <Bubble profile={profile} lines={parse.result.messages} />}
        {parse.phase === 'error' && <Bubble profile={profile} lines={[parse.why === 'unauthorized' ? '로그인이 필요해요.' : '지금은 말로 조건을 찾을 수 없어요. 아래에서 직접 골라 볼 수 있어요.']} />}
        <div className={styles.note}>끼루는 말을 조건으로 바꾸고 결과를 설명만 해요. 종목을 추천하거나 비중을 제안하지 않아요.</div>
      </div>

      <InvestCandidateFilters filter={filter} onChange={setFilter} themes={themes} canIncludeOut={!!survey?.available} />
      <InvestCandidateList state={list.state} data={list.data} noCand={noCand} addedCodes={addedCodes} actionLabel="담기" onPick={onPick} onShowOut={() => setFilter((f) => ({ ...f, includeOut: true }))} />
    </>
  )
}
