import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { useAuth } from '../../contexts/authState'
import { MyInfoConfirm } from './MyInfoDialogs'
import styles from './MyInfoSecurityBox.module.css'

interface Props {
  className?: string
  onToast: (msg: string) => void
  onOpenPw: () => void
}

// 보안 — 비밀번호 변경 창 열기, 2단계 인증(준비 중), 자동 로그아웃 안내, 로그아웃(확인 창 → 세션 지우고 랜딩으로)
export function MyInfoSecurityBox({ className, onToast, onOpenPw }: Props) {
  const navigate = useNavigate()
  const { logout: authLogout } = useAuth()
  const [ask, setAsk] = useState(false)
  const lastChanged = RD.ACCOUNT.opened ? F.dot(RD.ACCOUNT.opened) : ''

  const logout = () => {
    void authLogout().then(() => navigate('/'))
  }

  return (
    <Box data-box="security" className={cx(styles.box, className)} title="보안">
      <button type="button" className={styles.row} onClick={onOpenPw}>
        <span className={styles.text}>
          <span className={styles.name}>비밀번호 변경</span>
          <span className={styles.desc}>마지막 변경 {lastChanged}</span>
        </span>
        <span className={styles.arrow}>›</span>
      </button>
      <button type="button" className={styles.row} onClick={() => onToast('준비 중이에요')}>
        <span className={styles.text}>
          <span className={styles.name}>2단계 인증</span>
          <span className={styles.desc}>휴대폰 인증 사용 중</span>
        </span>
        <span className={styles.arrow}>›</span>
      </button>
      <div className={cx(styles.row, styles.plain)}>
        <span className={styles.text}>
          <span className={styles.name}>자동 로그아웃</span>
        </span>
      </div>
      <button type="button" className={cx(styles.row, styles.last)} onClick={() => setAsk(true)}>
        <span className={styles.name}>로그아웃</span>
        <span className={styles.arrow}>›</span>
      </button>
      {ask && <MyInfoConfirm title="로그아웃할까요?" okLabel="로그아웃" onCancel={() => setAsk(false)} onOk={logout} />}
    </Box>
  )
}
