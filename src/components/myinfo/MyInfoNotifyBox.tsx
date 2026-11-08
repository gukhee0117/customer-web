import { useEffect, useState } from 'react'
import { fetchNotificationSettings, updateNotificationSettings } from '../../api/notificationSettings'
import type { NotificationSettings } from '../../api/notificationSettings'
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

const DEFAULTS: NotificationSettings = { push: true, sms: false, email: false, settle: true, band: true, reply: true, kiru: true }
const CHANNELS: [Key, string][] = [['push', '앱 푸시'], ['sms', '문자'], ['email', '이메일']]
const KINDS: [Key, string, string][] = [
  ['settle', '정산 완료', '매도 대금이 원화로 확정·정산되면 알려드려요'],
  ['band', '공제율 구간 마감 안내', '12/31 마감 7일 전과 1일 전에 알려드려요'],
  ['reply', '커뮤니티 답글', '내 글에 답글이 달리면 알려드려요'],
  ['kiru', '끼루 답글', '끼루가 내 글에 답하면 알려드려요(커뮤니티)']
]

export function MyInfoNotifyBox({ className, id, onToast, email }: Props) {
  const [nt, setNt] = useState<NotificationSettings>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
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
    setNt(next)
    setSaving(true)
    try {
      setNt(await updateNotificationSettings(next))
      onToast('알림 설정을 저장했어요')
    } catch (error) {
      setNt(previous)
      onToast(apiErrorMessage(error, '알림 설정을 저장하지 못했어요. 다시 시도해 주세요'))
    } finally {
      setSaving(false)
    }
  }

  const disabled = !ready || saving
  return (
    <Box id={id} data-box="notify" className={className} title="알림 설정" head={<span className={styles.saveNote}>{saving ? '저장 중…' : '바꾸면 바로 저장돼요'}</span>}>
      {loadError && <div role="alert">알림 설정을 불러오지 못했어요. <button type="button" onClick={() => setLoadAttempt(n => n + 1)}>다시 시도</button></div>}
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
          {KINDS.map(([key, label, desc]) => (
            <div key={key} className={styles.kind}>
              <span className={row.label}>
                <span id={'nt-' + key} className={row.name}>{label}</span>
                <span className={row.desc}>{desc}</span>
              </span>
              <MyInfoSwitch on={nt[key]} labelId={'nt-' + key} onToggle={() => void toggle(key)} disabled={disabled} />
            </div>
          ))}
        </div>
      </div>
    </Box>
  )
}
