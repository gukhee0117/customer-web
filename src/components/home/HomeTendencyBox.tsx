import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../../styles/tokens.css'
import { PROFILE_KEY } from '../../api/stockPackage'
import { Box } from '../common/Box'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { useTendency } from '../invest/useNewPkgData'
import styles from './HomeTendencyBox.module.css'

interface Props {
  className?: string
}

// 홈에 보여 줄 설명 묶음(서버가 사전에 검수한 문장). 거래 활동·업종 등 나머지는 후보 보기 탭에서 본다
const SHOWN = ['SURVEY_PROFILE', 'TRADING_GRADE', 'COMPARISON']

// 말로 조건을 찾아 보는 예시 — 누르면 새 패키지 창이 열리면서 이 말이 조건으로 바뀐다
const ASK_CHIPS = ['배당 ETF만 보여줘', '반도체 테마로 3등급부터 5등급까지', '위험이 낮은 순서로 보여줘']

// 내 투자성향 · 후보 보기 박스 — 설문 성향과 거래에서 본 경향을 사실로 보여 주고, 후보 보기·새 패키지로 이어 준다
// 종목을 추천하거나 순위를 매기지 않는다. 종목은 조건으로 거른 목록에서 고객이 직접 고른다
export function HomeTendencyBox({ className }: Props) {
  const navigate = useNavigate()
  const tendency = useTendency()
  const [text, setText] = useState('')
  const survey = tendency.data?.survey
  const profile = survey?.investorType ? (PROFILE_KEY[survey.investorType] ?? 'neutral') : 'neutral'
  const blocks = (tendency.data?.explanation ?? []).filter((b) => SHOWN.includes(b.metric))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = text.trim().slice(0, 60)
    if (q) navigate('/invest?new=1&ask=' + encodeURIComponent(q))
  }

  return (
    <Box
      shadow
      className={className}
      title="내 투자성향 · 후보 보기"
      actions={
        <span className={styles.headRight}>
          <Link to="/invest#recommend">후보 보기 ›</Link>
        </span>
      }
    >
      <div className={styles.body}>
        <div className={styles.prof}>
          <KkiruAvatar profile={profile} size={48} />
          <div className={styles.profText}>
            <b className={styles.profLine}>{survey?.available ? (survey.label ?? '') + ' · 허용 ' + survey.allowedMinGrade + '등급까지' : '투자성향을 확인할 수 없어요'}</b>
            {survey?.assessedAt && <span className={styles.assess}>진단일 {survey.assessedAt.slice(0, 10).replace(/-/g, '.')}</span>}
          </div>
        </div>

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
        {tendency.state === 'ready' && !survey?.available && (
          <>
            <p className={styles.plain}>투자성향 진단이 없거나 유효기간이 지났어요. 진단하면 성향 범위 안의 후보를 볼 수 있어요.</p>
            <Link className={styles.linkBtn} to="/myinfo#assess">
              진단하기
            </Link>
          </>
        )}
        {tendency.state === 'ready' &&
          blocks.map((b) => (
            <div key={b.metric} className={styles.blk}>
              <b className={styles.blkTitle}>{b.title}</b>
              {b.facts.map((f) => (
                <span key={f} className={styles.fact}>
                  {f}
                </span>
              ))}
            </div>
          ))}

        <div className={styles.askBox}>
          <h3 className={styles.askTitle}>말로 조건 찾기</h3>
          <div className={styles.chips}>
            {ASK_CHIPS.map((label) => (
              <Link key={label} to={'/invest?new=1&ask=' + encodeURIComponent(label)} className={styles.chip}>
                {label}
              </Link>
            ))}
          </div>
          <form className={styles.form} onSubmit={submit}>
            <input className={styles.input} value={text} onChange={(e) => setText(e.target.value.slice(0, 60))} placeholder="찾고 싶은 조건을 말해 보세요" aria-label="찾고 싶은 조건 말하기" />
            <button type="submit" className={styles.send}>
              찾기
            </button>
          </form>
          <div className={styles.note}>끼루는 말을 조건으로 바꾸고 결과를 설명만 해요. 종목을 추천하거나 비중을 제안하지 않아요.</div>
        </div>

        <div className={styles.links}>
          <Link to="/invest?new=1">새 패키지 만들기 ›</Link>
          <Link to="/myinfo#assess">투자성향 다시 확인하기 ›</Link>
        </div>
        <div className={styles.foot}>투자 권유가 아닌 정보 제공이에요 · 교육용 프로젝트의 자체 분석 결과예요. 수익을 보장하지 않으며, 실제 금융상품 판매·권유 절차를 대체하지 않아요.</div>
      </div>
    </Box>
  )
}
