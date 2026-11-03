import '../../styles/tokens.css'
import type { SurveyQuestion } from '../../api/investor'
import { cx } from '../common/cx'
import styles from './SignupQuiz.module.css'

interface SignupQuizProps {
  question: SurveyQuestion
  qi: number // 지금 문항(0부터)
  total: number
  isPicked: (value: string) => boolean
  onPick: (value: string) => void
}

// 4단계 투자성향 진단: 한 화면에 한 문항(문항·보기는 서버가 준다). 복수 선택 문항은 체크 방식
export function SignupQuiz({ question, qi, total, isPicked, onPick }: SignupQuizProps) {
  const role = question.multiple ? 'checkbox' : 'radio'

  return (
    <div className={styles.section}>
      <div className={styles.top}>
        <b className={styles.topic}>{question.category}</b>
        <span className={styles.count}>{qi + 1} / {total}</span>
      </div>
      <h2 className={styles.question}>{question.text}</h2>
      <div className={styles.radios} role={question.multiple ? 'group' : 'radiogroup'} aria-label={question.text}>
        {question.multiple && <span className={styles.multiHint}>해당하는 것을 모두 골라 주세요</span>}
        {question.choices.map((c) => {
          const on = isPicked(c.value)
          return (
            <button key={c.value} type="button" role={role} aria-checked={on} className={cx(styles.radio, on && styles.radioOn)} onClick={() => onPick(c.value)}>
              <span className={cx(styles.dot, on && styles.dotOn)} />
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
