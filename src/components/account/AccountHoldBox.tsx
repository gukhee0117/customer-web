import { useState } from 'react'
import '../../styles/tokens.css'
import { Box } from '../common/Box'
import type { WithdrawalAvailability } from '../../api/withdrawalAvailability'
import { F } from '../../lib/calc'
import { HOLD_TIP } from './accountTaxData'
import type { ServerState } from './useServerData'
import styles from './AccountHoldBox.module.css'

interface AccountHoldBoxProps {
  className?: string
  onHistory: () => void // 인출 내역 탭 이동은 다음 단계에서 연결
  avail: ServerState<WithdrawalAvailability> // 서버 인출 가능 금액
  onRetry: () => void
}

// 원금을 가장 먼저 풀 수 있는 납입건(아직 1년이 안 지난 것 중 가장 이른 만기)을 기준으로 인출 가능일·진행 막대를 그린다
// kind: holding(만기 전 원금 있음) / matured(모두 1년 경과) / empty(원화 확정된 매도 없음)
function holdView(a: WithdrawalAvailability) {
  const biz = F.today()
  const paid = a.immaturePrincipalAmount
  const now = a.withdrawableWithoutPenalty
  const left = a.leftAmounts.filter((x) => !x.matured).sort((x, y) => x.maturesAt.localeCompare(y.maturesAt))[0]
  if (!left) return { kind: a.leftAmounts.length ? ('matured' as const) : ('empty' as const), wdDate: '', wdD: 0, soldConf: '', pct: 100, paid, now }
  const from = left.finalAt.slice(0, 10)
  const to = left.maturesAt.slice(0, 10)
  const pct = Math.max(0, Math.min(100, (F.days(from, biz) / F.days(from, to)) * 100))
  return { kind: 'holding' as const, wdDate: F.dot(to), wdD: Math.max(0, F.days(biz, to)), soldConf: F.dot(from), pct, paid, now }
}

// 원금 유지 박스(data-box="hold") — 서버 인출 가능 금액 기준. 인출 가능일·D-day·진행 막대·유지 중인 원금·지금 인출 가능 금액
export function AccountHoldBox({ className, onHistory, avail, onRetry }: AccountHoldBoxProps) {
  const [tipOn, setTipOn] = useState(false)
  const h = avail.status === 'live' ? holdView(avail.data) : null

  return (
    <Box
      data-box="hold"
      className={className}
      title="원금 유지"
      head={
        <span
          className={styles.tip}
          role="img"
          aria-label={HOLD_TIP}
          tabIndex={0}
          onMouseEnter={() => setTipOn(true)}
          onMouseLeave={() => setTipOn(false)}
          onFocus={() => setTipOn(true)}
          onBlur={() => setTipOn(false)}
        >
          i
          {tipOn && (
            <span role="tooltip" className={styles.tipText}>
              {HOLD_TIP}
            </span>
          )}
        </span>
      }
      actions={
        <button type="button" className={styles.link} onClick={onHistory}>
          인출 내역 ›
        </button>
      }
    >
      <div className={styles.body}>
        <div className={styles.dateRow}>
          <span className={styles.dateKey}>인출 가능일</span>
          <b className={styles.date}>
            {!h ? (avail.status === 'loading' ? '…' : '-') : h.kind === 'holding' ? <>{h.wdDate} (<span className={styles.dday}>D-{h.wdD}</span>)</> : h.kind === 'matured' ? '인출 가능' : '-'}
          </b>
        </div>
        <div className={styles.confirm}>
          {avail.status === 'loading' && '불러오는 중이에요'}
          {avail.status === 'none' && '인출 정보가 없어요'}
          {avail.status === 'error' && (
            <>
              불러오지 못했어요{' '}
              <button type="button" className={styles.link} onClick={onRetry}>다시 시도</button>
            </>
          )}
          {h?.kind === 'holding' && '원화 확정일 ' + h.soldConf + '(매도 체결 후 2영업일)부터 1년'}
          {h?.kind === 'matured' && '원화 확정 후 1년이 지나 원금을 인출할 수 있어요'}
          {h?.kind === 'empty' && '원화 확정된 매도가 아직 없어요'}
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: (h?.pct ?? 0) + '%' }} />
        </div>
        <div className={styles.row}>
          <span className={styles.key}>유지 중인 원금</span>
          <span className={styles.val}>{h ? '₩' + F.won(h.paid) : '-'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.keyClip}>지금 인출할 수 있는 금액</span>
          <span className={styles.val}>{h ? '₩' + F.won(h.now) : '-'}</span>
        </div>
      </div>
    </Box>
  )
}
