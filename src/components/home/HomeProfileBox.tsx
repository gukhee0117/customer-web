import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { profileKeyOf } from '../../api/investor'
import { accountViewState, maskAccountNo } from '../../api/profile'
import type { Profile } from '../../api/profile'
import { RETURNS_DATA as RD, demo } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { assetUrl } from '../common/assetUrl'
import type { SellLimitState } from '../account/useSellLimit'
import { Toast } from '../common/Toast'
import { useToast } from '../common/useToast'
import styles from './HomeProfileBox.module.css'

// 프로필·계좌 박스. 이름·성향·진단일·유효기간·계좌는 서버 프로필 값(받기 전·실패하면 이름·진단일 '-', 계좌는 시연 설정의 목업). 진단 상태(미진단·만료)는 demo().assess를 따른다
interface Props {
  className?: string
  prof: Profile | null
  limit: SellLimitState // 서버 매도 한도(한도 영역만 로딩·실패 처리)
  onRetryLimit: () => void
}

export function HomeProfileBox({ className, prof, limit, onRetryLimit }: Props) {
  const name = prof?.name
  const account = prof?.account
  const { message: toast, showToast } = useToast()
  const biz = F.today()
  const profile = RD.PROFILES[prof?.assessed ? profileKeyOf(prof.investorType) : RD.CUSTOMER.profile]
  const acct = account === undefined ? RD.ACCOUNT_STATE : account === null ? 'none' : accountViewState(account.status)
  const accountNo = account?.accountNo
  const acctNo = account ? maskAccountNo(accountNo ?? null) : RD.ACCOUNT.no
  const assess = demo().assess || 'ok'
  const assessedDate = prof?.assessedAt?.slice(0, 10)
  const pfLeft = prof?.expiresAt ? F.days(biz, F.addDays(prof.expiresAt.slice(0, 10), -1)) : 999 // 진단 유효기간 남은 날(만료일 전날까지 유효)
  const usedPct = limit.status === 'live' && limit.data.limitAmount > 0 ? (limit.data.usedAmount / limit.data.limitAmount) * 100 + '%' : '0%'

  const copyAcct = () => {
    try {
      navigator.clipboard.writeText(account ? accountNo ?? '' : RD.ACCOUNT.no)
    } catch {
      // 클립보드를 못 쓰는 환경에서도 안내는 보여 준다(원본과 동일)
    }
    showToast('계좌번호를 복사했어요')
  }

  return (
    <Box shadow className={className}>
      <div className={styles.top}>
        <div className={styles.figure}>
          <img src={assetUrl(profile.img ?? '')} alt={profile.label + ' 끼루'} />
        </div>
        <div className={styles.info}>
          <div className={styles.name}>{name ?? '-'} 님</div>
          <div className={styles.profName}>
            {assess === 'none' ? '미진단' : profile.label}
            {assess === 'expired' && <span className={styles.expired}>진단 만료</span>}
          </div>
          {assess !== 'none' ? (
            <div className={styles.assessLine}>
              진단일 {assessedDate ? F.dot(assessedDate) : '-'}
              {pfLeft >= 0 && pfLeft <= 90 && (
                <>
                  {' '}
                  <span className={styles.soon}>유효기간 D-{pfLeft}</span>
                </>
              )}
              {' · '}
              <Link to="/myinfo#assess">다시 진단 ›</Link>
            </div>
          ) : (
            <div className={styles.assessNone}>
              <Link to="/myinfo#assess">진단하기 ›</Link>
            </div>
          )}
        </div>
        <div className={styles.side}>
          <Link to="/myinfo" className={styles.edit}>수정</Link>
          {acct === 'opened' && <Link to="/account" className={styles.myAcct}>내 계좌 ›</Link>}
        </div>
      </div>

      {acct === 'opened' && (
        <div className={styles.acct}>
          <div className={styles.acctRow}>
            <b className={styles.acctName}>{RD.ACCOUNT.name}</b>
            <span className={styles.acctNo}>{acctNo}</span>
            <button type="button" className={styles.copy} onClick={copyAcct} aria-label="계좌번호 복사">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
          </div>
          <div className={styles.limit} title="전 증권사 합산 기준">
            <div className={styles.limitRow}>
              <span className={styles.limitLabel}>사용한 매도 한도</span>
              {limit.status === 'live' && (
                <span>
                  <span className={styles.limitLabel}>{F.man(limit.data.limitAmount)} 원 중</span> <b className={styles.limitRemain}>{F.man(limit.data.usedAmount)} 원 사용</b>
                </span>
              )}
              {limit.status === 'loading' && <span className={styles.limitLabel}>-</span>}
              {limit.status === 'none' && <span className={styles.limitLabel}>한도 없음</span>}
              {limit.status === 'error' && (
                <span className={styles.limitLabel}>
                  불러오지 못했어요{' '}
                  <button type="button" className={styles.limitRetry} onClick={onRetryLimit}>다시 시도</button>
                </span>
              )}
            </div>
            <div className={styles.bar}>
              <div className={styles.barFill} style={{ width: usedPct }} />
            </div>
          </div>
        </div>
      )}

      {acct === 'none' && (
        <div className={styles.stateNone}>
          <div className={styles.stateTitle}>아직 RIA 계좌가 없어요</div>
          <Link to="/account#open" className={styles.open}>RIA 계좌 개설하기</Link>
        </div>
      )}

      {acct === 'reviewing' && (
        <div className={styles.stateNote}>
          <div className={styles.stateTitle}>계좌 개설 심사 중이에요 · 신청 {F.short(account?.appliedAt.slice(0, 10) ?? RD.ACCOUNT_STATES.reviewing.appliedAt ?? '')} · 보통 1~2영업일</div>
          <div className={styles.linkRow}>
            <Link to="/account">신청 내용 보기 ›</Link>
          </div>
        </div>
      )}

      {acct === 'rejected' && (
        <div className={styles.stateNote}>
          <div className={styles.stateTitleRed}>계좌 개설이 반려됐어요</div>
          <div className={styles.reason}>{RD.ACCOUNT_STATES.rejected.reason}</div>
          <div className={styles.linkRow}>
            <Link to="/account#open">한도 줄여서 다시 신청 ›</Link>
          </div>
        </div>
      )}
      <Toast message={toast} />
    </Box>
  )
}
