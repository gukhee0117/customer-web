import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { RETURNS_DATA } from '../../data/returns'
import { assetUrl } from '../common/assetUrl'
import { ORDER, PROFILES } from './signupProfile'
import type { ProfileKey } from './signupProfile'
import styles from './SignupQuiz.module.css'

interface SignupResultProps {
  name: string // 가입 때 입력한 이름(비어 있으면 대표 고객 이름)
  profile: ProfileKey
}

// 가입 완료: 성향 결과 + Returns 시작하기
export function SignupResult({ name, profile }: SignupResultProps) {
  const pf = PROFILES[profile]
  // 성향 이름은 데이터(RETURNS_DATA.PROFILES)가 있으면 그 값
  const label = RETURNS_DATA.PROFILES[profile]?.label || pf.label

  return (
    <div className={styles.section}>
      <div className={styles.kkiru}>
        <img className={styles.kkiruImage} src={assetUrl(pf.img)} alt={label + ' 끼루'} />
      </div>
      <div>
        <h2 className={styles.doneTitle}>{name.trim() || RETURNS_DATA.CUSTOMER.name} 님은 {label}이에요</h2>
        <p className={styles.doneDesc}>
          {pf.desc[0]}
          <br />
          {pf.desc[1]}
        </p>
      </div>
      <div className={styles.bars}>
        {ORDER.map((k) => {
          const on = k === profile
          return (
            <div key={k} className={styles.barCol}>
              <span className={styles.bar} style={on ? { background: PROFILES[k].color } : undefined} />
              <span className={on ? styles.barLabelOn : styles.barLabel}>{PROFILES[k].label}</span>
            </div>
          )
        })}
      </div>
      <Link className={styles.start} to="/home#new">
        Returns 시작하기
      </Link>
    </div>
  )
}
