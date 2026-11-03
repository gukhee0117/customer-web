import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { apiErrorMessage } from '../../api/client'
import { profileKeyOf, submitAssessment } from '../../api/investor'
import type { AssessmentResult } from '../../api/investor'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { assetUrl } from '../common/assetUrl'
import { useInvestorSurvey } from '../assessment/useInvestorSurvey'
import { cx } from '../common/cx'
import { ASSESS_BANDS, ASSESS_DESC } from './myinfoAssess'
import styles from './MyInfoAssessDialog.module.css'

interface Props {
  onClose: () => void
  onSave: (score: number, profile: string) => void
}

// 투자성향 다시 진단 창: 서버 문항(복수 선택 포함) → 마지막 문항에서 서버에 제출해 결과(총점·성향)를 보여 준다
// 창을 열 때마다 처음부터. 중간에 닫아도 확인 없이 닫힘(어두운 막·Esc·X). 제출 결과는 서버에 저장되며, 제출하면 바로 화면에 반영하고, 결과 단계의 "확인"은 창만 닫는다
// TODO: 진단 이력(진단 날짜·점수 목록)은 아직 localStorage — 서버에는 현재 성향 조회만 있다
export function MyInfoAssessDialog({ onClose, onSave }: Props) {
  const survey = useInvestorSurvey()
  const Q = survey.questions ?? []
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')

  // 창을 열 때마다 문항을 새로 받는다
  const { load, reset } = survey
  useEffect(() => {
    reset()
    void load()
  }, [load, reset])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const loaded = !!survey.questions
  const isRes = result !== null
  const score = result?.totalScore ?? 0
  const rk = result ? profileKeyOf(result.investorType) : 'neutral'
  const rp = RD.PROFILES[rk]
  const q = loaded && !isRes ? Q[step] : undefined
  const answered = q ? survey.isAnswered(q) : false

  const submit = async () => {
    setSubmitting(true)
    setSubmitErr('')
    try {
      const res = await submitAssessment(survey.answers)
      setResult(res)
      onSave(res.totalScore, profileKeyOf(res.investorType)) // 제출은 곧 서버 저장 — 결과 화면에서 어떻게 닫아도 화면에 반영돼 있게
    } catch (e) {
      setSubmitErr(apiErrorMessage(e, '설문을 제출하지 못했어요. 잠시 뒤 다시 시도해 주세요'))
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className={styles.backdrop} onClick={onBackdrop}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="투자성향 다시 진단">
        <div className={styles.head}>
          <h2>투자성향 다시 진단</h2>
          <span className={styles.step}>{isRes ? '결과' : loaded ? step + 1 + ' / ' + Q.length : ''}</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          {!loaded && !isRes && (
            <div className={styles.q}>
              <div className={styles.question}>{survey.error || '설문을 불러오는 중이에요'}</div>
              {survey.error && <button type="button" className={styles.back} onClick={() => void survey.load()}>다시 불러오기</button>}
            </div>
          )}
          {q && (
            <div className={styles.q}>
              <div className={styles.topic}>{q.category}</div>
              <div className={styles.question}>{q.text}</div>
              <div className={styles.opts} role={q.multiple ? 'group' : 'radiogroup'} aria-label={q.category}>
                {q.choices.map((c) => {
                  const on = survey.isPicked(q, c.value)
                  return (
                    <button key={c.value} type="button" role={q.multiple ? 'checkbox' : 'radio'} aria-checked={on} className={cx(styles.opt, on && styles.optOn)} onClick={() => survey.pick(q, c.value)}>
                      <span className={styles.ring} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
              {q.multiple && <div className={styles.basis}>해당하는 것을 모두 골라 주세요</div>}
              {submitErr && <div className={styles.basis} role="alert">{submitErr}</div>}
            </div>
          )}
          {isRes && (
            <>
              <div className={styles.res}>
                <img src={assetUrl(rp.img ?? '')} alt={rp.label + ' 끼루'} />
                <div className={styles.resInfo}>
                  <b className={styles.resLabel}>{rp.label}</b>
                  <div className={styles.line}>
                    점수 <b>{score}점</b>
                  </div>
                  <div className={styles.line}>
                    추천받을 수 있는 상품 <b>{F.allowedLabel(rk)}</b>
                  </div>
                  <div className={cx(styles.line, styles.desc)}>{ASSESS_DESC[rk]}</div>
                </div>
              </div>
              <div className={styles.bands}>
                {ASSESS_BANDS.map(([range, k]) => (
                  <div key={k} className={cx(styles.band, k === rk && styles.bandOn)}>
                    <span className={styles.range}>{range}</span>
                    <span>{RD.PROFILES[k].label}</span>
                  </div>
                ))}
              </div>
              <div className={styles.basis}>총점 구간 기준: 서버 투자성향 분류(팀 합의)</div>
            </>
          )}
        </div>
        <div className={styles.foot}>
          <button
            type="button"
            className={styles.back}
            onClick={() => {
              if (isRes) {
                setStep(0)
                setResult(null)
                survey.reset()
              } else if (step === 0) onClose()
              else {
                setSubmitErr('')
                setStep(step - 1)
              }
            }}
          >
            {isRes ? '다시 하기' : step === 0 ? '취소' : '이전'}
          </button>
          <button
            type="button"
            className={cx(styles.next, !isRes && (!answered || submitting) && styles.nextOff)}
            disabled={!isRes && (!answered || submitting)}
            onClick={() => {
              if (isRes) onClose()
              else if (answered) {
                if (step === Q.length - 1) void submit()
                else {
                  setSubmitErr('')
                  setStep(step + 1)
                }
              }
            }}
          >
            {isRes ? '확인' : step === Q.length - 1 ? '결과 보기' : '다음'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
