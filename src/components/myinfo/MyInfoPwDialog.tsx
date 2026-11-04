import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { changePassword } from '../../api/profile'
import { PW_MAX, pwOk } from '../login/passwordRule'
import { Modal } from '../common/Modal'
import { cx } from '../common/cx'
import styles from './MyInfoPwDialog.module.css'

interface Props {
  onClose: () => void
  onDone: () => void
}

// 비밀번호 변경 창 — 현재 비밀번호 + 새 비밀번호(가입과 같은 규칙) + 확인이 모두 맞아야 "변경"이 눌림. 현재 비밀번호 확인과 변경은 서버가 한다
// 규칙 안내 색과 빨간 테두리는 새 비밀번호를 한 글자라도 쓴 뒤부터, "서로 달라요"는 확인 칸에 쓴 뒤부터 보임
export function MyInfoPwDialog({ onClose, onDone }: Props) {
  const [cur, setCur] = useState('')
  const [n1, setN1] = useState('')
  const [n2, setN2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // 요청 중에는 닫지 않는다(서버 결과를 못 보고 닫히는 것 방지)
  const close = () => !busy && onClose()
  const ruleOk = pwOk(n1)
  const mis = !!n2 && n2 !== n1
  const ok = !!cur && ruleOk && n2 === n1 && !busy

  const submit = async () => {
    if (!ok) return
    setBusy(true)
    setErr('')
    try {
      await changePassword(cur, n1)
      onDone()
    } catch (e) {
      setErr(apiErrorMessage(e, '비밀번호를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title="비밀번호 변경" onClose={close} okLabel="변경" okDisabled={!ok} onOk={() => void submit()}>
      <label className={styles.field}>
        현재 비밀번호
        <input type="password" className={styles.input} value={cur} onChange={(e) => { setCur(e.target.value); setErr('') }} autoComplete="current-password" />
      </label>
      <label className={styles.field}>
        새 비밀번호
        <input type="password" className={cx(styles.input, n1 && !ruleOk && styles.bad)} value={n1} onChange={(e) => { setN1(e.target.value.slice(0, PW_MAX)); setErr('') }} autoComplete="new-password" />
        <span className={cx(styles.rule, n1 && (ruleOk ? styles.ruleOk : styles.ruleBad))}>8자 이상, 영문·숫자·특수문자를 모두 포함해 주세요(공백·한글 제외)</span>
      </label>
      <label className={styles.field}>
        새 비밀번호 확인
        <input type="password" className={cx(styles.input, mis && styles.bad)} value={n2} onChange={(e) => { setN2(e.target.value.slice(0, PW_MAX)); setErr('') }} autoComplete="new-password" />
        {mis && <span className={styles.mis}>새 비밀번호가 서로 달라요</span>}
      </label>
      {err && <span className={styles.mis} role="alert">{err}</span>}
    </Modal>
  )
}
