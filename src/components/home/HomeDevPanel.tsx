import { useState } from 'react'
import '../../styles/tokens.css'
import { RETURNS_DATA as RD, demo } from '../../data/returns'
import type { DemoSettings } from '../../data/returns'
import { cx } from '../common/cx'
import { DEV_ACCT, DEV_ASSESS, DEV_BENEFIT, DEV_TRADE } from './homeDevData'
import styles from './HomeDevPanel.module.css'

interface HomeDevPanelProps {
  onChange: (patch: Partial<DemoSettings>) => void // 시연 설정이 바뀜 → 홈 박스들이 새로 그려짐
}

// 왼쪽 아래 "시연 설정" — 성향·진행 중 매도 예시·계좌 상태·성향 상태·혜택 상태
export function HomeDevPanel({ onChange }: HomeDevPanelProps) {
  const [open, setOpen] = useState(false)
  const dm = demo()

  const seg = (label: string, on: boolean, go: () => void) => (
    <button key={label} type="button" className={cx(styles.seg, on && styles.segOn)} onClick={go}>
      {label}
    </button>
  )

  return (
    <div className={styles.dev}>
      {open && (
        <div className={styles.panel}>
          <div>
            <div className={styles.label}>성향</div>
            <div className={styles.row}>
              {Object.keys(RD.PROFILES).filter((k) => k !== 'private').map((k) =>
                seg(RD.PROFILES[k].label, RD.CUSTOMER.profile === k, () => onChange({ profile: k as DemoSettings['profile'] }))
              )}
            </div>
          </div>
          <div>
            <div className={styles.label}>진행 중 매도 예시</div>
            <div className={styles.rowNoWrap}>{DEV_TRADE.map(([v, label]) => seg(label, dm.trade === v, () => onChange({ trade: v })))}</div>
          </div>
          <div>
            <div className={styles.label}>계좌 상태</div>
            <div className={styles.row}>{DEV_ACCT.map(([v, label]) => seg(label, dm.account === v, () => onChange({ account: v })))}</div>
          </div>
          <div>
            <div className={styles.label}>성향 상태</div>
            <div className={styles.row}>{DEV_ASSESS.map(([v, label]) => seg(label, (dm.assess || 'ok') === v, () => onChange({ assess: v })))}</div>
          </div>
          <div>
            <div className={styles.label}>혜택 상태</div>
            <div className={styles.row}>{DEV_BENEFIT.map((v) => seg(v, dm.benefit === v, () => onChange({ benefit: v })))}</div>
          </div>
        </div>
      )}
      <button type="button" className={styles.toggle} onClick={() => setOpen((o) => !o)}>시연 설정</button>
    </div>
  )
}
