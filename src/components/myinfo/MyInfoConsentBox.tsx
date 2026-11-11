import { useState } from 'react'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import { MyInfoConfirm } from './MyInfoDialogs'
import { MyInfoSwitch } from './MyInfoSwitch'
import row from './MyInfoToggleRow.module.css'
import styles from './MyInfoConsentBox.module.css'

interface Props {
  className?: string
  onToast: (msg: string) => void
}

interface Consent {
  on: boolean
  date: string | null
}

// 수신 동의 — 마케팅은 끌 때 확인 창, 투자 정보 알림은 바로. 동의·철회한 날짜는 업무일(F.today)
// [시연 제외] 서버에 동의 이력 API가 없어 이 화면 안에서만 유지(새로고침하면 초기화, 원본과 같음). 시연에서 쓰지 않는다
export function MyInfoConsentBox({ className, onToast }: Props) {
  const [mkt, setMkt] = useState<Consent>({ on: true, date: null })
  const [inv, setInv] = useState<Consent>({ on: false, date: null })
  const [ask, setAsk] = useState(false)
  const today = () => F.dot(F.today())

  const toggleMkt = () => {
    if (mkt.on) setAsk(true)
    else {
      setMkt({ on: true, date: today() })
      onToast('마케팅 정보 수신에 동의했어요')
    }
  }
  const revokeMkt = () => {
    setAsk(false)
    setMkt({ on: false, date: today() })
    onToast('마케팅 정보 수신 동의를 철회했어요')
  }
  const toggleInv = () => {
    setInv({ on: !inv.on, date: today() })
    onToast(inv.on ? '투자 정보 알림 동의를 철회했어요' : '투자 정보 알림에 동의했어요')
  }

  const mktDesc = (mkt.on ? '동의일 ' : '철회일 ') + (mkt.date || (RD.ACCOUNT.opened ? F.dot(RD.ACCOUNT.opened) : ''))
  const invDesc = inv.date ? (inv.on ? '동의일 ' : '철회일 ') + inv.date : '새 리포트·시장 소식'

  return (
    <Box data-box="consent" className={cx(styles.box, className)} title="수신 동의">
      <div className={styles.body}>
        <div className={styles.item}>
          <span className={row.label}>
            <span id="cs-mkt" className={row.name}>마케팅 정보 수신</span>
            <span className={row.desc}>{mktDesc}</span>
          </span>
          <MyInfoSwitch on={mkt.on} labelId="cs-mkt" onToggle={toggleMkt} />
        </div>
        <div className={styles.item}>
          <span className={row.label}>
            <span id="cs-inv" className={row.name}>투자 정보 알림</span>
            <span className={row.desc}>{invDesc}</span>
          </span>
          <MyInfoSwitch on={inv.on} labelId="cs-inv" onToggle={toggleInv} />
        </div>
      </div>
      {ask && <MyInfoConfirm title="마케팅 정보 수신 동의를 철회할까요?" okLabel="철회" onCancel={() => setAsk(false)} onOk={revokeMkt} />}
    </Box>
  )
}
