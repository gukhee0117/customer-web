import { useEffect, useState } from 'react'
import { fetchNotificationSettings, updateNotificationSettings, fetchEmailVerification, sendEmailVerification, confirmEmailVerification } from '../../api/notificationSettings'
import type { NotificationSettings, EmailChallenge } from '../../api/notificationSettings'
import { apiErrorMessage } from '../../api/client'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { MyInfoSwitch } from './MyInfoSwitch'
import row from './MyInfoToggleRow.module.css'
import styles from './MyInfoNotifyBox.module.css'

interface Props {
  className?: string
  id?: string
  onToast: (msg: string) => void
  email: string | null | undefined // undefined: 프로필 조회 전 또는 조회 실패
}

type Key = keyof NotificationSettings

const DEFAULTS: NotificationSettings = { push: true, sms: false, email: true, settle: true, band: true }
const CHANNELS: [Key, string][] = [['push', '앱 푸시'], ['sms', '문자'], ['email', '이메일']]
const KINDS: [Key, string][] = [
  ['settle', '정산 완료'],
  ['band', '공제율 구간 마감 안내']
]

export function MyInfoNotifyBox({ className, id, onToast, email }: Props) {
  const [nt, setNt] = useState<NotificationSettings>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [challenge, setChallenge] = useState<EmailChallenge | null>(null)
  const [pendingSettings, setPendingSettings] = useState<NotificationSettings | null>(null)
  const [code, setCode] = useState('')
  const [now, setNow] = useState(0)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
  useEffect(() => {
    let active = true
    setChallenge(null); setCode(''); setPendingSettings(null); setEmailVerified(null)
    if (email?.trim()) void fetchEmailVerification().then(status => { if (active) setEmailVerified(status.verified) }).catch(() => {})
    return () => { active = false }
  }, [email])
  useEffect(() => {
    if (!challenge) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [challenge])
  const allOff = !nt.push && !nt.sms && !nt.email

  useEffect(() => {
    let active = true
    setReady(false)
    setLoadError(false)
    fetchNotificationSettings()
      .then((settings) => { if (active) { setNt(settings); setReady(true) } })
      .catch(() => { if (active) { setLoadError(true); onToast('알림 설정을 불러오지 못했어요. 다시 시도해 주세요') } })
    return () => { active = false }
  }, [onToast, loadAttempt])

  const toggle = async (key: Key) => {
    if (!ready || saving) return
    if (key === 'email' && !nt.email) {
      if (email === undefined) {
        onToast('이메일 등록 여부를 확인하지 못했어요. 기본 정보를 다시 불러와 주세요.')
        return
      }
      if (!email?.trim()) {
        onToast('등록된 이메일이 없습니다. 기본 정보에서 이메일을 등록해 주세요.')
        return
      }
    }
    const previous = nt
    const next = { ...nt, [key]: !nt[key] }
    setSaving(true)
    try {
      if (next.email && !(await fetchEmailVerification()).verified) {
        setChallenge(await sendEmailVerification()); setNow(Date.now()); setCode(''); setPendingSettings(next)
        onToast('이메일로 받은 인증번호를 입력해 주세요. 확인 후 설정을 저장해요.')
        return
      }
      setNt(next)
      setNt(await updateNotificationSettings(next))
      onToast('알림 설정을 저장했어요')
    } catch (error) {
      setNt(previous)
      onToast(apiErrorMessage(error, '알림 설정을 저장하지 못했어요. 다시 시도해 주세요'))
    } finally {
      setSaving(false)
    }
  }

  const confirm = async () => {
    if (saving || code.length !== 6) return
    setSaving(true)
    try {
      const next = pendingSettings ?? { ...nt, email: true }
      await confirmEmailVerification(code)
      setEmailVerified(true)
      setChallenge(null); setPendingSettings(null); setCode('')
      setNt(await updateNotificationSettings(next))
      onToast('이메일을 확인하고 알림 설정을 저장했어요')
    } catch (error) { onToast(apiErrorMessage(error, '인증번호를 확인하지 못했어요')) }
    finally { setSaving(false) }
  }
  const resend = async () => {
    if (saving) return
    setSaving(true)
    try { setChallenge(await sendEmailVerification()); setNow(Date.now()); setCode(''); onToast('새 인증번호를 보냈어요') }
    catch (error) { onToast(apiErrorMessage(error, '인증번호를 보내지 못했어요')) }
    finally { setSaving(false) }
  }
  const remaining = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000)) : 0
  const cooldown = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000)) : 0

  const disabled = !ready || saving || challenge !== null
  return (
    <Box id={id} data-box="notify" className={className} title="알림 설정" head={saving ? <span className={styles.saveNote}>저장 중…</span> : undefined}>
      {loadError && <div role="alert">알림 설정을 불러오지 못했어요. <button type="button" onClick={() => setLoadAttempt(n => n + 1)}>다시 시도</button></div>}
      {nt.email && emailVerified !== true && !challenge && <div role="status">
        이메일 주소 확인이 필요해요. 확인은 30일 동안 유지되며 주소를 바꾸면 다시 확인해 주세요.
        <button type="button" disabled={saving || !ready || !email?.trim()} onClick={() => { setPendingSettings(nt); void resend() }}>이메일 주소 확인</button>
      </div>}
      {challenge && <div className={styles.verification}>
        <p>{challenge.maskedEmail} 주소로 보낸 인증번호를 입력해 주세요.</p>
        <label>인증번호 6자리<input aria-label="이메일 알림 인증번호" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
          disabled={saving || remaining === 0} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
        <span role="status">{remaining > 0 ? `${remaining}초 남았어요` : '인증번호가 만료됐어요. 다시 발송해 주세요.'}</span>
        <button type="button" disabled={saving || remaining === 0 || code.length !== 6} onClick={() => { void confirm() }}>인증하고 저장</button>
        <button type="button" disabled={saving || cooldown > 0} onClick={() => { void resend() }}>{cooldown > 0 ? `재발송 (${cooldown}초 후)` : '인증번호 재발송'}</button>
        <button type="button" disabled={saving} onClick={() => { setChallenge(null); setPendingSettings(null) }}>취소</button>
      </div>}
      <div className={styles.cols}>
        <div className={styles.col}>
          <div className={styles.colHead}>받는 방법</div>
          {CHANNELS.map(([key, label]) => (
            <div key={key} className={styles.channel}>
              <span id={'nt-' + key} className={styles.channelName}>{label}</span>
              <MyInfoSwitch on={nt[key]} labelId={'nt-' + key} onToggle={() => void toggle(key)} disabled={disabled} />
            </div>
          ))}
          {allOff && <div className={styles.warn}>받는 방법이 모두 꺼져 있어 알림을 받을 수 없어요</div>}
        </div>
        <div className={cx(styles.col, styles.kinds)}>
          <div className={styles.colHead}>알림 종류</div>
          {KINDS.map(([key, label]) => (
            <div key={key} className={styles.kind}>
              <span className={row.label}>
                <span id={'nt-' + key} className={row.name}>{label}</span>
              </span>
              <MyInfoSwitch on={nt[key]} labelId={'nt-' + key} onToggle={() => void toggle(key)} disabled={disabled} />
            </div>
          ))}
        </div>
      </div>
    </Box>
  )
}
